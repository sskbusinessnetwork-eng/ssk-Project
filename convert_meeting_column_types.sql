-- ==============================================================================
-- SSK BUSINESS NETWORK - FIX COLUMN TYPES FOR MEETINGS TABLE IN SUPABASE
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Fix is_completed: convert TEXT -> BOOLEAN with safe default
ALTER TABLE public.meetings 
    ALTER COLUMN is_completed TYPE BOOLEAN 
    USING (
        CASE 
            WHEN is_completed IS NULL THEN false
            WHEN is_completed::text ILIKE 'true' OR is_completed::text = '1' OR is_completed::text ILIKE 't' THEN true
            ELSE false 
        END
    );
ALTER TABLE public.meetings ALTER COLUMN is_completed SET DEFAULT false;

-- 2. Fix is_recurring: convert TEXT -> BOOLEAN with safe default
ALTER TABLE public.meetings 
    ALTER COLUMN is_recurring TYPE BOOLEAN 
    USING (
        CASE 
            WHEN is_recurring IS NULL THEN false
            WHEN is_recurring::text ILIKE 'true' OR is_recurring::text = '1' OR is_recurring::text ILIKE 't' THEN true
            ELSE false 
        END
    );
ALTER TABLE public.meetings ALTER COLUMN is_recurring SET DEFAULT false;

-- 3. Fix is_cancelled: ensure BOOLEAN with safe default
ALTER TABLE public.meetings 
    ALTER COLUMN is_cancelled TYPE BOOLEAN 
    USING (
        CASE 
            WHEN is_cancelled IS NULL THEN false
            WHEN is_cancelled::text ILIKE 'true' OR is_cancelled::text = '1' OR is_cancelled::text ILIKE 't' THEN true
            ELSE false 
        END
    );
ALTER TABLE public.meetings ALTER COLUMN is_cancelled SET DEFAULT false;

-- 4. Fix meeting_amount: convert TEXT -> NUMERIC with safe default
ALTER TABLE public.meetings 
    ALTER COLUMN meeting_amount TYPE NUMERIC 
    USING (
        COALESCE(NULLIF(regexp_replace(COALESCE(meeting_amount::text, '0'), '[^0-9.]', '', 'g'), '')::numeric, 0)
    );
ALTER TABLE public.meetings ALTER COLUMN meeting_amount SET DEFAULT 0;

-- 5. Fix payment_status: convert TEXT -> JSONB with safe default
ALTER TABLE public.meetings 
    ALTER COLUMN payment_status TYPE JSONB 
    USING (
        CASE 
            WHEN payment_status IS NULL OR TRIM(payment_status::text) = '' THEN '{}'::jsonb
            WHEN TRIM(payment_status::text) LIKE '{%' THEN payment_status::jsonb
            ELSE jsonb_build_object()
        END
    );
ALTER TABLE public.meetings ALTER COLUMN payment_status SET DEFAULT '{}'::jsonb;

-- 6. Fix payment_methods: convert TEXT -> JSONB with safe default
ALTER TABLE public.meetings 
    ALTER COLUMN payment_methods TYPE JSONB 
    USING (
        CASE 
            WHEN payment_methods IS NULL OR TRIM(payment_methods::text) = '' THEN '{}'::jsonb
            WHEN TRIM(payment_methods::text) LIKE '{%' THEN payment_methods::jsonb
            ELSE jsonb_build_object()
        END
    );
ALTER TABLE public.meetings ALTER COLUMN payment_methods SET DEFAULT '{}'::jsonb;

-- 7. Ensure status column has default 'UPCOMING' and no nulls
UPDATE public.meetings 
SET status = 'UPCOMING' 
WHERE status IS NULL OR TRIM(status) = '';

ALTER TABLE public.meetings ALTER COLUMN status SET DEFAULT 'UPCOMING';

-- 8. Ensure member_notes has JSONB default
UPDATE public.meetings 
SET member_notes = '{}'::jsonb 
WHERE member_notes IS NULL;

ALTER TABLE public.meetings ALTER COLUMN member_notes SET DEFAULT '{}'::jsonb;

-- 9. Ensure attendance and amount_collected have JSONB default
UPDATE public.meetings 
SET attendance = '{}'::jsonb 
WHERE attendance IS NULL;
ALTER TABLE public.meetings ALTER COLUMN attendance SET DEFAULT '{}'::jsonb;

UPDATE public.meetings 
SET amount_collected = '{}'::jsonb 
WHERE amount_collected IS NULL;
ALTER TABLE public.meetings ALTER COLUMN amount_collected SET DEFAULT '{}'::jsonb;

-- 10. Update existing records with clean flags
UPDATE public.meetings
SET 
    is_completed = (CASE WHEN status = 'COMPLETED' THEN true ELSE COALESCE(is_completed, false) END),
    is_cancelled = (CASE WHEN status = 'CANCELLED' THEN true ELSE COALESCE(is_cancelled, false) END)
WHERE is_completed IS NULL OR is_cancelled IS NULL;

-- 11. Verify the corrected schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'meetings'
ORDER BY ordinal_position;
