const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');
async function run() {
  const { data, error } = await supabase.from('one_to_one_meetings').insert([{ 
    title: "dummy",
    date: "2024-01-01",
    time: "10:00",
    duration: 60,
    organizer_id: '00000000-0000-0000-0000-000000000000',
    member_id: '00000000-0000-0000-0000-000000000000',
    chapter_id: '00000000-0000-0000-0000-000000000000',
    scheduled_date: '2024-01-01T10:00:00Z',
  }]).select();
  console.log(error);
}
run();
