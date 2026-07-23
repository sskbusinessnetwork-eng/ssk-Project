-- ============================================================================
-- COMPLETE FIX FOR SUPABASE: "function replace(chapter_position, unknown, unknown) does not exist"
-- ============================================================================
-- Execute this entire script in your Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql/new
-- ============================================================================

-- 0. Ensure all chapter_position ENUM values exist in public schema
DO $$
BEGIN
    ALTER TYPE public.chapter_position ADD VALUE IF NOT EXISTS 'chapter_admin';
    ALTER TYPE public.chapter_position ADD VALUE IF NOT EXISTS 'president';
    ALTER TYPE public.chapter_position ADD VALUE IF NOT EXISTS 'vice_president';
    ALTER TYPE public.chapter_position ADD VALUE IF NOT EXISTS 'treasurer';
    ALTER TYPE public.chapter_position ADD VALUE IF NOT EXISTS 'secretary';
    ALTER TYPE public.chapter_position ADD VALUE IF NOT EXISTS 'member';
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 1. Create an overloaded replace() function specifically for the chapter_position ENUM.
--    This guarantees that ANY existing or custom trigger/function in Supabase calling
--    replace(chapter_position, '_', ' ') will match this signature and execute cleanly!
CREATE OR REPLACE FUNCTION public.replace(
    pos public.chapter_position, 
    from_str text, 
    to_str text
)
RETURNS text AS $$
BEGIN
    IF pos IS NULL THEN
        RETURN '';
    END IF;
    RETURN pg_catalog.replace(pos::text, from_str, to_str);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Drop existing triggers & trigger functions that fail on un-cast ENUM replace()
DROP TRIGGER IF EXISTS position_validation_trigger ON public.users;
DROP TRIGGER IF EXISTS enforce_single_position_trigger ON public.users;
DROP TRIGGER IF EXISTS chapter_position_validation_trigger ON public.users;
DROP TRIGGER IF EXISTS on_user_position_change ON public.users;

DROP FUNCTION IF EXISTS public.enforce_single_position_per_chapter();
DROP FUNCTION IF EXISTS public.validate_chapter_position();
DROP FUNCTION IF EXISTS public.format_chapter_position(public.chapter_position);

-- 3. Re-create format_chapter_position safely with explicit ::text cast
CREATE OR REPLACE FUNCTION public.format_chapter_position(pos public.chapter_position)
RETURNS text AS $$
BEGIN
    IF pos IS NULL THEN
        RETURN '';
    END IF;
    RETURN pg_catalog.replace(pos::text, '_', ' ');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Re-create chapter position uniqueness trigger with explicit ::text cast
CREATE OR REPLACE FUNCTION public.enforce_single_position_per_chapter()
RETURNS TRIGGER AS $$
DECLARE
    pos_str text;
BEGIN
    IF NEW.position IS NOT NULL THEN
        pos_str := lower(pg_catalog.replace(NEW.position::text, '_', ' '));

        IF pos_str NOT IN ('member', '') AND NEW.chapter_id IS NOT NULL THEN
            UPDATE public.users 
            SET position = 'member'::public.chapter_position 
            WHERE chapter_id = NEW.chapter_id 
              AND id != NEW.id
              AND lower(pg_catalog.replace(position::text, '_', ' ')) = pos_str;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach the corrected trigger to users table
CREATE TRIGGER position_validation_trigger
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_position_per_chapter();
