import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data: user } = await supabase.from('users').select('*').neq('chapter_id', null).limit(1).single();
  console.log("User chapter:", user?.chapter_id);
  
  if (user) {
    const { error } = await supabase.from('referrals').insert([
      {
        sender_id: user.id,
        receiver_id: user.id,
        chapter_id: user.chapter_id,
        from_user_id: user.id,
        to_user_id: user.id,
        contact_name: 'Test',
        contact_phone: '1234567890',
        business_requirement: 'Test',
        customer_name: 'Test',
        customer_mobile: '1234567890',
        requirement: 'Test'
      }
    ]);
    console.log("Insert Error:", error);
  }
}
test();
