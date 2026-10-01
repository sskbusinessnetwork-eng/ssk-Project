-- ============================================================================
-- SUPABASE SQL: Future Presentation Table, Auto-Status Functions & RLS Policies
-- Copy and run this entire script in your Supabase SQL Editor
-- ============================================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create `future_presentations` table if it does not exist
CREATE TABLE IF NOT EXISTS public.future_presentations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_name VARCHAR(255),
    presentation_date DATE NOT NULL,
    presentation_details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Upcoming',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Ensure all columns & updated status CHECK constraint exist
ALTER TABLE public.future_presentations
    ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS member_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS presentation_details TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.future_presentations
    DROP CONSTRAINT IF EXISTS future_presentations_status_check;

ALTER TABLE public.future_presentations
    ADD CONSTRAINT future_presentations_status_check
    CHECK (
        status IN (
            'Upcoming', 'Pending', 'Completed', 'Absent', 'Scheduled', 'Cancelled',
            'UPCOMING', 'PENDING', 'COMPLETED', 'ABSENT', 'SCHEDULED', 'CANCELLED'
        )
    );

-- 4. Prevent duplicate active presentations for the same member on the same date
DROP INDEX IF EXISTS public.idx_unique_member_presentation_date;
CREATE UNIQUE INDEX idx_unique_member_presentation_date
ON public.future_presentations (member_id, presentation_date)
WHERE UPPER(status::TEXT) != 'CANCELLED';

-- 5. Indexes for fast chronological sorting and meeting date lookups
CREATE INDEX IF NOT EXISTS idx_future_presentations_date_asc
ON public.future_presentations (presentation_date ASC);

CREATE INDEX IF NOT EXISTS idx_future_presentations_chapter_id
ON public.future_presentations (chapter_id);

CREATE INDEX IF NOT EXISTS idx_future_presentations_member_id
ON public.future_presentations (member_id);

-- 6. Function & Trigger: Auto-populate `member_name`, `chapter_id`, and `status` on Insert/Update
-- Uses strict ::TEXT casting inside COALESCE so text and boolean columns never conflict (Fixes 42804)
CREATE OR REPLACE FUNCTION public.handle_future_presentation_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_name TEXT;
    v_user_chapter UUID;
    v_meeting RECORD;
    v_member_attendance TEXT;
    v_today_ist DATE;
BEGIN
    NEW.updated_at := NOW();

    -- Resolve member_name and chapter_id from users table if not provided
    SELECT u.name, u.chapter_id
    INTO v_user_name, v_user_chapter
    FROM public.users u
    WHERE u.id = NEW.member_id
    LIMIT 1;

    IF NEW.member_name IS NULL OR BTRIM(NEW.member_name) = '' THEN
        NEW.member_name := v_user_name;
    END IF;

    IF NEW.chapter_id IS NULL THEN
        NEW.chapter_id := v_user_chapter;
    END IF;

    -- Current date in IST (Asia/Kolkata)
    v_today_ist := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- Look for a matching non-cancelled meeting on the same date for this chapter
    SELECT m.*
    INTO v_meeting
    FROM public.meetings m
    WHERE BTRIM(COALESCE(m.date::TEXT, '')) = BTRIM(COALESCE(NEW.presentation_date::TEXT, ''))
      AND UPPER(COALESCE(m.status::TEXT, '')) NOT IN ('CANCELLED', 'CANCELED')
      AND (NEW.chapter_id IS NULL OR m.chapter_id IS NULL OR m.chapter_id = NEW.chapter_id)
    ORDER BY m.created_at DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
        -- Check member attendance in the meeting JSONB `attendance` map
        v_member_attendance := UPPER(COALESCE(v_meeting.attendance ->> NEW.member_id::TEXT, ''));

        IF v_member_attendance IN ('ABSENT', 'NO') THEN
            NEW.status := 'Absent';
        ELSIF LOWER(COALESCE(v_meeting.is_completed::TEXT, 'false')) IN ('true', 't', '1', 'yes')
              OR UPPER(COALESCE(v_meeting.status::TEXT, '')) IN ('COMPLETED', 'DONE') THEN
            NEW.status := 'Completed';
        ELSIF NEW.presentation_date < v_today_ist
              OR UPPER(COALESCE(v_meeting.status::TEXT, '')) = 'PENDING' THEN
            NEW.status := 'Pending';
        ELSE
            NEW.status := 'Upcoming';
        END IF;
    ELSE
        -- No meeting row yet on that date: check if presentation date has passed
        IF UPPER(COALESCE(NEW.status::TEXT, '')) NOT IN ('COMPLETED', 'ABSENT', 'CANCELLED') THEN
            IF NEW.presentation_date < v_today_ist THEN
                NEW.status := 'Pending';
            ELSE
                NEW.status := 'Upcoming';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_future_presentations_before_write ON public.future_presentations;
