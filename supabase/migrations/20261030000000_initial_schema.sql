-- =============================================================================
-- VeriCarbon Migration 01: Core Schema, Extensions, Indexes, and RLS Policies
-- Idempotent SQL migration (safe to re-run).
-- =============================================================================

-- 1. Extensions (pg_cron, pg_net) with safe fallback for standalone Postgres / PGlite
create schema if not exists extensions;

do $$
begin
  create extension if not exists pg_cron;
exception
  when others then
    create schema if not exists cron;
    create table if not exists cron.job (
      jobid bigserial primary key,
      schedule text not null,
      command text not null,
      jobname text unique
    );
    create or replace function cron.schedule(
      p_jobname text,
      p_schedule text,
      p_command text
    ) returns bigint language plpgsql as $fn$
    declare
      v_jobid bigint;
    begin
      insert into cron.job (jobname, schedule, command)
      values (p_jobname, p_schedule, p_command)
      on conflict (jobname) do update
        set schedule = excluded.schedule,
            command = excluded.command
      returning jobid into v_jobid;
      return v_jobid;
    end;
    $fn$;
end
$$;

do $$
begin
  create extension if not exists pg_net;
exception
  when others then
    create schema if not exists net;
    create or replace function net.http_post(
      url text,
      body jsonb default '{}'::jsonb,
      params jsonb default '{}'::jsonb,
      headers jsonb default '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds int default 5000
    ) returns bigint language plpgsql as $fn$
    begin
      return 1;
    end;
    $fn$;
end
$$;

-- 2. Ensure Supabase auth schema & roles exist for local/standalone test runners
do $$
begin
  create schema if not exists auth;
  create table if not exists auth.users (
    id uuid primary key,
    email text unique,
    raw_user_meta_data jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
exception
  when others then null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    execute $fn$
      create function auth.uid() returns uuid language sql stable as $body$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $body$;
    $fn$;
  end if;
exception
  when others then null;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'role'
  ) then
    execute $fn$
      create function auth.role() returns text language sql stable as $body$
        select coalesce(
          nullif(current_setting('request.jwt.claim.role', true), ''),
          current_user
        );
      $body$;
    $fn$;
  end if;
exception
  when others then null;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
exception
  when others then null;
end
$$;

-- 3. Core Tables

-- 3.1 profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_registry boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3.2 projects
create table if not exists public.projects (
  project_id text primary key,
  geo_commitment text not null,
  evidence_cid text not null,
  registry_address text not null,
  tx_hash text,
  log_index int default 0,
  block_number bigint default 0,
  created_at timestamptz not null default now(),
  constraint uq_projects_tx_log unique (tx_hash, log_index)
);

-- 3.3 issuances
create table if not exists public.issuances (
  issuance_nullifier text primary key,
  project_id text not null references public.projects(project_id) on delete cascade,
  amount numeric not null check (amount > 0),
  vintage_year int not null check (vintage_year >= 2000 and vintage_year <= 2100),
  credit_type int not null check (credit_type >= 0),
  tx_hash text not null,
  log_index int not null default 0,
  block_number bigint not null,
  created_at timestamptz not null default now(),
  constraint uq_issuances_tx_log unique (tx_hash, log_index)
);

-- 3.4 claims
create table if not exists public.claims (
  claim_nullifier text primary key,
  serial_ids bigint[] not null,
  claim_type int not null check (claim_type >= 0),
  beneficiary_commitment text not null,
  tx_hash text not null,
  log_index int not null default 0,
  block_number bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_claims_tx_log unique (tx_hash, log_index)
);

-- 3.5 nullifiers
create table if not exists public.nullifiers (
  nullifier text primary key,
  kind text not null check (kind in ('issuance', 'claim')),
  spent boolean not null default true,
  first_seen_tx text not null,
  log_index int not null default 0,
  block_number bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint uq_nullifiers_tx_log unique (first_seen_tx, log_index)
);

