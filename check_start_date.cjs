const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('users').update({ subscription_start_date: '2026-07-23T00:00:00.000Z' }).eq('id', '40138210-1460-4479-8e2c-6f3ed3600b8a');
  console.log(error);
}
check();
