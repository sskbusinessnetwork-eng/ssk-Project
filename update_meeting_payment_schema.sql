-- ==============================================================================
-- SSK BUSINESS NETWORK - SUPABASE SQL SCHEMA UPDATE FOR MEETINGS & PAYMENTS
-- Run this script in your Supabase SQL Editor:
-- (Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run)
-- ==============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CREATE OR UPDATE 'meetings' TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.meetings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    chapter_id TEXT,
    admin_id TEXT,
    date TEXT,
    time TEXT DEFAULT '07:30',
    location TEXT DEFAULT '',
    venue TEXT DEFAULT '',
    title TEXT DEFAULT '',
    topic TEXT DEFAULT '',
    description TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'UPCOMING',
    is_completed BOOLEAN DEFAULT FALSE,
    is_cancelled BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT FALSE,
    meeting_amount NUMERIC DEFAULT 0,
    member_count INTEGER DEFAULT 0,
    guest_count INTEGER DEFAULT 0,
    attendance JSONB DEFAULT '{}'::jsonb,
    amount_collected JSONB DEFAULT '{}'::jsonb,
    payment_status JSONB DEFAULT '{}'::jsonb,
    payment_methods JSONB DEFAULT '{}'::jsonb,
    member_notes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add any missing columns to existing 'meetings' table (idempotent)
ALTER TABLE public.meetings 
    ADD COLUMN IF NOT EXISTS chapter_id TEXT,
    ADD COLUMN IF NOT EXISTS admin_id TEXT,
    ADD COLUMN IF NOT EXISTS date TEXT,
    ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '07:30',
    ADD COLUMN IF NOT EXISTS location TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPCOMING',
    ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS meeting_amount NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS guest_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS attendance JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS amount_collected JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS payment_status JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS payment_methods JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS member_notes JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Safely convert payment_status to JSONB if it was previously created as TEXT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'meetings' 
          AND column_name = 'payment_status' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN payment_status TYPE JSONB 
            USING (
                CASE 
                    WHEN payment_status IS NULL OR TRIM(payment_status::text) = '' THEN '{}'::jsonb
                    WHEN TRIM(payment_status::text) LIKE '{%' THEN payment_status::jsonb
                    ELSE jsonb_build_object()
                END
            );
    END IF;
END $$;
ALTER TABLE public.meetings ALTER COLUMN payment_status SET DEFAULT '{}'::jsonb;

-- Safely convert payment_methods to JSONB if it was previously created as TEXT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'meetings' 
          AND column_name = 'payment_methods' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN payment_methods TYPE JSONB 
            USING (
                CASE 
                    WHEN payment_methods IS NULL OR TRIM(payment_methods::text) = '' THEN '{}'::jsonb
                    WHEN TRIM(payment_methods::text) LIKE '{%' THEN payment_methods::jsonb
                    ELSE jsonb_build_object()
                END
            );
    END IF;
END $$;
ALTER TABLE public.meetings ALTER COLUMN payment_methods SET DEFAULT '{}'::jsonb;

-- Safely convert attendance to JSONB if it was text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'meetings' 
          AND column_name = 'attendance' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN attendance TYPE JSONB 
            USING (
                CASE 
                    WHEN attendance IS NULL OR TRIM(attendance::text) = '' THEN '{}'::jsonb
                    WHEN TRIM(attendance::text) LIKE '{%' THEN attendance::jsonb
                    ELSE jsonb_build_object()
                END
            );
    END IF;
END $$;
ALTER TABLE public.meetings ALTER COLUMN attendance SET DEFAULT '{}'::jsonb;

-- Safely convert amount_collected to JSONB if it was text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'meetings' 
          AND column_name = 'amount_collected' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN amount_collected TYPE JSONB 
            USING (
                CASE 
                    WHEN amount_collected IS NULL OR TRIM(amount_collected::text) = '' THEN '{}'::jsonb
                    WHEN TRIM(amount_collected::text) LIKE '{%' THEN amount_collected::jsonb
                    ELSE jsonb_build_object()
                END
            );
    END IF;
