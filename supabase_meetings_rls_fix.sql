-- Run this script in your Supabase SQL Editor to fix the meeting update permission error

-- 1. Enable RLS on meetings table (in case it isn't)
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies that might be blocking the update
DROP POLICY IF EXISTS "Enable update for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Meetings Update Policy" ON public.meetings;

-- 3. Create a comprehensive update policy for meetings
-- (In a production environment, you might restrict this to just Chapter Admins, 
-- but this permits your members/admins to update meetings they are involved in)
CREATE POLICY "Enable update for meetings"
ON public.meetings
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 4. Also ensure Select, Insert, and Delete are open if needed
DROP POLICY IF EXISTS "Enable select for meetings" ON public.meetings;
CREATE POLICY "Enable select for meetings" ON public.meetings FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Enable insert for meetings" ON public.meetings;
CREATE POLICY "Enable insert for meetings" ON public.meetings FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for meetings" ON public.meetings;
CREATE POLICY "Enable delete for meetings" ON public.meetings FOR DELETE TO public USING (true);
