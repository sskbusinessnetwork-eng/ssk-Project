-- ==============================================================================
-- 1. Create master_admins table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS master_admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 2. Trigger to update updated_at timestamp
-- ==============================================================================
DO $$ BEGIN
    CREATE TRIGGER update_master_admins_updated_at BEFORE UPDATE ON master_admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 3. Row Level Security Policies
-- ==============================================================================
ALTER TABLE master_admins ENABLE ROW LEVEL SECURITY;

-- Allow reading self
DO $$ BEGIN
    CREATE POLICY master_admins_read_self ON master_admins FOR SELECT USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Allow reading all admins if current user is an admin
DO $$ BEGIN
    CREATE POLICY master_admin_all_admins ON master_admins FOR ALL USING (
        EXISTS (SELECT 1 FROM master_admins WHERE auth_user_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 4. Create Master Admin Authentication Credentials (ONLY if it does not exist)
-- ==============================================================================
DO $$
DECLARE
    new_master_admin_id UUID := gen_random_uuid();
BEGIN
    -- Only insert if the phone number doesn't exist in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = '8884449689') THEN
        
        -- Create the Supabase Authentication User
        INSERT INTO auth.users (
            id, 
            instance_id, 
            aud, 
            role, 
            email, 
            encrypted_password, 
            phone, 
            email_confirmed_at, 
            phone_confirmed_at, 
            created_at, 
            updated_at, 
            confirmation_token, 
            recovery_token, 
            email_change_token_new, 
            email_change
        )
        VALUES (
            new_master_admin_id,
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            'sskbusinessnetwork@gmail.com',
            crypt('Welcome@123', gen_salt('bf')), -- Securely hash the password
            '8884449689',
            NOW(),
            NOW(),
            NOW(),
            NOW(),
            '', '', '', ''
        );

        -- Create the Master Admin Profile Linked to the Auth User
        INSERT INTO master_admins (
            auth_user_id, 
            phone_number, 
            full_name, 
            email, 
            status
        )
        VALUES (
            new_master_admin_id,
            '8884449689',
            'Master Admin',
            'sskbusinessnetwork@gmail.com',
            'ACTIVE'
        );
        
        RAISE NOTICE 'Master Admin successfully created.';
    ELSE
        RAISE NOTICE 'Master Admin already exists. Skipping creation.';
    END IF;
END $$;
