-- ==================================================
-- FIX GUEST INVITATIONS RLS POLICY (WITH EXPLICIT TYPE CASTS)
-- ==================================================

-- 1. Ensure RLS is enabled on guest_invitations
ALTER TABLE public.guest_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Ensure necessary columns exist on guest_invitations
ALTER TABLE public.guest_invitations ADD COLUMN IF NOT EXISTS chapter_id TEXT;
ALTER TABLE public.guest_invitations ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.guest_invitations ADD COLUMN IF NOT EXISTS meeting_id TEXT;

-- 3. Drop existing policies on guest_invitations
DROP POLICY IF EXISTS "Enable read access for all users" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable read access for guest_invitations" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.guest_invitations;
DROP POLICY IF EXISTS "Enable insert for chapter admins only" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_insert_policy" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_select_policy" ON public.guest_invitations;
DROP POLICY IF EXISTS "guest_invitations_update_policy" ON public.guest_invitations;

-- 4. SELECT Policy: All authenticated/authorized users can read guest invitations
CREATE POLICY "guest_invitations_select_policy"
ON public.guest_invitations
FOR SELECT
USING (true);

-- 5. INSERT Policy: ONLY Chapter Admin for a meeting belonging to THEIR OWN chapter
CREATE POLICY "guest_invitations_insert_policy"
ON public.guest_invitations
FOR INSERT
WITH CHECK (
    -- Condition A: The logged-in user is a Chapter Admin (role = 'CHAPTER_ADMIN' or position = 'chapter_admin')
    -- AND the selected meeting belongs to that Chapter Admin's chapter
    -- AND invited_by is set to the Chapter Admin's ID
    (
        EXISTS (
            SELECT 1 
            FROM public.users u
            JOIN public.meetings m ON m.chapter_id::text = u.chapter_id::text
            WHERE u.id::text = auth.uid()::text
              AND (u.role = 'CHAPTER_ADMIN' OR u.position = 'chapter_admin')
              AND (u.status IS NULL OR u.status = 'ACTIVE')
              AND m.id::text = guest_invitations.meeting_id::text
        )
        AND invited_by::text = auth.uid()::text
    )
    OR
    -- Condition B: Master Admin bypass
    EXISTS (
        SELECT 1 
        FROM public.users u
        WHERE u.id::text = auth.uid()::text
          AND u.role = 'MASTER_ADMIN'
    )
);

-- 6. UPDATE Policy: Chapter Admin can update guest invitations for meetings belonging to their own chapter
CREATE POLICY "guest_invitations_update_policy"
ON public.guest_invitations
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 
        FROM public.users u
        JOIN public.meetings m ON m.chapter_id::text = u.chapter_id::text
        WHERE u.id::text = auth.uid()::text
          AND (u.role = 'CHAPTER_ADMIN' OR u.position = 'chapter_admin')
          AND m.id::text = guest_invitations.meeting_id::text
    )
    OR EXISTS (
        SELECT 1 
        FROM public.users u
        WHERE u.id::text = auth.uid()::text
          AND u.role = 'MASTER_ADMIN'
    )
);
