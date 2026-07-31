-- =========================================================
-- SUPABASE RLS FIX FOR TABLE: thank_you_slips
-- Run this script in the Supabase SQL Editor if RLS blocks inserts
-- =========================================================

ALTER TABLE public.thank_you_slips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable select for thank_you_slips" ON public.thank_you_slips;
DROP POLICY IF EXISTS "Enable insert for thank_you_slips" ON public.thank_you_slips;
DROP POLICY IF EXISTS "Enable update for thank_you_slips" ON public.thank_you_slips;
DROP POLICY IF EXISTS "Enable delete for thank_you_slips" ON public.thank_you_slips;

CREATE POLICY "Enable select for thank_you_slips"
ON public.thank_you_slips FOR SELECT TO public USING (true);

CREATE POLICY "Enable insert for thank_you_slips"
ON public.thank_you_slips FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Enable update for thank_you_slips"
ON public.thank_you_slips FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for thank_you_slips"
ON public.thank_you_slips FOR DELETE TO public USING (true);
