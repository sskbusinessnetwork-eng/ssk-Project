const fs = require('fs');
let code = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');

const oldCode = `  const businessSentTotal = chapterSlips.reduce((acc, s) => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    if (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);

  const businessReceivedTotal = chapterSlips.reduce((acc, s) => {
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    if (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);

  const businessSentCount = chapterSlips.filter(s => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;

  const businessReceivedCount = chapterSlips.filter(s => {
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;`;

const newCode = `  const businessSentTotal = chapterSlips.reduce((acc, s) => {
    // If user is 'toUserId' (received the slip), they SENT/GENERATED the business
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    if (sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);

  const businessReceivedTotal = chapterSlips.reduce((acc, s) => {
    // If user is 'fromUserId' (submitted the slip), they RECEIVED the business
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    if (receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId)) {
      return acc + (Number(s.businessValue || s.amount) || 0);
    }
    return acc;
  }, 0);

  const businessSentCount = chapterSlips.filter(s => {
    const sender = chapterUsers.find(u => (u.id || u.uid) === (s.toUserId || s.to_user_id));
    return sender && String(sender.chapter_id || sender.chapterId) === String(userChapterId);
  }).length;

  const businessReceivedCount = chapterSlips.filter(s => {
    const receiver = chapterUsers.find(u => (u.id || u.uid) === (s.fromUserId || s.from_user_id || s.submitted_by));
    return receiver && String(receiver.chapter_id || receiver.chapterId) === String(userChapterId);
  }).length;`;

if (code.includes(oldCode)) {
  code = code.replace(oldCode, newCode);
  fs.writeFileSync('src/pages/MyReport.tsx', code);
  console.log('SUCCESS MyReport');
} else {
  console.log('TARGET NOT FOUND in MyReport');
}
