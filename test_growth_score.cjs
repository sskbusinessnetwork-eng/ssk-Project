const { createClient } = require('@supabase/supabase-js');
const dateFns = require('date-fns');

const supabaseUrl = 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Let's import the actual functions from growthScore
// But first let's see growthScore implementation
async function run() {
  const { data: users } = await supabase.from('users').select('*');
  const { data: chapters } = await supabase.from('chapters').select('*');
  const { data: meetings } = await supabase.from('meetings').select('*');
  const { data: referrals } = await supabase.from('referrals').select('*');
  const { data: oneToOnes } = await supabase.from('one_to_one_meetings').select('*');
  const { data: guestInvitations } = await supabase.from('guest_invitations').select('*');
  const { data: testimonials } = await supabase.from('testimonials').select('*');
  const { data: slips } = await supabase.from('thank_you_slips').select('*');

  console.log('Testing each user with date conversions...');
  
  for (const user of users) {
    console.log(`\nTesting user: ${user.name} (${user.id})`);
    
    // Test date parsing for user's fields
    for (const [k, v] of Object.entries(user)) {
      if (v && typeof v === 'string' && /date|start|end|created|updated/i.test(k)) {
        try {
          const d = new Date(v);
          if (isNaN(d.getTime())) {
            console.log(`  Invalid Date on field ${k}: "${v}"`);
          }
        } catch (e) {
          console.log(`  Error on field ${k}:`, e.message);
        }
      }
    }
  }
}
run();
