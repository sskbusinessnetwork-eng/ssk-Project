const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);

async function test() {
  const { data: users, error } = await adminSupabase
    .from('users')
    .select('id, uid, role, position, chapter_id')
    .eq('role', 'CHAPTER_ADMIN')
    .limit(1);
    
  if (users && users.length > 0) {
    const admin = users[0];
    console.log("Admin:", admin);
    
    // Find a meeting for this chapter
    const { data: meetings } = await adminSupabase
      .from('meetings')
      .select('id, chapter_id')
      .eq('chapter_id', admin.chapter_id)
      .limit(1);
      
    if (meetings && meetings.length > 0) {
      console.log("Meeting:", meetings[0]);
      
      const res = await fetch('http://localhost:3000/api/meetings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetings[0].id,
          callerId: admin.uid || admin.id,
          date: '2026-10-10',
          time: '10:00 AM',
          location: 'Test Loc',
          attendance: {},
          amountCollected: {},
          memberNotes: {},
          isCompleted: false,
          guestUpdates: []
        })
      });
      const text = await res.text();
      console.log("API Response:", text);
    } else {
      console.log("No meetings found for chapter", admin.chapter_id);
    }
  } else {
    console.log("No chapter admins found.");
  }
}
test();
