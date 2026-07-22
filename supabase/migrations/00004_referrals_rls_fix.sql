-- Migration 00004: Fix Referrals Row Level Security (RLS) Policies

-- Ensure referrals table exists with correct schema
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  requirement TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

-- Ensure all required columns exist
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_mobile TEXT,
ADD COLUMN IF NOT EXISTS requirement TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop all legacy and conflicting RLS policies
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.referrals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.referrals;
DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can read referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can update own referrals" ON public.referrals;
DROP POLICY IF EXISTS "referrals_select_policy" ON public.referrals;
DROP POLICY IF EXISTS "referrals_insert_policy" ON public.referrals;
DROP POLICY IF EXISTS "referrals_update_policy" ON public.referrals;

-- Enable Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy
CREATE POLICY "referrals_select_policy" ON public.referrals
FOR SELECT
TO public, anon, authenticated
USING (true);

-- 2. INSERT Policy
CREATE POLICY "referrals_insert_policy" ON public.referrals
FOR INSERT
TO public, anon, authenticated
WITH CHECK (
  sender_id IS NOT NULL 
  AND receiver_id IS NOT NULL 
  AND chapter_id IS NOT NULL
  AND customer_name IS NOT NULL
  AND customer_mobile IS NOT NULL
  AND requirement IS NOT NULL
);

-- 3. UPDATE Policy
CREATE POLICY "referrals_update_policy" ON public.referrals
FOR UPDATE
TO public, anon, authenticated
USING (true)
WITH CHECK (true);
