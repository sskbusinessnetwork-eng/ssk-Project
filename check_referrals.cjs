const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');
async function run() {
  const { data, error } = await supabase.from('referrals').select('*').limit(1);
  if (error) {
    console.error(error);
  } else if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    // If no data, try an insert that fails to see columns in the error, or insert dummy
    const { error: insErr } = await supabase.from('referrals').insert([{}]).select();
    console.log(insErr);
  }
}
run();
