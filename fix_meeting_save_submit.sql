-- ==============================================================================
-- SSK BUSINESS NETWORK - COMPLETE MEETING SCHEMA & RLS FIX FOR SUPABASE
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create or Update the 'meetings' Table
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

-- 3. Add any missing columns to existing 'meetings' table (idempotent)
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

-- 4. Ensure guest_invitations table has attendance tracking columns
CREATE TABLE IF NOT EXISTS public.guest_invitations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    guest_name TEXT,
    mobile TEXT,
    company_name TEXT,
    invited_by TEXT,
    chapter_id TEXT,
    meeting_date TEXT,
    meeting_time TEXT,
    status TEXT DEFAULT 'Invited',
    attendance_status TEXT DEFAULT 'Pending',
    attendance_updated_by TEXT,
    attendance_updated_by_name TEXT,
    attendance_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.guest_invitations
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Invited',
    ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS attendance_updated_by TEXT,
    ADD COLUMN IF NOT EXISTS attendance_updated_by_name TEXT,
    ADD COLUMN IF NOT EXISTS attendance_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Create Performance Indexes for fast meeting and attendance queries
CREATE INDEX IF NOT EXISTS idx_meetings_chapter_date ON public.meetings (chapter_id, date);
CREATE INDEX IF NOT EXISTS idx_meetings_admin_date ON public.meetings (admin_id, date);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON public.meetings (status);
CREATE INDEX IF NOT EXISTS idx_guest_invitations_chapter ON public.guest_invitations (chapter_id);

-- 6. Configure Row Level Security (RLS) to allow read, insert, and update operations
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_invitations ENABLE ROW LEVEL SECURITY;

-- Clean up existing conflicting policies
DROP POLICY IF EXISTS "Enable all access for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable select for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable insert for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable update for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable delete for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Meetings Select Policy" ON public.meetings;
DROP POLICY IF EXISTS "Meetings Insert Policy" ON public.meetings;
DROP POLICY IF EXISTS "Meetings Update Policy" ON public.meetings;

-- Create open RLS policies for meetings table
CREATE POLICY "Enable select for meetings"
ON public.meetings FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for meetings"
ON public.meetings FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable update for meetings"
ON public.meetings FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for meetings"
ON public.meetings FOR DELETE TO public USING (true);

-- Clean up & create open policies for guest invitations
DROP POLICY IF EXISTS "Enable all for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable select for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable insert for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable update for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable delete for guest_invitations" ON public.guest_invitations;

CREATE POLICY "Enable select for guest_invitations"
ON public.guest_invitations FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for guest_invitations"
ON public.guest_invitations FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable update for guest_invitations"
ON public.guest_invitations FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for guest_invitations"
ON public.guest_invitations FOR DELETE TO public USING (true);

-- 7. Verify the updated schema
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'meetings'
ORDER BY ordinal_position;
