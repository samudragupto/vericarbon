-- =============================================================================
-- VeriCarbon Local Development Seed Data (Phase 5)
-- Seeds 2 demo registries, 3 projects, plausible issuances/claims, nullifiers,
-- and the initial sync_log row. Idempotent via ON CONFLICT clauses.
-- =============================================================================

-- 1. Seed two demo registry users in auth.users and public.profiles
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'registry-verra-demo@vericarbon.local', '{"role":"registry"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'registry-gold-demo@vericarbon.local', '{"role":"registry"}'::jsonb)
on conflict (id) do nothing;

insert into public.profiles (id, display_name, is_registry)
values
  ('11111111-1111-4111-8111-111111111111', 'VeriCarbon Demo Registry Alpha (Tapajos)', true),
  ('22222222-2222-4222-8222-222222222222', 'VeriCarbon Demo Registry Beta (Amazonia)', true)
on conflict (id) do update
  set display_name = excluded.display_name,
      is_registry = excluded.is_registry;

-- 2. Seed three demo projects across the two registries
insert into public.projects (
  project_id,
  geo_commitment,
  evidence_cid,
  registry_address,
  tx_hash,
  log_index,
  block_number
) values
  (
    '0x1000000000000000000000000000000000000000000000000000000000000001',
    '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f01',
    'bafkreidemo1tapajos2024evidencebundle000000000000000000000001',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0xaaa0000000000000000000000000000000000000000000000000000000000001',
    0,
    100
  ),
  (
    '0x1000000000000000000000000000000000000000000000000000000000000002',
    '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f02',
    'bafkreidemo2xingu2024evidencebundle00000000000000000000000002',
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    '0xaaa0000000000000000000000000000000000000000000000000000000000002',
    0,
    101
  ),
  (
    '0x1000000000000000000000000000000000000000000000000000000000000003',
    '0xa1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f03',
    'bafkreidemo3manaus2025evidencebundle0000000000000000000000003',
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    '0xaaa0000000000000000000000000000000000000000000000000000000000003',
    0,
    102
  )
on conflict (project_id) do update
  set geo_commitment = excluded.geo_commitment,
      evidence_cid = excluded.evidence_cid,
      registry_address = excluded.registry_address;

-- 3. Seed plausible issuances
insert into public.issuances (
  issuance_nullifier,
  project_id,
  amount,
  vintage_year,
  credit_type,
  tx_hash,
  log_index,
  block_number
) values
  (
    '0x2000000000000000000000000000000000000000000000000000000000000001',
    '0x1000000000000000000000000000000000000000000000000000000000000001',
    544,
    2024,
    0,
    '0xbbb0000000000000000000000000000000000000000000000000000000000001',
    1,
    105
  ),
  (
    '0x2000000000000000000000000000000000000000000000000000000000000002',
    '0x1000000000000000000000000000000000000000000000000000000000000002',
    480,
    2024,
    0,
    '0xbbb0000000000000000000000000000000000000000000000000000000000002',
    1,
    106
  ),
  (
    '0x2000000000000000000000000000000000000000000000000000000000000003',
    '0x1000000000000000000000000000000000000000000000000000000000000003',
    512,
    2025,
    1,
    '0xbbb0000000000000000000000000000000000000000000000000000000000003',
    1,
    107
  )
on conflict (issuance_nullifier) do nothing;

-- 4. Seed plausible retirement claims
insert into public.claims (
  claim_nullifier,
  serial_ids,
  claim_type,
  beneficiary_commitment,
  tx_hash,
  log_index,
  block_number
) values
  (
    '0x3000000000000000000000000000000000000000000000000000000000000001',
    array[1]::bigint[],
    0,
    '0x9999000000000000000000000000000000000000000000000000000000000001',
    '0xccc0000000000000000000000000000000000000000000000000000000000001',
    0,
    110
  )
on conflict (claim_nullifier) do nothing;

-- 5. Seed corresponding nullifiers
insert into public.nullifiers (
  nullifier,
  kind,
  spent,
  first_seen_tx,
  log_index,
  block_number
) values
  (
    '0x2000000000000000000000000000000000000000000000000000000000000001',
    'issuance',
    true,
    '0xbbb0000000000000000000000000000000000000000000000000000000000001',
    1,
    105
  ),
  (
    '0x2000000000000000000000000000000000000000000000000000000000000002',
    'issuance',
    true,
    '0xbbb0000000000000000000000000000000000000000000000000000000000002',
    1,
    106
  ),
  (
    '0x2000000000000000000000000000000000000000000000000000000000000003',
    'issuance',
    true,
    '0xbbb0000000000000000000000000000000000000000000000000000000000003',
    1,
    107
  ),
  (
    '0x3000000000000000000000000000000000000000000000000000000000000001',
    'claim',
    true,
    '0xccc0000000000000000000000000000000000000000000000000000000000001',
    0,
    110
  )
on conflict (nullifier) do nothing;

-- 6. Seed initial sync_log watermark (id = 1, last_block = 0 so local Anvil / Base Sepolia sync starts from genesis)
insert into public.sync_log (id, chain_id, last_block, updated_at)
values (1, 84532, 0, now())
on conflict (id) do update
  set chain_id = excluded.chain_id,
      last_block = excluded.last_block,
      updated_at = now();
