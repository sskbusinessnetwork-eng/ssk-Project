const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regex = /\/\/ Business Generated & Business Sent:[\s\S]*?return String\(receiverId\) === String\(currentUserId\) \? acc \+ val : acc;\n      }, 0);/m;

const newTotalCode = `// Business Generated & Business Sent: Total business sent by the user (slips submitted by user)
  const totalBusinessSent = isMasterAdmin 
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue || slip.business_value) || 0), 0)
    : slips.reduce((acc, slip) => {
        const ref = referrals.find(r => String(r.id) === String(slip.referralId || slip.referral_id));
        const val = ref && (ref as any).business_amount ? Number((ref as any).business_amount) : Number(slip.businessValue || slip.business_value || (slip as any).amount) || 0;
        return acc + val;
      }, 0);

  // Business Generated always equals Business Sent
  const totalBusinessGenerated = totalBusinessSent;

  // Business Received: Total business received by the user (slips received where user is toUserId)
  const totalBusinessReceived = isMasterAdmin
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue || slip.business_value) || 0), 0)
    : receivedSlips.reduce((acc, slip) => {
        const ref = referrals.find(r => String(r.id) === String(slip.referralId || slip.referral_id));
        const val = ref && (ref as any).business_amount ? Number((ref as any).business_amount) : Number(slip.businessValue || slip.business_value || (slip as any).amount) || 0;
        return acc + val;
      }, 0);`;

if (content.match(regex)) {
  content = content.replace(regex, newTotalCode);
  fs.writeFileSync('src/pages/ThankYouSlips.tsx', content);
  console.log("Success");
} else {
  console.log("Could not find regex");
}
