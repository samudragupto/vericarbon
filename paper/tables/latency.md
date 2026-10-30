# Table: End-to-End System Latency and Indexer Ingestion Lag

Empirical latency measurements across $N = 20$ repeated trials for RPC roundtrip queries
and end-to-end off-chain indexer visibility (time from on-chain event batch ingestion to database visibility).

| Subsystem / Operation | Endpoint / Target | Samples ($N$) | Mean (ms) | Median (ms) | p95 (ms) | Min (ms) | Max (ms) | Notes |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Public RPC Roundtrip** | `https://sepolia.base.org` | 20 | **525.91** | 516.03 | **595.14** | 477.79 | 625.79 | Live Base Sepolia `eth_blockNumber` queries |
| **Indexer Ingestion Lag** | PostgREST `ingest_indexer_batch` | 20 | **15.82** | 15.48 | **31.57** | 2.44 | 58.76 | Event ingestion to DB query visibility (`issuances`) |

> [!NOTE]
> The indexer sync pipeline demonstrates a p95 lag of **31.57 ms**, confirming that database 
visibility is nearly instantaneous upon log consumption, well within the hourly `pg_cron` scheduling boundary.
