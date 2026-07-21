-- Create the subscription_requests table
CREATE TABLE IF NOT EXISTS subscription_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID REFERENCES users(id),
  chapter_id UUID REFERENCES chapters(id),
  chapter_admin_id UUID REFERENCES users(id),
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_subscription_end_date DATE,
  status TEXT DEFAULT 'PENDING',
  processed_date TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id)
);

-- Note: In Supabase, you might also want to set RLS policies if row level security is enabled on these tables.
