require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const updatePayload = {
    updated_at: new Date().toISOString(),
    location: 'Test Updated',
    is_completed: false,
    status: 'UPCOMING'
  };
  const { data, error } = await adminSupabase
    .from('meetings')
    .update(updatePayload)
    .eq('id', '5c951195-1db5-4e89-a0fc-941f921da3c2');
  console.log("Error:", error);
}
run();
