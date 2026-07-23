ALTER TABLE guest_invitations
ADD COLUMN IF NOT EXISTS attendance_status TEXT,
ADD COLUMN IF NOT EXISTS attendance_updated_by UUID,
ADD COLUMN IF NOT EXISTS attendance_updated_by_name TEXT,
ADD COLUMN IF NOT EXISTS attendance_updated_at TIMESTAMPTZ;
