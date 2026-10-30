-- =============================================================================
-- VeriCarbon Migration 02: Hourly Indexer Schedule via pg_cron + pg_net
-- Idempotent SQL migration scheduling the `indexer` Edge Function every hour.
-- =============================================================================

do $$
begin
  perform cron.schedule(
    'indexer-hourly',
    '0 * * * *',
    $cron$
      select net.http_post(
        url := coalesce(
          nullif(current_setting('app.settings.supabase_url', true), ''),
          'http://127.0.0.1:54321'
        ) || '/functions/v1/indexer',
        body := '{"trigger":"pg_cron"}'::jsonb,
        params := '{}'::jsonb,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(
            nullif(current_setting('app.settings.service_role_key', true), ''),
            'local-service-role'
          )
        ),
        timeout_milliseconds := 10000
      );
    $cron$
  );
end
$$;

