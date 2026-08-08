const fs = require('fs');
let code = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf-8');

const oldCode = `      const isSender = userCandidateIds.includes(from);
      const isReceiver = userCandidateIds.includes(to);

      if (isSender) businessSent += val;
      if (isReceiver) businessReceived += val;`;

const newCode = `      // If user is 'from' (submitted the Thank You slip), they RECEIVED the business.
      // If user is 'to' (received the Thank You slip), they SENT/GENERATED the business.
      const isSenderOfSlip = userCandidateIds.includes(from);
      const isReceiverOfSlip = userCandidateIds.includes(to);

      if (isSenderOfSlip) businessReceived += val;
      if (isReceiverOfSlip) businessSent += val;`;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('src/components/MemberCompanionView.tsx', code);
  console.log('SUCCESS MemberCompanionView');
} else {
  console.log('TARGET NOT FOUND in MemberCompanionView');
}
