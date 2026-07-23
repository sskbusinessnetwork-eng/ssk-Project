import { createClient } from '@supabase/supabase-js';
import { addDoc } from './src/lib/database.ts';

const supabaseUrl = 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const payload = {
      userId: '44379551-72f5-44ca-8a11-2c54461974a7',
      role: 'MEMBER',
      type: 'test',
      title: 'test',
      message: 'test',
      isRead: false,
      relatedUserId: '44379551-72f5-44ca-8a11-2c54461974a7',
      link: '/test',
  };
  try {
     const res = await addDoc({ path: 'notifications' }, payload);
     console.log("Success:", res);
  } catch(e) {
     console.log("Error:", e);
  }
}
test();
