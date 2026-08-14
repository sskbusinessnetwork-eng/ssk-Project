const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey);

async function test() {
  const { data: caller } = await adminSupabase.from('users').select('id, uid').eq('role', 'MASTER_ADMIN').limit(1).single();
  const callerId = caller.id || caller.uid;

  const { data: meeting } = await adminSupabase.from('meetings').select('*').limit(1).single();

  const data = JSON.stringify({
    meetingId: meeting.id,
    callerId,
    date: '2026-10-10',
    time: '10:00 AM',
    location: 'Online',
    attendance: { [callerId]: 'Present' },
    amountCollected: { [callerId]: "abc" },
    memberNotes: { [callerId]: "" },
    isCompleted: false,
    guestUpdates: [{ id: 'guest1', status: 'Present', inviterId: callerId }]
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/meetings/update',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('Response:', body));
  });

  req.on('error', e => console.error(e));
  req.write(data);
  req.end();
}
test();
