-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE user_role AS ENUM ('MASTER_ADMIN', 'CHAPTER_ADMIN', 'MEMBER');
CREATE TYPE chapter_position AS ENUM ('member', 'chapter_admin', 'president', 'vice_president', 'treasurer');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');
CREATE TYPE meeting_status AS ENUM ('UPCOMING', 'COMPLETED', 'NOT_COMPLETED');
CREATE TYPE testimonial_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- 1. Chapters Table
CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_name VARCHAR(255) UNIQUE NOT NULL,
    meeting_venue TEXT,
    chapter_admin_id UUID, -- Will be linked later after users table
    president_id UUID,
    vice_president_id UUID,
    treasurer_id UUID,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table (Profiles linked to auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    category VARCHAR(255),
    chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    role user_role DEFAULT 'MEMBER',
    position chapter_position DEFAULT 'member',
    status user_status DEFAULT 'ACTIVE',
    must_change_password BOOLEAN DEFAULT TRUE,
    password_changed BOOLEAN DEFAULT FALSE,
    profile_photo TEXT,
    business_name VARCHAR(255),
    profession_designation VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    bio TEXT,
    website VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alter chapters to add foreign keys for users
ALTER TABLE chapters ADD CONSTRAINT fk_chapter_admin FOREIGN KEY (chapter_admin_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE chapters ADD CONSTRAINT fk_president FOREIGN KEY (president_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE chapters ADD CONSTRAINT fk_vice_president FOREIGN KEY (vice_president_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE chapters ADD CONSTRAINT fk_treasurer FOREIGN KEY (treasurer_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. One-to-One Meetings Table
CREATE TABLE one_to_one_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME,
    duration INT, -- in minutes
    meeting_link TEXT,
    description TEXT,
    status meeting_status DEFAULT 'UPCOMING',
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting Participants
CREATE TABLE meeting_participants (
    meeting_id UUID REFERENCES one_to_one_meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    attendance_status VARCHAR(50) DEFAULT 'PENDING',
    PRIMARY KEY (meeting_id, user_id)
);

-- 4. Testimonials Table
CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    testimonial TEXT NOT NULL,
    status testimonial_status DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Assessments Table
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    score INT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Activity Logs Table
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- TRIGGERS & FUNCTIONS
-- ==========================================

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chapters_updated_at BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON one_to_one_meetings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Helper function to format chapter_position safely with explicit ::text cast
CREATE OR REPLACE FUNCTION format_chapter_position(pos chapter_position)
RETURNS text AS $$
BEGIN
    IF pos IS NULL THEN
        RETURN '';
    END IF;
    RETURN replace(pos::text, '_', ' ');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger for position validation (1 per chapter)
CREATE OR REPLACE FUNCTION enforce_single_position_per_chapter()
RETURNS TRIGGER AS $$
DECLARE
    pos_str text;
BEGIN
    IF NEW.position IS NOT NULL THEN
        pos_str := lower(replace(NEW.position::text, '_', ' '));

        IF pos_str NOT IN ('member', '') AND NEW.chapter_id IS NOT NULL THEN
            UPDATE users 
            SET position = 'member'::chapter_position 
            WHERE chapter_id = NEW.chapter_id 
              AND id != NEW.id
              AND lower(replace(position::text, '_', ' ')) = pos_str;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER position_validation_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION enforce_single_position_per_chapter();

-- Trigger to automatically create auth user and profile for Master Admin
-- Insert Master Admin into auth.users and public.users
DO $$
DECLARE
    master_admin_id UUID := gen_random_uuid();
BEGIN
    -- Only insert if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = '8884449689') THEN
        INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, phone, email_confirmed_at, phone_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
        VALUES (
            master_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'sskbusinessnetwork@gmail.com',
            crypt('Welcome@123', gen_salt('bf')),
            '8884449689',
            NOW(),
            NOW(),
            NOW(),
            NOW(),
            '', '', '', ''
        );

        INSERT INTO public.users (id, phone, name, role, status, must_change_password)
        VALUES (
            master_admin_id,
            '8884449689',
            'Master Admin',
            'MASTER_ADMIN',
            'ACTIVE',
            FALSE
        );
    END IF;
END $$;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE one_to_one_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Master Admin full access policy
CREATE POLICY master_admin_all ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'MASTER_ADMIN')
);

CREATE POLICY chapter_admin_users ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'CHAPTER_ADMIN' AND u.chapter_id = users.chapter_id)
);

CREATE POLICY members_read_own_chapter ON users FOR SELECT USING (
    chapter_id IN (SELECT chapter_id FROM users WHERE id = auth.uid()) OR id = auth.uid()
);

-- Users can update themselves
CREATE POLICY users_update_self ON users FOR UPDATE USING (id = auth.uid());

-- Chapters
CREATE POLICY chapters_read_all ON chapters FOR SELECT USING (true);
CREATE POLICY master_admin_chapters ON chapters FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'MASTER_ADMIN')
);
CREATE POLICY chapter_admin_chapters ON chapters FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'CHAPTER_ADMIN' AND chapters.id = u.chapter_id)
);

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public) VALUES ('profile_photos', 'profile_photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Profile photos are publicly accessible." ON storage.objects FOR SELECT USING (bucket_id = 'profile_photos');
CREATE POLICY "Users can upload their own profile photo." ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile_photos' AND auth.uid() = owner);
CREATE POLICY "Users can update their own profile photo." ON storage.objects FOR UPDATE USING (bucket_id = 'profile_photos' AND auth.uid() = owner);
CREATE POLICY "Users can delete their own profile photo." ON storage.objects FOR DELETE USING (bucket_id = 'profile_photos' AND auth.uid() = owner);
