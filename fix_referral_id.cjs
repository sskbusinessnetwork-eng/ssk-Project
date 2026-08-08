const fs = require('fs');

function replaceAll(file, t, r) {
  let code = fs.readFileSync(file, 'utf-8');
  if(code.includes(t)) {
    code = code.split(t).join(r);
    fs.writeFileSync(file, code);
    console.log(file + ' fixed');
  }
}

replaceAll('src/pages/Dashboard.tsx', 'String(s.referralId)', 'String(s.referralId || s.referral_id)');

replaceAll('src/pages/MyReport.tsx', 'String(s.referralId)', 'String(s.referralId || s.referral_id)');

replaceAll('src/components/MemberCompanionView.tsx', 'String(s.referralId)', 'String(s.referralId || s.referral_id)');

replaceAll('src/pages/ThankYouSlips.tsx', 'String(slip.referralId)', 'String(slip.referralId || slip.referral_id)');

