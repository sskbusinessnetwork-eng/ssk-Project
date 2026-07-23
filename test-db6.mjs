import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('thank_you_slips').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("Keys:", Object.keys(data[0]));
  } else {
    console.log("No data, error:", error);
  }
}
test();
