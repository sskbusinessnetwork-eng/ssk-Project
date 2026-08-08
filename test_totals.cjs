const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
let content = fs.readFileSync('src/lib/supabaseClient.ts', 'utf-8');
const urlMatch = content.match(/VITE_SUPABASE_URL\s*\|\|\s*'([^']+)'/);
const anonMatch = content.match(/VITE_SUPABASE_ANON_KEY\s*\|\|\s*'([^']+)'/);
if(urlMatch && anonMatch) {
  const supabase = createClient(urlMatch[1], anonMatch[1]);
  Promise.all([
    supabase.from('thank_you_slips').select('*'),
    supabase.from('referrals').select('*')
  ]).then(([slips, referrals]) => {
     const currentUserId = 'ba33ef61-fa03-47a7-8e1e-3a08b1bd4dc0';
     const allSlips = slips.data || [];
     const allRefs = referrals.data || [];
     
     const totalBizReceived = allSlips.reduce((acc, slip) => {
        const ref = allRefs.find(r => String(r.id) === String(slip.referralId || slip.referral_id));
        const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(slip.fromUserId);
        const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(slip.businessValue || slip.business_value) || 0;
        return String(receiverId) === String(currentUserId) ? acc + val : acc;
     }, 0);
     
     console.log("Total Biz Received:", totalBizReceived);
  });
}
