import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Fetching a single user...");
  const { data, error } = await supabase.from('users').select('*').limit(1);
  console.log("Data:", data);
  console.log("Error:", error);
  
  if (data && data.length > 0) {
    console.log("Keys in users:", Object.keys(data[0]));
  }
}
test();
