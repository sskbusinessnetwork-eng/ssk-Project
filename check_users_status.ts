import { supabase } from './src/lib/supabaseClient';

async function check() {
  const { data, error } = await supabase.from('users').select('id, name, role, position, membershipStatus, status, chapter_id').limit(10);
  if (error) console.error(error);
  else console.table(data);
}
check();
