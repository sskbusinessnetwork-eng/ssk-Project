import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
async function run() {
  const { data, error } = await supabase.from('users').select('*').neq('role', 'MASTER_ADMIN');
  if (error) { console.error(error); return; }
  
  if (data.length > 0) {
    for (const u of data) {
       let account = u.account_status || u.accountStatus || 'ACTIVE';
       let mem = u.membership_status || u.membershipStatus || u.status || 'ACTIVE';
       let end = u.subscriptionEnd || u.subscription_end || u.subscriptionEndDate || u.subscription_end_date;
       
       if (account.toUpperCase() === 'INACTIVE' || account.toUpperCase() === 'SUSPENDED' || mem.toUpperCase() === 'INACTIVE') {
         console.log(u.phone, "Inactive by status");
       } else if (end) {
         // simple check
         if (end.includes('2024') || end.includes('2025')) {
            console.log(u.phone, "Expired by date:", end);
         }
       }
    }
  }
}
run();
