import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');
async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // Or try to query pg_class? 
  // Maybe just try a few known table names
}
run();
