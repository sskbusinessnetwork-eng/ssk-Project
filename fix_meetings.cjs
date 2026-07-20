const fs = require('fs');

const file = 'src/pages/Meetings.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all usages of profile.adminId and profile.uid for chapters with profile.chapter_id
content = content.replace(/profile\?\.adminId/g, "profile?.chapter_id");
content = content.replace(/profile\.adminId/g, "profile.chapter_id");
content = content.replace(/\(isChapterAdmin \? profile\?\.uid : profile\?\.chapter_id\)/g, "profile?.chapter_id");
content = content.replace(/\(isChapterAdmin \? profile\?\.uid : profile\.chapter_id\)/g, "profile?.chapter_id");

// `m.adminId === selectedMeeting.adminId || m.uid === selectedMeeting.adminId`
// should be `m.chapter_id === selectedMeeting.adminId`
content = content.replace(/m\.adminId === selectedMeeting\.adminId \|\| m\.uid === selectedMeeting\.adminId/g, "m.chapter_id === selectedMeeting.adminId");
content = content.replace(/m\.adminId === selectedMeeting\?\.adminId \|\| m\.uid === selectedMeeting\?\.adminId/g, "m.chapter_id === selectedMeeting?.adminId");

// Also replace `adminId: profile.uid` inside `scheduleData`
content = content.replace(/adminId: profile\.uid/g, "adminId: profile.chapter_id");

fs.writeFileSync(file, content);
