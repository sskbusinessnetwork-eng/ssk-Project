const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');

async function test() {
  const meetingId = '5c951195-1db5-4e89-a0fc-941f921da3c2';
  const updatePayload = {
    updated_at: new Date().toISOString(),
    location: "Test Updated",
    date: "10-08-2026", // Check if this is the issue
    time: "07:00 AM"
  };
  const { data, error } = await supabase.from('meetings').update(updatePayload).eq('id', meetingId);
  console.log("Error:", error);
}
test();
