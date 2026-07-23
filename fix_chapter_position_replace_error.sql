-- ============================================================================
-- FIX FOR: "function replace(chapter_position, unknown, unknown) does not exist"
-- ============================================================================
-- Explanation:
-- In PostgreSQL, `chapter_position` is a custom ENUM type.
-- Calling the string function `replace()` directly on a `chapter_position` column
-- or variable throws an error because PostgreSQL does not implicitly cast ENUMs to text.
-- To fix this, any function, trigger, or query that uses `replace()` on `chapter_position`
-- MUST explicitly cast the value to text first using `::text`.
-- Example: replace(NEW.position::text, '_', ' ')
-- ============================================================================

-- 1. Drop existing/legacy trigger functions that attempt to call replace() on chapter_position
DROP TRIGGER IF EXISTS position_validation_trigger ON public.users;
DROP TRIGGER IF EXISTS enforce_single_position_trigger ON public.users;
DROP TRIGGER IF EXISTS chapter_position_validation_trigger ON public.users;

DROP FUNCTION IF EXISTS public.enforce_single_position_per_chapter();
DROP FUNCTION IF EXISTS public.validate_chapter_position();
DROP FUNCTION IF EXISTS public.format_chapter_position(public.chapter_position);

-- 2. Helper function to format chapter_position safely with explicit ::text cast
CREATE OR REPLACE FUNCTION public.format_chapter_position(pos public.chapter_position)
RETURNS text AS $$
BEGIN
    IF pos IS NULL THEN
        RETURN '';
    END IF;
    -- Explicitly cast ENUM to text before applying replace()
    RETURN replace(pos::text, '_', ' ');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Chapter-Wise Position Uniqueness Validation Function
-- Ensures leadership positions (chapter_admin, president, vice_president, treasurer, etc.)
-- are unique WITHIN A SINGLE CHAPTER.
-- "member" can be assigned to multiple users per chapter.
-- Different chapters CAN have the same leadership positions.
CREATE OR REPLACE FUNCTION public.enforce_single_position_per_chapter()
RETURNS TRIGGER AS $$
DECLARE
    pos_str text;
BEGIN
    IF NEW.position IS NOT NULL THEN
        -- Explicitly cast the ENUM type NEW.position to text before calling replace()
        pos_str := lower(replace(NEW.position::text, '_', ' '));

        -- Only enforce single position for leadership roles (excluding 'member') within the SAME chapter
        IF pos_str NOT IN ('member', '') AND NEW.chapter_id IS NOT NULL THEN
            -- Reassign any existing holder of this leadership position in the SAME chapter to 'member'
            UPDATE public.users 
            SET position = 'member'::public.chapter_position 
            WHERE chapter_id = NEW.chapter_id 
              AND id != NEW.id
              AND lower(replace(position::text, '_', ' ')) = pos_str;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger to users table
CREATE TRIGGER position_validation_trigger
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.enforce_single_position_per_chapter();
