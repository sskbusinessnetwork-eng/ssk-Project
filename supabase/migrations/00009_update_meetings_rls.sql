-- Update Read Policy for meetings
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.meetings;

CREATE POLICY "Enable read access for meetings" ON public.meetings FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'MASTER_ADMIN')
    OR chapter_id IN (SELECT chapter_id FROM public.users WHERE users.id = auth.uid())
);
