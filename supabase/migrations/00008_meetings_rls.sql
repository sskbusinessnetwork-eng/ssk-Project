-- Migration: Add RLS policies for `meetings` table

-- 1. Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies if any
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.meetings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.meetings;
DROP POLICY IF EXISTS "Enable update for admins and organizers" ON public.meetings;
DROP POLICY IF EXISTS "Enable delete for admins and organizers" ON public.meetings;

-- 3. Read Policy: All authenticated users can read meetings
CREATE POLICY "Enable read access for all authenticated users" 
ON public.meetings 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Insert Policy: Authenticated users can insert
CREATE POLICY "Enable insert for authenticated users only" 
ON public.meetings 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 5. Update Policy: Only Master Admins or the Chapter Admin associated with the meeting
CREATE POLICY "Enable update for admins and organizers" 
ON public.meetings 
FOR UPDATE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'MASTER_ADMIN')
    OR admin_id = auth.uid()
    OR chapter_id IN (SELECT chapter_id FROM public.users WHERE users.id = auth.uid() AND users.role = 'CHAPTER_ADMIN')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'MASTER_ADMIN')
    OR admin_id = auth.uid()
    OR chapter_id IN (SELECT chapter_id FROM public.users WHERE users.id = auth.uid() AND users.role = 'CHAPTER_ADMIN')
);

-- 6. Delete Policy: Only Master Admins or the Chapter Admin associated with the meeting
CREATE POLICY "Enable delete for admins and organizers" 
ON public.meetings 
FOR DELETE 
TO authenticated 
USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'MASTER_ADMIN')
    OR admin_id = auth.uid()
    OR chapter_id IN (SELECT chapter_id FROM public.users WHERE users.id = auth.uid() AND users.role = 'CHAPTER_ADMIN')
);
