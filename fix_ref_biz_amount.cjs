const fs = require('fs');

let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
const search = `return businessSentSlips.reduce((sum, s) => sum + (Number(s.businessValue || s.business_value || s.transactionValue) || 0), 0);`;
const rep = `return businessSentSlips.reduce((sum, s) => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.transactionValue || 0);
      return sum + val;
    }, 0);`;
code = code.replace(search, rep);

const search2 = `return businessReceivedSlips.reduce((sum, s) => sum + (Number(s.businessValue || s.business_value || s.transactionValue) || 0), 0);`;
const rep2 = `return businessReceivedSlips.reduce((sum, s) => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.transactionValue || 0);
      return sum + val;
    }, 0);`;
code = code.replace(search2, rep2);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('Dashboard fixed with ref.business_amount fallback');

let myRep = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');
const myRepS1 = `return acc + (Number(s.businessValue || s.business_value || s.amount) || 0);`;
const myRepR1 = `const val = ref && ref.business_amount ? Number(ref.business_amount) : Number(s.businessValue || s.business_value || s.amount || 0);
      return acc + val;`;
myRep = myRep.split(myRepS1).join(myRepR1);
fs.writeFileSync('src/pages/MyReport.tsx', myRep);
console.log('MyReport fixed with ref.business_amount fallback');
