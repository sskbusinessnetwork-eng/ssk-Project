import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { error } = await supabase.from('referrals').insert([
    {
      sender_id: '44379551-72f5-44ca-8a11-2c54461974a7',
      receiver_id: '44379551-72f5-44ca-8a11-2c54461974a7',
      chapter_id: '00000000-0000-0000-0000-000000000000',
      from_user_id: '44379551-72f5-44ca-8a11-2c54461974a7',
      contact_name: 'Test',
      contact_phone: '1234567890',
      business_requirement: 'Test',
      customer_name: 'Test',
      customer_mobile: '1234567890',
      requirement: 'Test'
    }
  ]);
  console.log("Error:", error);
}
test();
