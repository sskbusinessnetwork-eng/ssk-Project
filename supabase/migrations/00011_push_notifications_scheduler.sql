-- ============================================================================
-- 00011: Multi-Device Web Push Subscriptions, Delivery Logs & IST Cron Jobs
-- Schedule (India Standard Time - UTC+05:30):
--   08:00 IST (02:30 UTC) - Good Morning
--   13:00 IST (07:30 UTC) - Good Afternoon
--   18:00 IST (12:30 UTC) - Good Evening
--   21:00 IST (15:30 UTC) - Good Night
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Multi-device push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'MEMBER',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  subscription_json JSONB NOT NULL,
  device_label TEXT,
  platform TEXT,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  last_sent_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active
  ON public.push_subscriptions (user_id, is_active);

-- 2. Scheduled & instant notification delivery logs (with idempotency key)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subscription_id UUID REFERENCES public.push_subscriptions(id) ON DELETE SET NULL,
  notification_date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('morning', 'afternoon', 'evening', 'night', 'instant')),
  idempotency_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pending_task_count INTEGER NOT NULL DEFAULT 0,
  target_url TEXT NOT NULL DEFAULT '/dashboard',
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'partial', 'failed', 'skipped', 'expired')),
  attempt_count INTEGER NOT NULL DEFAULT 1,
  devices_targeted INTEGER NOT NULL DEFAULT 0,
  devices_succeeded INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_date
  ON public.notification_logs (user_id, notification_date DESC);

-- Updated-at trigger helper
CREATE OR REPLACE FUNCTION public.set_push_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_push_updated_at();

DROP TRIGGER IF EXISTS trg_notification_logs_updated_at ON public.notification_logs;
CREATE TRIGGER trg_notification_logs_updated_at
  BEFORE UPDATE ON public.notification_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_push_updated_at();

-- 3. Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON public.push_subscriptions
  FOR SELECT
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update_own"
  ON public.push_subscriptions
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own"
  ON public.push_subscriptions
  FOR DELETE
  USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "notification_logs_select_own" ON public.notification_logs;
CREATE POLICY "notification_logs_select_own"
  ON public.notification_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- 4. Supabase Cron Jobs (pg_cron + pg_net) for 4 daily IST notification slots
-- Store these secrets in Supabase Vault before enabling:
--   SELECT vault.create_secret('https://<project-ref>.supabase.co', 'supabase_project_url');
--   SELECT vault.create_secret('<CRON_OR_SERVICE_ROLE_SECRET>', 'scheduled_notif_bearer');
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_net') THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    CREATE EXTENSION IF NOT EXISTS pg_net;

    -- Helper to unschedule previous copies cleanly
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN (
      'ssk_notif_morning_ist_0800',
      'ssk_notif_afternoon_ist_1300',
      'ssk_notif_evening_ist_1800',
      'ssk_notif_night_ist_2100'
    );

    -- 08:00 IST = 02:30 UTC
    PERFORM cron.schedule(
      'ssk_notif_morning_ist_0800',
      '30 2 * * *',
      $cron$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/send-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_notif_bearer' LIMIT 1)
        ),
        body := jsonb_build_object('slot', 'morning')
      );
      $cron$
    );

    -- 13:00 IST = 07:30 UTC
    PERFORM cron.schedule(
      'ssk_notif_afternoon_ist_1300',
      '30 7 * * *',
      $cron$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/send-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_notif_bearer' LIMIT 1)
        ),
        body := jsonb_build_object('slot', 'afternoon')
      );
      $cron$
    );

    -- 18:00 IST = 12:30 UTC
    PERFORM cron.schedule(
      'ssk_notif_evening_ist_1800',
      '30 12 * * *',
      $cron$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/send-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_notif_bearer' LIMIT 1)
        ),
        body := jsonb_build_object('slot', 'evening')
      );
      $cron$
    );

    -- 21:00 IST = 15:30 UTC
    PERFORM cron.schedule(
      'ssk_notif_night_ist_2100',
      '30 15 * * *',
      $cron$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_project_url' LIMIT 1) || '/functions/v1/send-scheduled-notifications',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'scheduled_notif_bearer' LIMIT 1)
        ),
        body := jsonb_build_object('slot', 'night')
      );
      $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron/pg_net setup skipped or deferred: %', SQLERRM;
END $$;
