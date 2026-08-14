const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');
async function run() {
  const { data, error } = await supabase.rpc('get_enum');
  // Just trigger a bad update to `status` to see if it's an enum
  const { error: err } = await supabase.from('meetings').update({ status: 'INVALID' }).eq('id', '5c951195-1db5-4e89-a0fc-941f921da3c2');
  console.log(err);
}
run();
