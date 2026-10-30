#!/usr/bin/env node
/**
 * Local Supabase-compatible PostgreSQL 16 (`@electric-sql/pglite`) + PostgREST gateway
 * on port 54321. Executes all SQL migrations in `supabase/migrations/*.sql` in order
 * and `supabase/seed.sql` against real PostgreSQL 16, and exposes `/rest/v1/<table>`
 * and `/rest/v1/rpc/ingest_indexer_batch`.
 */

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.SUPABASE_LOCAL_PORT ?? 54321);
const ALLOWED_TABLES = new Set([
  "profiles",
  "projects",
  "issuances",
  "claims",
  "nullifiers",
  "sync_log",
]);

async function applyMigrationsAndSeed(db) {
  const migrationsDir = path.join(__dirname, "migrations");
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await db.exec(sql);
  }

  const seedPath = path.join(__dirname, "seed.sql");
  if (fs.existsSync(seedPath)) {
    const seedSql = fs.readFileSync(seedPath, "utf8");
    await db.exec(seedSql);
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function main() {
  const db = new PGlite();
  await applyMigrationsAndSeed(db);

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

      if (req.method === "POST" && url.pathname === "/rest/v1/reset") {
        await db.exec(`
          truncate table public.claims, public.issuances, public.nullifiers, public.projects, public.profiles, public.sync_log restart identity cascade;
        `);
        await applyMigrationsAndSeed(db);
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      if (
        req.method === "POST" &&
        url.pathname === "/rest/v1/rpc/ingest_indexer_batch"
      ) {
        const rawBody = await readRequestBody(req);
        const body = rawBody ? JSON.parse(rawBody) : {};
        const queryResult = await db.query(
          `select public.ingest_indexer_batch(
            $1::int,
            $2::bigint,
            $3::jsonb,
            $4::jsonb,
            $5::jsonb,
            $6::jsonb
          ) as result;`,
          [
            Number(body.p_chain_id ?? 84532),
            Number(body.p_last_block ?? 0),
            JSON.stringify(body.p_projects ?? []),
            JSON.stringify(body.p_issuances ?? []),
            JSON.stringify(body.p_claims ?? []),
            JSON.stringify(body.p_nullifiers ?? []),
          ],
        );
        res.writeHead(200);
        res.end(JSON.stringify(queryResult.rows[0]?.result ?? { ok: true }));
        return;
      }

      const tableMatch = url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
      if (req.method === "GET" && tableMatch) {
        const tableName = tableMatch[1];
        if (!tableName || !ALLOWED_TABLES.has(tableName)) {
          res.writeHead(404);
          res.end(JSON.stringify({ error: `Unknown table ${tableName}` }));
          return;
        }

        const whereClauses = [];
        const params = [];
        let limitClause = "";

        for (const [key, val] of url.searchParams.entries()) {
          if (key === "select" || key === "order") {
            continue;
          }
          if (key === "limit") {
            const limitNum = Number(val);
            if (Number.isInteger(limitNum) && limitNum > 0) {
              limitClause = ` limit ${limitNum}`;
            }
            continue;
          }
          if (/^[a-z_]+$/.test(key) && val.startsWith("eq.")) {
            params.push(val.slice(3));
            whereClauses.push(`${key}::text = $${params.length}`);
          }
        }

        const whereSql =
          whereClauses.length > 0 ? ` where ${whereClauses.join(" and ")}` : "";
        const sql = `select * from public.${tableName}${whereSql}${limitClause};`;
        const result = await db.query(sql, params);
        res.writeHead(200);
        res.end(JSON.stringify(result.rows));
        return;
      }

      res.writeHead(404);
      res.end(JSON.stringify({ error: "Not found" }));
    } catch (err) {
      res.writeHead(500);
      res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(
      JSON.stringify({
        event: "local_supabase_pglite_ready",
        url: `http://127.0.0.1:${PORT}`,
      }),
    );
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

