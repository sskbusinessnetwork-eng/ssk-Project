const fs = require('fs');
let code = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf-8');

const target1 = `    userSlips.forEach(s => {
      const val = Number(s.businessValue || s.transactionValue) || 0;
      const d = new Date(s.createdAt || s.date);
      
      const ref = userReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));`;

const replacement1 = `    userSlips.forEach(s => {
      const val = Number(s.businessValue || s.transactionValue) || 0;
      const d = new Date(s.createdAt || s.date);
      
      const ref = allReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('src/components/MemberCompanionView.tsx', code);
  console.log('SUCCESS MemberCompanionView');
} else {
  console.log('TARGET NOT FOUND');
}