CREATE TRIGGER trg_future_presentations_before_write
BEFORE INSERT OR UPDATE ON public.future_presentations
FOR EACH ROW
EXECUTE FUNCTION public.handle_future_presentation_before_write();

-- 7. Function & Trigger: Auto-sync `future_presentations` when a Meeting is created or updated
-- Uses strict ::TEXT casting inside COALESCE so text and boolean columns never conflict (Fixes 42804)
CREATE OR REPLACE FUNCTION public.sync_future_presentations_on_meeting_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_today_ist DATE;
BEGIN
    v_today_ist := (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE;

    -- Update all matching presentations on the meeting's date
    UPDATE public.future_presentations fp
    SET
        status = CASE
            WHEN UPPER(COALESCE(NEW.attendance ->> fp.member_id::TEXT, '')) IN ('ABSENT', 'NO')
                THEN 'Absent'
            WHEN LOWER(COALESCE(NEW.is_completed::TEXT, 'false')) IN ('true', 't', '1', 'yes')
                 OR UPPER(COALESCE(NEW.status::TEXT, '')) IN ('COMPLETED', 'DONE')
                THEN 'Completed'
            WHEN fp.presentation_date < v_today_ist
                 OR UPPER(COALESCE(NEW.status::TEXT, '')) = 'PENDING'
                THEN 'Pending'
            ELSE 'Upcoming'
        END,
        updated_at = NOW()
    WHERE BTRIM(COALESCE(fp.presentation_date::TEXT, '')) = BTRIM(COALESCE(NEW.date::TEXT, ''))
      AND (fp.chapter_id IS NULL OR NEW.chapter_id IS NULL OR fp.chapter_id = NEW.chapter_id)
      AND UPPER(COALESCE(fp.status::TEXT, '')) != 'CANCELLED';

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_future_presentations_on_meeting ON public.meetings;
CREATE TRIGGER trg_sync_future_presentations_on_meeting
AFTER INSERT OR UPDATE ON public.meetings
FOR EACH ROW
EXECUTE FUNCTION public.sync_future_presentations_on_meeting_change();

-- 8. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.future_presentations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for chapter members and admins" ON public.future_presentations;
DROP POLICY IF EXISTS "Enable insert for authorized leadership roles" ON public.future_presentations;
DROP POLICY IF EXISTS "Enable update for authorized leadership roles" ON public.future_presentations;
DROP POLICY IF EXISTS "Enable delete for authorized leadership roles" ON public.future_presentations;

-- Read Policy: All authenticated users can read presentations for their chapter
CREATE POLICY "Enable read access for chapter members and admins"
ON public.future_presentations
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.uid::TEXT = auth.uid()::TEXT)
          AND (
              u.role = 'MASTER_ADMIN'
              OR u.chapter_id = future_presentations.chapter_id
              OR future_presentations.chapter_id IS NULL
          )
    )
);

-- Insert Policy: Admin, President, Vice President, Treasurer
CREATE POLICY "Enable insert for authorized leadership roles"
ON public.future_presentations
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.uid::TEXT = auth.uid()::TEXT)
          AND (
              u.role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')
              OR LOWER(COALESCE(u.position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
              OR LOWER(COALESCE(u.chapter_position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
          )
    )
);

-- Update Policy: Admin, President, Vice President, Treasurer
CREATE POLICY "Enable update for authorized leadership roles"
ON public.future_presentations
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.uid::TEXT = auth.uid()::TEXT)
          AND (
              u.role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')
              OR LOWER(COALESCE(u.position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
              OR LOWER(COALESCE(u.chapter_position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
          )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.uid::TEXT = auth.uid()::TEXT)
          AND (
              u.role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')
              OR LOWER(COALESCE(u.position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
              OR LOWER(COALESCE(u.chapter_position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
          )
    )
);

-- Delete Policy: Admin, President, Vice President, Treasurer
CREATE POLICY "Enable delete for authorized leadership roles"
ON public.future_presentations
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = auth.uid() OR u.uid::TEXT = auth.uid()::TEXT)
          AND (
              u.role IN ('MASTER_ADMIN', 'CHAPTER_ADMIN')
              OR LOWER(COALESCE(u.position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
              OR LOWER(COALESCE(u.chapter_position::TEXT, '')) IN ('chapter_admin', 'chapter admin', 'president', 'vice_president', 'vice president', 'treasurer')
          )
    )
);

-- 9. Grant permissions & reload PostgREST schema cache
GRANT ALL ON public.future_presentations TO authenticated;
GRANT ALL ON public.future_presentations TO service_role;

NOTIFY pgrst, 'reload schema';
