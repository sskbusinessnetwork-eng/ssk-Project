-- Update one_to_one_meetings table to include specific columns
ALTER TABLE public.one_to_one_meetings
ADD COLUMN IF NOT EXISTS organizer_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.one_to_one_meetings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Master admins can see all one_to_one_meetings" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Chapter admins can see one_to_one_meetings in their chapter" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Users can see meetings they organize or are invited to" ON public.one_to_one_meetings;
DROP POLICY IF EXISTS "Users can access their own one_to_one_meetings" ON public.one_to_one_meetings;

-- Policy 1: Master Admin sees all
CREATE POLICY "Master admins can see all one_to_one_meetings" ON public.one_to_one_meetings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'MASTER_ADMIN'
  )
);

-- Policy 2: Chapter Admin sees all in their chapter
CREATE POLICY "Chapter admins can see one_to_one_meetings in their chapter" ON public.one_to_one_meetings
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'CHAPTER_ADMIN' AND users.chapter_id = one_to_one_meetings.chapter_id
  )
);

-- Policy 3: Users can view, insert, update if they are the organizer or member
CREATE POLICY "Users can access their own one_to_one_meetings" ON public.one_to_one_meetings
FOR ALL TO authenticated
USING (
  auth.uid() = organizer_id OR auth.uid() = member_id
)
WITH CHECK (
  auth.uid() = organizer_id OR auth.uid() = member_id
);