-- 3.6 sync_log
create table if not exists public.sync_log (
  id int primary key,
  chain_id int not null,
  last_block bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- 4. Helpful Indexes (project_id, block_number, kind)
create index if not exists idx_projects_block_number on public.projects (block_number);
create index if not exists idx_issuances_project_id on public.issuances (project_id);
create index if not exists idx_issuances_block_number on public.issuances (block_number);
create index if not exists idx_claims_block_number on public.claims (block_number);
create index if not exists idx_nullifiers_kind on public.nullifiers (kind);
create index if not exists idx_nullifiers_block_number on public.nullifiers (block_number);

-- 5. Row Level Security (RLS) on ALL tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.issuances enable row level security;
alter table public.claims enable row level security;
alter table public.nullifiers enable row level security;
alter table public.sync_log enable row level security;

-- 5.1 profiles policies: self-read/update only; writes via service_role
drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select"
  on public.profiles
  for select
  using (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update"
  on public.profiles
  for update
  using (auth.uid() = id or auth.role() = 'service_role')
  with check (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "profiles_service_role_write" on public.profiles;
create policy "profiles_service_role_write"
  on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

-- 5.2 projects policies: public SELECT; writes ONLY via service_role
drop policy if exists "projects_public_select" on public.projects;
create policy "projects_public_select"
  on public.projects
  for select
  using (true);

drop policy if exists "projects_service_role_all" on public.projects;
create policy "projects_service_role_all"
  on public.projects
  for all
  to service_role
  using (true)
  with check (true);

-- 5.3 issuances policies: public SELECT; writes ONLY via service_role
drop policy if exists "issuances_public_select" on public.issuances;
create policy "issuances_public_select"
  on public.issuances
  for select
  using (true);

drop policy if exists "issuances_service_role_all" on public.issuances;
create policy "issuances_service_role_all"
  on public.issuances
  for all
  to service_role
  using (true)
  with check (true);

-- 5.4 claims policies: public SELECT; writes ONLY via service_role
drop policy if exists "claims_public_select" on public.claims;
create policy "claims_public_select"
  on public.claims
  for select
  using (true);

drop policy if exists "claims_service_role_all" on public.claims;
create policy "claims_service_role_all"
  on public.claims
  for all
  to service_role
  using (true)
  with check (true);

-- 5.5 nullifiers policies: public SELECT; writes ONLY via service_role
drop policy if exists "nullifiers_public_select" on public.nullifiers;
create policy "nullifiers_public_select"
  on public.nullifiers
  for select
  using (true);

drop policy if exists "nullifiers_service_role_all" on public.nullifiers;
create policy "nullifiers_service_role_all"
  on public.nullifiers
  for all
  to service_role
  using (true)
  with check (true);

-- 5.6 sync_log policies: public SELECT (for health checks); writes ONLY via service_role
drop policy if exists "sync_log_public_select" on public.sync_log;
create policy "sync_log_public_select"
  on public.sync_log
  for select
  using (true);

drop policy if exists "sync_log_service_role_all" on public.sync_log;
create policy "sync_log_service_role_all"
  on public.sync_log
  for all
  to service_role
  using (true)
  with check (true);

-- 6. Atomic Transactional Batch Ingestion RPC for the Indexer
create or replace function public.ingest_indexer_batch(
  p_chain_id int,
  p_last_block bigint,
  p_projects jsonb default '[]'::jsonb,
  p_issuances jsonb default '[]'::jsonb,
  p_claims jsonb default '[]'::jsonb,
  p_nullifiers jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_proj jsonb;
  v_iss jsonb;
  v_clm jsonb;
  v_nul jsonb;
  v_proj_count int := 0;
  v_iss_count int := 0;
  v_clm_count int := 0;
  v_nul_count int := 0;
begin
  -- 1. Upsert projects idempotently
  for v_proj in select * from jsonb_array_elements(coalesce(p_projects, '[]'::jsonb))
  loop
    insert into public.projects (
      project_id,
      geo_commitment,
      evidence_cid,
      registry_address,
      tx_hash,
      log_index,
      block_number
    ) values (
      v_proj->>'project_id',
      v_proj->>'geo_commitment',
      v_proj->>'evidence_cid',
      v_proj->>'registry_address',
      v_proj->>'tx_hash',
      coalesce((v_proj->>'log_index')::int, 0),
      coalesce((v_proj->>'block_number')::bigint, 0)
    )
    on conflict (project_id) do update
      set geo_commitment = excluded.geo_commitment,
          evidence_cid = excluded.evidence_cid,
          registry_address = excluded.registry_address,
          tx_hash = coalesce(excluded.tx_hash, public.projects.tx_hash),
          log_index = coalesce(excluded.log_index, public.projects.log_index),
          block_number = coalesce(excluded.block_number, public.projects.block_number);
    v_proj_count := v_proj_count + 1;
  end loop;

  -- 2. Upsert issuances idempotently
  for v_iss in select * from jsonb_array_elements(coalesce(p_issuances, '[]'::jsonb))
  loop
    insert into public.issuances (
      issuance_nullifier,
      project_id,
      amount,
      vintage_year,
      credit_type,
      tx_hash,
      log_index,
      block_number
    ) values (
      v_iss->>'issuance_nullifier',
      v_iss->>'project_id',
      (v_iss->>'amount')::numeric,
      (v_iss->>'vintage_year')::int,
      (v_iss->>'credit_type')::int,
      v_iss->>'tx_hash',
      coalesce((v_iss->>'log_index')::int, 0),
      (v_iss->>'block_number')::bigint
    )
    on conflict (issuance_nullifier) do update
      set project_id = excluded.project_id,
          amount = excluded.amount,
          vintage_year = excluded.vintage_year,
          credit_type = excluded.credit_type,
          tx_hash = excluded.tx_hash,
          log_index = excluded.log_index,
          block_number = excluded.block_number;
    v_iss_count := v_iss_count + 1;
  end loop;

  -- 3. Upsert claims idempotently
  for v_clm in select * from jsonb_array_elements(coalesce(p_claims, '[]'::jsonb))
  loop
    insert into public.claims (
      claim_nullifier,
      serial_ids,
      claim_type,
      beneficiary_commitment,
      tx_hash,
      log_index,
      block_number
    ) values (
      v_clm->>'claim_nullifier',
      array(select jsonb_array_elements_text(coalesce(v_clm->'serial_ids', '[]'::jsonb))::bigint),
      (v_clm->>'claim_type')::int,
      v_clm->>'beneficiary_commitment',
      v_clm->>'tx_hash',
      coalesce((v_clm->>'log_index')::int, 0),
      coalesce((v_clm->>'block_number')::bigint, 0)
    )
    on conflict (claim_nullifier) do update
      set serial_ids = excluded.serial_ids,
          claim_type = excluded.claim_type,
          beneficiary_commitment = excluded.beneficiary_commitment,
          tx_hash = excluded.tx_hash,
          log_index = excluded.log_index,
          block_number = excluded.block_number;
    v_clm_count := v_clm_count + 1;
  end loop;

  -- 4. Upsert nullifiers idempotently
  for v_nul in select * from jsonb_array_elements(coalesce(p_nullifiers, '[]'::jsonb))
  loop
    insert into public.nullifiers (
      nullifier,
      kind,
      spent,
      first_seen_tx,
      log_index,
      block_number
    ) values (
      v_nul->>'nullifier',
      v_nul->>'kind',
      coalesce((v_nul->>'spent')::boolean, true),
      v_nul->>'first_seen_tx',
      coalesce((v_nul->>'log_index')::int, 0),
      coalesce((v_nul->>'block_number')::bigint, 0)
    )
    on conflict (nullifier) do update
      set kind = excluded.kind,
          spent = excluded.spent,
          first_seen_tx = excluded.first_seen_tx,
          log_index = excluded.log_index,
          block_number = excluded.block_number;
    v_nul_count := v_nul_count + 1;
  end loop;

  -- 5. Update sync_log in the same transaction
  insert into public.sync_log (id, chain_id, last_block, updated_at)
  values (1, p_chain_id, p_last_block, now())
  on conflict (id) do update
    set chain_id = excluded.chain_id,
        last_block = greatest(public.sync_log.last_block, excluded.last_block),
        updated_at = now();

  return jsonb_build_object(
    'projects_upserted', v_proj_count,
    'issuances_upserted', v_iss_count,
    'claims_upserted', v_clm_count,
    'nullifiers_upserted', v_nul_count,
    'last_block', p_last_block
  );
end;
$$;
