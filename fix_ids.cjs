const fs = require('fs');

function replaceAll(file, t, r) {
  let code = fs.readFileSync(file, 'utf-8');
  if(code.includes(t)) {
    code = code.split(t).join(r);
    fs.writeFileSync(file, code);
    console.log(file + ' fixed');
  }
}

// Dashboard
replaceAll('src/pages/Dashboard.tsx', 
'String(ref.fromUserId)', 
'String(ref.fromUserId || ref.from_user_id || ref.sender_id)');
replaceAll('src/pages/Dashboard.tsx', 
'String(ref.toUserId)', 
'String(ref.toUserId || ref.to_user_id || ref.receiver_id)');

// MyReport
replaceAll('src/pages/MyReport.tsx', 
'String(ref.fromUserId || ref.from_user_id)', 
'String(ref.fromUserId || ref.from_user_id || ref.sender_id)');
replaceAll('src/pages/MyReport.tsx', 
'String(ref.toUserId || ref.to_user_id)', 
'String(ref.toUserId || ref.to_user_id || ref.receiver_id)');

// MemberCompanionView
replaceAll('src/components/MemberCompanionView.tsx', 
'String(ref.fromUserId || ref.from_user_id)', 
'String(ref.fromUserId || ref.from_user_id || ref.sender_id)');
replaceAll('src/components/MemberCompanionView.tsx', 
'String(ref.toUserId || ref.to_user_id)', 
'String(ref.toUserId || ref.to_user_id || ref.receiver_id)');

// ThankYouSlips
replaceAll('src/pages/ThankYouSlips.tsx', 
'String(ref.fromUserId)', 
'String(ref.fromUserId || ref.from_user_id || ref.sender_id)');
replaceAll('src/pages/ThankYouSlips.tsx', 
'String(ref.toUserId)', 
'String(ref.toUserId || ref.to_user_id || ref.receiver_id)');

