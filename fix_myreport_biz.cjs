const fs = require('fs');
let code = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');

const target1 = `  const businessSentTotal = chapterSlips.reduce((acc, s) => {
    // If user is 'toUserId' (received the slip), they SENT/GENERATED the business
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    if (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);`;

const replacement1 = `  const businessSentTotal = chapterSlips.reduce((acc, s) => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const senderId = ref ? String(ref.fromUserId || ref.from_user_id) : String(s.toUserId || s.to_user_id);
    const sender = chapterUsers.find(u => String(u.id || u.uid) === senderId);
    if (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);`;

const target2 = `  const businessReceivedTotal = chapterSlips.reduce((acc, s) => {
    // If user is 'fromUserId' (submitted the slip), they RECEIVED the business
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    if (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);`;

const replacement2 = `  const businessReceivedTotal = chapterSlips.reduce((acc, s) => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const receiverId = ref ? String(ref.toUserId || ref.to_user_id) : String(s.fromUserId || s.from_user_id || s.submitted_by);
    const receiver = chapterUsers.find(u => String(u.id || u.uid) === receiverId);
    if (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);`;

const target3 = `  const businessSentCount = chapterSlips.filter(s => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;`;

const replacement3 = `  const businessSentCount = chapterSlips.filter(s => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const senderId = ref ? String(ref.fromUserId || ref.from_user_id) : String(s.toUserId || s.to_user_id);
    const sender = chapterUsers.find(u => String(u.id || u.uid) === senderId);
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;`;

const target4 = `  const businessReceivedCount = chapterSlips.filter(s => {
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;`;

const replacement4 = `  const businessReceivedCount = chapterSlips.filter(s => {
    const ref = chapterReferrals.find(r => String(r.id) === String(s.referralId || s.referral_id));
    const receiverId = ref ? String(ref.toUserId || ref.to_user_id) : String(s.fromUserId || s.from_user_id || s.submitted_by);
    const receiver = chapterUsers.find(u => String(u.id || u.uid) === receiverId);
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;`;

if (code.includes(target1) && code.includes(target2) && code.includes(target3) && code.includes(target4)) {
  code = code.replace(target1, replacement1);
  code = code.replace(target2, replacement2);
  code = code.replace(target3, replacement3);
  code = code.replace(target4, replacement4);
  fs.writeFileSync('src/pages/MyReport.tsx', code);
  console.log('SUCCESS MyReport');
} else {
  console.log('TARGET NOT FOUND');
}
