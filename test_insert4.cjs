const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');
async function run() {
  const { error } = await supabase.from('referrals').insert([
    {
      from_user_id: '00000000-0000-0000-0000-000000000000',
      to_user_id: '00000000-0000-0000-0000-000000000000',
      contact_name: 'test',
      contact_phone: 'test',
      requirement: 'test',
      notes: 'test',
      status: 'Pending'
    }
  ]);
  console.log('Error with notes schema:', error);
}
run();
