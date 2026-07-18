-- 1. Add the password column to master_admins table
ALTER TABLE master_admins ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Insert or update the Master Admin credentials
INSERT INTO master_admins (
    full_name, 
    phone_number, 
    password, 
    status
)
VALUES (
    'Master Admin',
    '8884449689',
    'Welcome@123',
    'ACTIVE'
)
ON CONFLICT (phone_number) 
DO UPDATE SET 
    password = EXCLUDED.password,
    status = EXCLUDED.status;
