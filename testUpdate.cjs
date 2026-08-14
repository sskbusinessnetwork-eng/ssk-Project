const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: meeting } = await supabase.from('meetings').select('id, date, time, location, attendance, amount_collected, is_completed').limit(1).single();
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

  const { error } = await supabase.from('meetings').update(updatePayload).eq('id', meeting.id);
  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update succeeded");
  }
}
test();
