-- Migration 00005: Fix referrals table columns & schema compatibility
-- Run this script in the Supabase SQL Editor if your table has strict NOT NULL constraints or mismatched column names.

-- 1. Add all missing columns if they don't exist
ALTER TABLE public.referrals 
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS business_requirement TEXT,
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_mobile TEXT,
  ADD COLUMN IF NOT EXISTS requirement TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';

-- 2. Backfill values between column name aliases
UPDATE public.referrals 
SET 
  contact_name = COALESCE(contact_name, customer_name, 'N/A'),
  contact_phone = COALESCE(contact_phone, customer_mobile, 'N/A'),
  business_requirement = COALESCE(business_requirement, requirement, 'N/A'),
  customer_name = COALESCE(customer_name, contact_name, 'N/A'),
  customer_mobile = COALESCE(customer_mobile, contact_phone, 'N/A'),
  requirement = COALESCE(requirement, business_requirement, 'N/A');

-- 3. Relax strict NOT NULL constraints on specific columns so both column standards work
ALTER TABLE public.referrals 
  ALTER COLUMN contact_name DROP NOT NULL,
  ALTER COLUMN contact_phone DROP NOT NULL,
  ALTER COLUMN business_requirement DROP NOT NULL,
  ALTER COLUMN customer_name DROP NOT NULL,
  ALTER COLUMN customer_mobile DROP NOT NULL,
  ALTER COLUMN requirement DROP NOT NULL;

-- 4. Create trigger to automatically keep contact_* and customer_*/requirement columns in sync
CREATE OR REPLACE FUNCTION public.sync_referrals_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync contact_name <-> customer_name
  IF NEW.contact_name IS NULL AND NEW.customer_name IS NOT NULL THEN
    NEW.contact_name := NEW.customer_name;
  ELSIF NEW.customer_name IS NULL AND NEW.contact_name IS NOT NULL THEN
    NEW.customer_name := NEW.contact_name;
  END IF;

  -- Sync contact_phone <-> customer_mobile
  IF NEW.contact_phone IS NULL AND NEW.customer_mobile IS NOT NULL THEN
    NEW.contact_phone := NEW.customer_mobile;
  ELSIF NEW.customer_mobile IS NULL AND NEW.contact_phone IS NOT NULL THEN
    NEW.customer_mobile := NEW.contact_phone;
  END IF;

  -- Sync business_requirement <-> requirement
  IF NEW.business_requirement IS NULL AND NEW.requirement IS NOT NULL THEN
    NEW.business_requirement := NEW.requirement;
  ELSIF NEW.requirement IS NULL AND NEW.business_requirement IS NOT NULL THEN
    NEW.requirement := NEW.business_requirement;
  END IF;

  -- Set default status if missing
  IF NEW.status IS NULL THEN
    NEW.status := 'Pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_referrals_columns ON public.referrals;

CREATE TRIGGER trg_sync_referrals_columns
BEFORE INSERT OR UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.sync_referrals_columns();

-- 5. RLS Policy Update
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_policy" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_policy" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_policy" ON public.referrals;

CREATE POLICY "referrals_select_policy" ON public.referrals
FOR SELECT
TO public, anon, authenticated
USING (true);

CREATE POLICY "referrals_insert_policy" ON public.referrals
FOR INSERT
TO public, anon, authenticated
WITH CHECK (
  sender_id IS NOT NULL 
  AND receiver_id IS NOT NULL 
  AND chapter_id IS NOT NULL
  AND (contact_name IS NOT NULL OR customer_name IS NOT NULL)
  AND (contact_phone IS NOT NULL OR customer_mobile IS NOT NULL)
  AND (business_requirement IS NOT NULL OR requirement IS NOT NULL)
);

CREATE POLICY "referrals_update_policy" ON public.referrals
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);
