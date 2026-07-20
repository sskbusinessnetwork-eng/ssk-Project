const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, search, replace) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.split(search).join(replace);
  fs.writeFileSync(filePath, content);
}

const files = [
  'src/components/WriteTestimonialModal.tsx',
  'src/components/members/MemberTable.tsx',
  'src/components/positions/PositionManagement.tsx',
  'src/pages/Guests.tsx',
  'src/pages/Testimonials.tsx',
  'src/pages/OnboardMember.tsx',
  'src/pages/Connections.tsx',
  'src/pages/OneToOneMeetings.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Members.tsx',
  'src/pages/Dashboard.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace associatedChapterAdminId with chapter_id
  content = content.replace(/associatedChapterAdminId/g, 'chapter_id');
  
  // Sometimes it checks `profile.uid` as the chapter ID for CHAPTER_ADMIN, we should use `profile.chapter_id`
  content = content.replace(/where\('chapter_id', '==', profile\.uid\)/g, "where('chapter_id', '==', profile?.chapter_id)");
  
  content = content.replace(/chapter_id: profile\.uid/g, "chapter_id: profile?.chapter_id");
  content = content.replace(/m\.chapter_id !== profile\.uid/g, "m.chapter_id !== profile?.chapter_id");
  content = content.replace(/profile\?\.role === 'CHAPTER_ADMIN' \? profile\.uid : profile\?\.chapter_id/g, "profile?.chapter_id");
  
  fs.writeFileSync(file, content);
});

console.log('Fixed instances.');
