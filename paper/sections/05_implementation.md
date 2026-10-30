# Section 5: Implementation (Word Budget: 700 words)

## 5.1 Remote Sensing & Feature Pipeline (`services/mrv`)
*Topic Sentence:* The MRV data pipeline is implemented in Python 3.11 using `uv`, querying Sentinel-2 L2A STAC items and ESA WorldCover rasters from Microsoft Planetary Computer to compute 12 spectral and categorical features.
- Key concepts: Spatial-block partitioning over 4 quadrants (`6z2zz`, `6z3pb`, `6z8bp`, `6z900`); HistGradientBoostingRegressor training; ONNX graph export with integer quantization.
- Target words: 240 words.
- Claims: None.
- Citations: TODOCITE: pystac-client Microsoft Planetary Computer STAC.

## 5.2 Zero-Knowledge Proving and Smart Contracts (`services/zk` & `packages/contracts`)
*Topic Sentence:* Circuit compilation and proving leverage `ezkl v23.0.5`, emitting `Halo2Verifier.sol` which executes KZG multi-point pairing checks in EVM bytecode.
- Key concepts: Halo2 PLONKish arithmetization; Spurious Dragon 24,576 B code limit compliance; OpenZeppelin 5.2.0 ERC1155 & AccessControl; Foundry deployment scripts on Base Sepolia.
- Target words: 240 words.
- Claims: [CLAIM: C-07: 18007 bytes verifier initcode]; [CLAIM: C-20: 11323 bytes CarbonRegistry runtime size].
- Citations: TODOCITE: OpenZeppelin contracts v5.2.0.

## 5.3 Web Explorer, TypeScript SDK & Off-Chain Indexing (`apps/web` & `supabase`)
*Topic Sentence:* The user interface is developed in Next.js 15 and MapLibre GL, communicating via a shared TypeScript SDK with unified `viem@2.57.13` and backed by a PostgreSQL 16 schema tested offline via PGlite.
- Key concepts: Wagmi v2 client interaction; atomic PostgREST ingestion RPC; MapLibre GL Carto Dark Matter basemap; Lighthouse performance audit.
- Target words: 220 words.
- Claims: [CLAIM: C-14: 95 Lighthouse performance score].
- Citations: None.
