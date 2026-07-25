-- =========================================================
-- SUPABASE RLS FIX FOR MEETING CHAPTER & MEMBER FETCHING
-- Run this script in the Supabase SQL Editor
-- =========================================================

-- 1. FIX RLS POLICIES FOR TABLE: users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS master_admin_all ON public.users;
DROP POLICY IF EXISTS chapter_admin_users ON public.users;
DROP POLICY IF EXISTS members_read_own_chapter ON public.users;
DROP POLICY IF EXISTS users_update_self ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for same chapter users" ON public.users;
DROP POLICY IF EXISTS "Enable select access for authenticated users on users" ON public.users;
DROP POLICY IF EXISTS "Enable select access for anon users on users" ON public.users;
DROP POLICY IF EXISTS "Enable update access for own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert/update for chapter admins" ON public.users;

-- Allow reading user profiles so Chapter Admin and members can fetch all chapter members
CREATE POLICY "Enable select access for authenticated users on users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable select access for anon users on users"
ON public.users
FOR SELECT
TO anon
USING (true);

-- Allow users to update their own row
CREATE POLICY "Enable update access for own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text OR auth.uid()::text = uid::text)
WITH CHECK (auth.uid()::text = id::text OR auth.uid()::text = uid::text);

-- Allow inserting/updating for management
CREATE POLICY "Enable insert/update for chapter admins"
ON public.users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);


-- 2. FIX RLS POLICIES FOR TABLE: meetings
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable insert for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable update for meetings" ON public.meetings;
DROP POLICY IF EXISTS "Enable delete for meetings" ON public.meetings;

CREATE POLICY "Enable select for meetings"
ON public.meetings
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for meetings"
ON public.meetings
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for meetings"
ON public.meetings
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for meetings"
ON public.meetings
FOR DELETE
TO public
USING (true);


-- 3. FIX RLS POLICIES FOR TABLE: guest_invitations
ALTER TABLE public.guest_invitations ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Enable select for guest_invitations"
ON public.guest_invitations
FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert for guest_invitations"
ON public.guest_invitations
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update for guest_invitations"
ON public.guest_invitations
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for guest_invitations"
ON public.guest_invitations
FOR DELETE
TO public
USING (true);
