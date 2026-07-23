console.log(`
-- SQL Script to update Supabase schema for Referrals, Meetings, and 1:1 Meetings

-- 1. Referrals Table (Create or Update)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID,
    receiver_id UUID,
    contact_name TEXT,
    contact_phone TEXT,
    requirement TEXT,
    business_requirement TEXT,
    status TEXT DEFAULT 'New',
    notes TEXT,
    not_converted_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns in case table already existed with different names
ALTER TABLE referrals 
ADD COLUMN IF NOT EXISTS sender_id UUID,
ADD COLUMN IF NOT EXISTS receiver_id UUID,
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS requirement TEXT,
ADD COLUMN IF NOT EXISTS business_requirement TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'New',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS not_converted_reason TEXT;

-- 2. Thank You Slips
CREATE TABLE IF NOT EXISTS thank_you_slips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID,
    receiver_id UUID,
    amount NUMERIC,
    business_type TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE thank_you_slips
ADD COLUMN IF NOT EXISTS sender_id UUID,
ADD COLUMN IF NOT EXISTS receiver_id UUID,
ADD COLUMN IF NOT EXISTS amount NUMERIC,
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS comments TEXT;

-- 3. Chapter Meetings (meetings)
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID,
    admin_id UUID,
    date DATE,
    time TEXT,
    venue TEXT,
    default_amount NUMERIC,
    attendance JSONB DEFAULT '{}'::jsonb,
    amount_collected JSONB DEFAULT '{}'::jsonb,
    member_notes JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'UPCOMING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS chapter_id UUID,
ADD COLUMN IF NOT EXISTS admin_id UUID,
ADD COLUMN IF NOT EXISTS date DATE,
ADD COLUMN IF NOT EXISTS time TEXT,
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS default_amount NUMERIC,
ADD COLUMN IF NOT EXISTS attendance JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS amount_collected JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS member_notes JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPCOMING';

-- 4. One-to-One Meetings
CREATE TABLE IF NOT EXISTS one_to_one_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    sender_id UUID,
    receiver_id UUID,
    date DATE,
    time TEXT,
    venue TEXT,
    location_type TEXT,
    notes TEXT,
    attendance JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'UPCOMING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE one_to_one_meetings
ADD COLUMN IF NOT EXISTS sender_id UUID,
ADD COLUMN IF NOT EXISTS receiver_id UUID,
ADD COLUMN IF NOT EXISTS venue TEXT,
ADD COLUMN IF NOT EXISTS location_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS attendance JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'UPCOMING';

-- 5. Guest Invitations
CREATE TABLE IF NOT EXISTS guest_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invited_by UUID,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    meeting_date DATE,
    status TEXT DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guest_invitations
ADD COLUMN IF NOT EXISTS invited_by UUID,
ADD COLUMN IF NOT EXISTS guest_name TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS meeting_date DATE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
`);
