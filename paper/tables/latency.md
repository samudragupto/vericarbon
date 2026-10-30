# Table: End-to-End System Latency and Indexer Ingestion Lag

Empirical latency measurements across $N = 20$ repeated trials for RPC roundtrip queries
and end-to-end off-chain indexer visibility (time from on-chain event batch ingestion to database visibility).

| Subsystem / Operation | Endpoint / Target | Samples ($N$) | Mean (ms) | Median (ms) | p95 (ms) | Min (ms) | Max (ms) | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Public RPC Roundtrip** | `https://sepolia.base.org` | 20 | **468.11** | 466.82 | **507.77** | 439.22 | 519.40 | Live Base Sepolia `eth_blockNumber` queries |
| **Indexer Ingestion Lag** | PostgREST `ingest_indexer_batch` | 20 | **12.12** | 4.95 | **36.34** | 3.92 | 45.28 | Event ingestion to DB query visibility (`issuances`) |

> [!NOTE]
> The indexer sync pipeline demonstrates a p95 lag of **36.34 ms**, confirming that database 
visibility is nearly instantaneous upon log consumption, well within the hourly `pg_cron` scheduling boundary.
