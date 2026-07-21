CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  requirement TEXT NOT NULL,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  notes TEXT
);

-- Note: The previous schema might have been slightly different or named fromUserId etc. 
-- We'll add these columns if they are missing
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_mobile TEXT,
ADD COLUMN IF NOT EXISTS requirement TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.referrals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.referrals;
DROP POLICY IF EXISTS "Users can read own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals" ON public.referrals;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read referrals" ON public.referrals
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can create referrals" ON public.referrals
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own referrals" ON public.referrals
FOR UPDATE TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
