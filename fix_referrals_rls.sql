-- =========================================================
-- SUPABASE RLS FIX FOR TABLE: referrals
-- Run this script in the Supabase SQL Editor if RLS blocks inserts
-- =========================================================

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for referrals" ON public.referrals;
DROP POLICY IF EXISTS "Enable insert for referrals" ON public.referrals;
DROP POLICY IF EXISTS "Enable update for referrals" ON public.referrals;
DROP POLICY IF EXISTS "Enable delete for referrals" ON public.referrals;

CREATE POLICY "Enable select for referrals"
ON public.referrals FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for referrals"
ON public.referrals FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable update for referrals"
ON public.referrals FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for referrals"
ON public.referrals FOR DELETE TO public USING (true);
