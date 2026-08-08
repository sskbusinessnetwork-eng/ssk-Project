const fs = require('fs');
let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const target1 = `  const totalBusinessSent = isMasterAdmin 
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : receivedSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0);`;

const replacement1 = `  const totalBusinessSent = isMasterAdmin 
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : allSlips.reduce((acc, slip) => {
        const ref = referrals.find(r => String(r.id) === String(slip.referralId));
        const senderId = ref ? String(ref.fromUserId) : String(slip.toUserId);
        return String(senderId) === String(currentUserId) ? acc + (Number(slip.businessValue) || 0) : acc;
      }, 0);`;

const target2 = `  const totalBusinessReceived = isMasterAdmin
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : slips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0);`;

const replacement2 = `  const totalBusinessReceived = isMasterAdmin
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : allSlips.reduce((acc, slip) => {
        const ref = referrals.find(r => String(r.id) === String(slip.referralId));
        const receiverId = ref ? String(ref.toUserId) : String(slip.fromUserId);
        return String(receiverId) === String(currentUserId) ? acc + (Number(slip.businessValue) || 0) : acc;
      }, 0);`;

code = code.replace(target1, replacement1);
code = code.replace(target2, replacement2);

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('SUCCESS ThankYouSlips');
