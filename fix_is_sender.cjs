const fs = require('fs');
let code = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf-8');

code = code.replace(
  'if (isThisMonth && (isSender || isReceiver)) {',
  'if (isThisMonth && (isSenderOfSlip || isReceiverOfSlip)) {'
);

code = code.replace(
  'if (d.toDateString() === todayStr && (isSender || isReceiver)) {',
  'if (d.toDateString() === todayStr && (isSenderOfSlip || isReceiverOfSlip)) {'
);

fs.writeFileSync('src/components/MemberCompanionView.tsx', code);
console.log('SUCCESS');
