const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('users').select('*');
  let count = 0;
  for (let u of data) {
    const endVal = u.subscription_end || u.subscriptionEnd;
    // let's see what users exist
    console.log(u.name, 'start:', u.subscription_start, 'end:', u.subscription_end, 'role:', u.role, 'status:', u.status);
  }
}
check();
