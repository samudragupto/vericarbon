# Table: End-to-End System Latency and Indexer Ingestion Lag

Empirical latency measurements across $N = 20$ repeated trials for RPC roundtrip queries
and end-to-end off-chain indexer visibility (time from on-chain event batch ingestion to database visibility).

| Subsystem / Operation | Endpoint / Target | Samples ($N$) | Mean (ms) | Median (ms) | p95 (ms) | Min (ms) | Max (ms) | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Public RPC Roundtrip** | `https://sepolia.base.org` | 20 | **507.25** | 506.62 | **552.43** | 439.38 | 559.27 | Live Base Sepolia `eth_blockNumber` queries |
| **Indexer Ingestion Lag** | PostgREST `ingest_indexer_batch` | 20 | **12.87** | 5.08 | **34.84** | 3.73 | 36.09 | Event ingestion to DB query visibility (`issuances`) |

> [!NOTE]
> The indexer sync pipeline demonstrates a p95 lag of **34.84 ms**, confirming that database 
visibility is nearly instantaneous upon log consumption, well within the hourly `pg_cron` scheduling boundary.
