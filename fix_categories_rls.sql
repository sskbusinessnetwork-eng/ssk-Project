-- =========================================================
-- SUPABASE RLS FIX FOR TABLE: categories
-- Run this script in the Supabase SQL Editor
-- =========================================================

-- 1. Ensure RLS is enabled on categories table
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies on categories to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for categories" ON public.categories;
DROP POLICY IF EXISTS "Enable select for categories" ON public.categories;
DROP POLICY IF EXISTS "Enable insert for categories" ON public.categories;
DROP POLICY IF EXISTS "Enable update for categories" ON public.categories;
DROP POLICY IF EXISTS "Enable delete for categories" ON public.categories;
DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;
DROP POLICY IF EXISTS "categories_select_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_update_policy" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON public.categories;

-- 3. Create SELECT policy (Allows reading categories)
CREATE POLICY "Enable select for categories"
ON public.categories
FOR SELECT
TO public
USING (true);

-- 4. Create INSERT policy (Allows adding categories)
CREATE POLICY "Enable insert for categories"
ON public.categories
FOR INSERT
TO public
WITH CHECK (true);

-- 5. Create UPDATE policy (Allows updating categories)
CREATE POLICY "Enable update for categories"
ON public.categories
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- 6. Create DELETE policy (Allows deleting categories)
CREATE POLICY "Enable delete for categories"
ON public.categories
FOR DELETE
TO public
USING (true);
