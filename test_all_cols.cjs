const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://wfbkgfotpzscjyaanzpx.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');

async function testCol(col) {
  const obj = {};
  obj[col] = 'test_val';
  // Try to insert with just this column
  const { error } = await supabase.from('referrals').insert([obj]);
  if (error && error.code === 'PGRST204') {
    return false; // Column does not exist
  }
  return true; // Column exists (or we got a different error like RLS/Type mismatch)
}

async function run() {
  const candidates = [
    'id', 'sender_id', 'receiver_id', 'chapter_id', 'customer_name', 'customer_mobile',
    'from_user_id', 'to_user_id', 'contact_name', 'contact_phone', 'requirement', 'notes',
    'status', 'created_at', 'updated_at', 'not_converted_reason', 'from_user_name',
    'from_user_role', 'to_user_name', 'to_user_role'
  ];
  
  const results = {};
  for (const cand of candidates) {
    results[cand] = await testCol(cand);
  }
  console.log('Column Existence Results:', results);
}
run();
