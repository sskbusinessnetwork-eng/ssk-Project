const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);

async function test() {
  const { data: meeting } = await adminSupabase.from('meetings').select('*').limit(1).single();
  if (!meeting) {
    console.log("No meeting found");
    return;
  }
  
  const updatePayload = {
    updated_at: new Date().toISOString(),
    date: meeting.date,
    time: meeting.time,
    location: meeting.location,
    attendance: meeting.attendance || {},
    amount_collected: meeting.amount_collected || {},
    is_completed: meeting.is_completed,
    status: 'UPCOMING'
  };

  const { error } = await adminSupabase.from('meetings').update(updatePayload).eq('id', meeting.id);
  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update succeeded");
  }
}
test();
