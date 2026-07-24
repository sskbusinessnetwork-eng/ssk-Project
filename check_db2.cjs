const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
async function check() {
  const { error } = await supabase.from('users').update({ createdByName: 'Test' }).eq('id', 'nonexistent');
  console.log(error ? error.message : "Success");
}
check();
