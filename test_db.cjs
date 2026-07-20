const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: chapters } = await supabase.from('chapters').select('*');
  console.log('Chapters:', chapters);
  
  const { data: users } = await supabase.from('users').select('id, name, role, chapter_id').limit(10);
  console.log('Users:', users);
}
check();
