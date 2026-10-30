#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SUPABASE_URL="http://127.0.0.1:54321"
ANVIL_URL="http://127.0.0.1:8545"
ANVIL_PID=""
PGLITE_PID=""

cleanup() {
  if [[ -n "$ANVIL_PID" ]] && kill -0 "$ANVIL_PID" 2>/dev/null; then
    kill "$ANVIL_PID" 2>/dev/null || true
  fi
  if [[ -n "$PGLITE_PID" ]] && kill -0 "$PGLITE_PID" 2>/dev/null; then
    kill "$PGLITE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "=== [1/6] Building @vericarbon/sdk ==="
pnpm --filter @vericarbon/sdk build

echo "=== [2/6] Starting local Supabase stack (migrations + seed.sql) ==="
if command -v supabase >/dev/null 2>&1 && supabase status >/dev/null 2>&1; then
  supabase db reset && supabase start
else
  echo "Starting embedded PostgreSQL 16 (PGlite) Supabase gateway on ${SUPABASE_URL}..."
  node supabase/local_server.mjs > /tmp/vericarbon_pglite.log 2>&1 &
  PGLITE_PID=$!
  for _ in $(seq 1 30); do
    if curl -sf "${SUPABASE_URL}/rest/v1/sync_log?select=id&limit=1" >/dev/null 2>&1; then
      break
    fi
    sleep 0.5
  done
  curl -sf -X POST "${SUPABASE_URL}/rest/v1/reset" >/dev/null
fi

echo "=== [3/6] Starting local Anvil node on ${ANVIL_URL} ==="
anvil --port 8545 --chain-id 31337 --silent > /tmp/vericarbon_anvil.log 2>&1 &
ANVIL_PID=$!
for _ in $(seq 1 20); do
  if curl -sf -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    "${ANVIL_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.3
done

echo "=== [4/6] Running forge script IssueLocal.s.sol against local Anvil ==="
(
  cd packages/contracts
  forge script script/IssueLocal.s.sol:IssueLocalScript \
    --rpc-url "${ANVIL_URL}" \
    --broadcast
)

echo "=== [5/6] Running indexer syncOnce() pointed at local Anvil ==="
node --input-type=module -e "
import fs from 'node:fs';
import { syncOnce } from './packages/sdk/dist/index.js';

const manifest = JSON.parse(
  fs.readFileSync('./packages/contracts/deployments/anvil-local.json', 'utf8')
);

const syncResult = await syncOnce({
  supabaseUrl: '${SUPABASE_URL}',
  supabaseServiceRoleKey: 'local-service-role',
  rpcUrl: '${ANVIL_URL}',
  registryAddress: manifest.CarbonRegistry,
  useEdgeFunction: false,
});

console.log('Indexer syncOnce result:', JSON.stringify(syncResult));
if (!syncResult.ok || syncResult.projectsUpserted < 1 || syncResult.issuancesUpserted < 1) {
  console.error('Unexpected syncResult:', syncResult);
  process.exit(1);
}
"

echo "=== [6/6] Asserting rows in projects, issuances, claims, and nullifiers ==="
node --input-type=module -e "
import fs from 'node:fs';

const manifest = JSON.parse(
  fs.readFileSync('./packages/contracts/deployments/anvil-local.json', 'utf8')
);

const fetchTable = async (query) => {
  const res = await fetch('${SUPABASE_URL}/rest/v1/' + query);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + query);
  return await res.json();
};

const projects = await fetchTable('projects?project_id=eq.' + manifest.projectId);
const issuances = await fetchTable('issuances?issuance_nullifier=eq.' + manifest.issuanceNullifier);
const claims = await fetchTable('claims?claim_nullifier=eq.' + manifest.claimNullifier);
const nullifiers = await fetchTable('nullifiers?nullifier=eq.' + manifest.issuanceNullifier);
const claimNullifiers = await fetchTable('nullifiers?nullifier=eq.' + manifest.claimNullifier);

if (projects.length !== 1) {
  throw new Error('Expected 1 project row for ' + manifest.projectId + ', got ' + projects.length);
}
if (issuances.length !== 1 || Number(issuances[0].amount) !== 544) {
  throw new Error('Expected 1 issuance row with amount=544, got ' + JSON.stringify(issuances));
}
if (claims.length !== 1) {
  throw new Error('Expected 1 claim row for ' + manifest.claimNullifier + ', got ' + claims.length);
}
if (nullifiers.length !== 1 || nullifiers[0].kind !== 'issuance' || !nullifiers[0].spent) {
  throw new Error('Expected spent issuance nullifier row, got ' + JSON.stringify(nullifiers));
}
if (claimNullifiers.length !== 1 || claimNullifiers[0].kind !== 'claim' || !claimNullifiers[0].spent) {
  throw new Error('Expected spent claim nullifier row, got ' + JSON.stringify(claimNullifiers));
}

console.log(JSON.stringify({
  status: 'E2E_VERIFIED',
  project: projects[0],
  issuance: issuances[0],
  claim: claims[0],
  issuanceNullifier: nullifiers[0],
  claimNullifier: claimNullifiers[0],
}, null, 2));
"

echo "=== E2E Local Pipeline Verification Complete ==="