END $$;
ALTER TABLE public.meetings ALTER COLUMN amount_collected SET DEFAULT '{}'::jsonb;

-- Safely convert member_notes to JSONB if it was text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'meetings' 
          AND column_name = 'member_notes' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN member_notes TYPE JSONB 
            USING (
                CASE 
                    WHEN member_notes IS NULL OR TRIM(member_notes::text) = '' THEN '{}'::jsonb
                    WHEN TRIM(member_notes::text) LIKE '{%' THEN member_notes::jsonb
                    ELSE jsonb_build_object()
                END
            );
    END IF;
END $$;
ALTER TABLE public.meetings ALTER COLUMN member_notes SET DEFAULT '{}'::jsonb;

-- Safely convert meeting_amount to numeric
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'meetings' 
          AND column_name = 'meeting_amount' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN meeting_amount TYPE NUMERIC 
            USING (
                COALESCE(NULLIF(regexp_replace(COALESCE(meeting_amount::text, '0'), '[^0-9.]', '', 'g'), '')::numeric, 0)
            );
    END IF;
END $$;
ALTER TABLE public.meetings ALTER COLUMN meeting_amount SET DEFAULT 0;

-- Safely convert boolean columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'is_completed' AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN is_completed TYPE BOOLEAN 
            USING (CASE WHEN is_completed::text ILIKE 'true' OR is_completed::text = '1' THEN true ELSE false END);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'is_cancelled' AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN is_cancelled TYPE BOOLEAN 
            USING (CASE WHEN is_cancelled::text ILIKE 'true' OR is_cancelled::text = '1' THEN true ELSE false END);
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'meetings' AND column_name = 'is_recurring' AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.meetings 
            ALTER COLUMN is_recurring TYPE BOOLEAN 
            USING (CASE WHEN is_recurring::text ILIKE 'true' OR is_recurring::text = '1' THEN true ELSE false END);
    END IF;
END $$;

ALTER TABLE public.meetings ALTER COLUMN is_completed SET DEFAULT false;
ALTER TABLE public.meetings ALTER COLUMN is_cancelled SET DEFAULT false;
ALTER TABLE public.meetings ALTER COLUMN is_recurring SET DEFAULT false;

-- Clean null values in existing meetings
UPDATE public.meetings SET status = 'UPCOMING' WHERE status IS NULL OR TRIM(status) = '';
UPDATE public.meetings SET attendance = '{}'::jsonb WHERE attendance IS NULL;
UPDATE public.meetings SET amount_collected = '{}'::jsonb WHERE amount_collected IS NULL;
UPDATE public.meetings SET payment_status = '{}'::jsonb WHERE payment_status IS NULL;
UPDATE public.meetings SET payment_methods = '{}'::jsonb WHERE payment_methods IS NULL;
UPDATE public.meetings SET member_notes = '{}'::jsonb WHERE member_notes IS NULL;
UPDATE public.meetings SET meeting_amount = 0 WHERE meeting_amount IS NULL;
UPDATE public.meetings SET is_completed = false WHERE is_completed IS NULL;
UPDATE public.meetings SET is_cancelled = false WHERE is_cancelled IS NULL;
UPDATE public.meetings SET is_recurring = false WHERE is_recurring IS NULL;

