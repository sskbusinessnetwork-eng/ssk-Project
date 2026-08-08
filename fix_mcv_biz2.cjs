const fs = require('fs');
let code = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf-8');

const target1 = `    userSlips.forEach(s => {
      const val = Number(s.businessValue || s.transactionValue) || 0;
      const d = new Date(s.createdAt || s.date);
      const from = String(s.fromUserId || s.from_user_id || s.submitted_by || '');
      const to = String(s.toUserId || s.to_user_id || '');
      
      // If user is 'from' (submitted the Thank You slip), they RECEIVED the business.
      // If user is 'to' (received the Thank You slip), they SENT/GENERATED the business.
      const isSenderOfSlip = userCandidateIds.includes(from);
      const isReceiverOfSlip = userCandidateIds.includes(to);

      if (isSenderOfSlip) businessReceived += val;
      if (isReceiverOfSlip) businessSent += val;
      
      const isThisMonth = d.getFullYear() === year && d.getMonth() === month;
      if (isThisMonth && (isSenderOfSlip || isReceiverOfSlip)) {
        thisMonthBusiness += val;
      }

      if (d.toDateString() === todayStr && (isSenderOfSlip || isReceiverOfSlip)) {
        todayBusiness += val;
      }
    });`;

const replacement1 = `    userSlips.forEach(s => {
      const val = Number(s.businessValue || s.transactionValue) || 0;
      const d = new Date(s.createdAt || s.date);
      
      const ref = userReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
      const senderId = ref ? String(ref.fromUserId || ref.from_user_id || ref.sender_id) : String(s.toUserId || s.to_user_id || '');
      const receiverId = ref ? String(ref.toUserId || ref.to_user_id || ref.receiver_id) : String(s.fromUserId || s.from_user_id || s.submitted_by || '');
      
      const userSentBusiness = userCandidateIds.includes(senderId);
      const userReceivedBusiness = userCandidateIds.includes(receiverId);

      if (userReceivedBusiness) businessReceived += val;
      if (userSentBusiness) businessSent += val;
      
      const isThisMonth = d.getFullYear() === year && d.getMonth() === month;
      if (isThisMonth && (userSentBusiness || userReceivedBusiness)) {
        thisMonthBusiness += val;
      }

      if (d.toDateString() === todayStr && (userSentBusiness || userReceivedBusiness)) {
        todayBusiness += val;
      }
    });`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('src/components/MemberCompanionView.tsx', code);
  console.log('SUCCESS MemberCompanionView');
} else {
  console.log('TARGET NOT FOUND');
}
