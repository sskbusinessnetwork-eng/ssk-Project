-- =========================================================
-- SUPABASE RLS FIX FOR TABLE: guest_invitations
-- Run this script in the Supabase SQL Editor
-- =========================================================

-- 1. Ensure RLS is enabled on guest_invitations
ALTER TABLE public.guest_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on guest_invitations to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all users" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable read access for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable insert for chapter admins only" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable insert for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_insert_policy" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_select_policy" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_update_policy" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_delete_policy" ON public.guest_invitations;
DROP POLICY IF EXISTS "Allow all access to guest_invitations" ON public.guest_invitations;

-- 3. Create SELECT policy (Allows reading guest invitations)
CREATE POLICY "Enable select for guest_invitations"
ON public.guest_invitations
FOR SELECT
TO public
USING (true);

-- 4. Create INSERT policy (Allows inserting guest invitations)
CREATE POLICY "Enable insert for guest_invitations"
ON public.guest_invitations
FOR INSERT
TO public
WITH CHECK (true);

-- 5. Create UPDATE policy (Allows updating guest invitations)
CREATE POLICY "Enable update for guest_invitations"
ON public.guest_invitations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 6. Create DELETE policy (Allows deleting guest invitations)
CREATE POLICY "Enable delete for guest_invitations"
ON public.guest_invitations
FOR DELETE
TO public
USING (true);