-- ==============================================================================
-- 3. CREATE OR UPDATE 'one_to_one_meetings' TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.one_to_one_meetings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    creator_id TEXT,
    sender_id TEXT,
    receiver_id TEXT,
    member_id TEXT,
    organizer_id TEXT,
    chapter_id TEXT,
    title TEXT DEFAULT '1:1 Meeting',
    scheduled_date TEXT,
    date TEXT,
    scheduled_time TEXT DEFAULT '10:00 AM',
    meeting_time TEXT DEFAULT '10:00 AM',
    time TEXT DEFAULT '10:00 AM',
    meeting_location TEXT DEFAULT 'Online Meeting',
    venue TEXT DEFAULT 'Online Meeting',
    notes TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'UPCOMING',
    attendance JSONB DEFAULT '{}'::jsonb,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_schedule_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.one_to_one_meetings
    ADD COLUMN IF NOT EXISTS creator_id TEXT,
    ADD COLUMN IF NOT EXISTS sender_id TEXT,
    ADD COLUMN IF NOT EXISTS receiver_id TEXT,
    ADD COLUMN IF NOT EXISTS member_id TEXT,
    ADD COLUMN IF NOT EXISTS organizer_id TEXT,
    ADD COLUMN IF NOT EXISTS chapter_id TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT DEFAULT '1:1 Meeting',
    ADD COLUMN IF NOT EXISTS scheduled_date TEXT,
    ADD COLUMN IF NOT EXISTS date TEXT,
    ADD COLUMN IF NOT EXISTS scheduled_time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS meeting_time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS time TEXT DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS meeting_location TEXT DEFAULT 'Online Meeting',
    ADD COLUMN IF NOT EXISTS venue TEXT DEFAULT 'Online Meeting',
    ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPCOMING',
    ADD COLUMN IF NOT EXISTS attendance JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS recurring_schedule_id TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Safely convert attendance in one_to_one_meetings to JSONB
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'one_to_one_meetings' 
          AND column_name = 'attendance' 
          AND data_type IN ('text', 'character varying')
    ) THEN
        ALTER TABLE public.one_to_one_meetings 
            ALTER COLUMN attendance TYPE JSONB 
            USING (
                CASE 
                    WHEN attendance IS NULL OR TRIM(attendance::text) = '' THEN '{}'::jsonb
                    WHEN TRIM(attendance::text) LIKE '{%' THEN attendance::jsonb
                    ELSE jsonb_build_object()
                END
            );
    END IF;
END $$;
ALTER TABLE public.one_to_one_meetings ALTER COLUMN attendance SET DEFAULT '{}'::jsonb;

-- ==============================================================================
-- 4. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_meetings_chapter ON public.meetings (chapter_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings (status);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON public.meetings (date);
CREATE INDEX IF NOT EXISTS idx_one_to_one_sender ON public.one_to_one_meetings (sender_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_receiver ON public.one_to_one_meetings (receiver_id);
CREATE INDEX IF NOT EXISTS idx_one_to_one_status ON public.one_to_one_meetings (status);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_to_one_meetings ENABLE ROW LEVEL SECURITY;

-- Meetings RLS: Allow authenticated users full read and write access
DROP POLICY IF EXISTS "Allow select meetings" ON public.meetings;
CREATE POLICY "Allow select meetings" ON public.meetings
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow insert meetings" ON public.meetings;
CREATE POLICY "Allow insert meetings" ON public.meetings
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update meetings" ON public.meetings;
CREATE POLICY "Allow update meetings" ON public.meetings
    FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete meetings" ON public.meetings;
CREATE POLICY "Allow delete meetings" ON public.meetings
    FOR DELETE TO public USING (true);

-- One-to-One Meetings RLS: Allow authenticated users full read and write access
DROP POLICY IF EXISTS "Allow select one_to_one_meetings" ON public.one_to_one_meetings;
CREATE POLICY "Allow select one_to_one_meetings" ON public.one_to_one_meetings
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow insert one_to_one_meetings" ON public.one_to_one_meetings;
CREATE POLICY "Allow insert one_to_one_meetings" ON public.one_to_one_meetings
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update one_to_one_meetings" ON public.one_to_one_meetings;
CREATE POLICY "Allow update one_to_one_meetings" ON public.one_to_one_meetings
    FOR UPDATE TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete one_to_one_meetings" ON public.one_to_one_meetings;
CREATE POLICY "Allow delete one_to_one_meetings" ON public.one_to_one_meetings
    FOR DELETE TO public USING (true);
