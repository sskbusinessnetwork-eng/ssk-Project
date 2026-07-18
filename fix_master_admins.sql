DROP POLICY IF EXISTS master_admin_all_admins ON master_admins;
DROP POLICY IF EXISTS master_admins_read_self ON master_admins;

CREATE POLICY master_admin_anon_read ON master_admins FOR SELECT USING (true);
