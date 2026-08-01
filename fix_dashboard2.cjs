const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the typo in dependency array
content = content.replace(
  'activeDateRange: activeDateRange: effectiveDateRange',
  'effectiveDateRange'
);
content = content.replace(
  'activeDateRange: effectiveDateRange',
  'effectiveDateRange'
);

// Now correctly replace it inside the object literals for calculateMemberGrowthScoreData and calculateChapterGrowthScoreData
content = content.replace(
  `calculateMemberGrowthScoreData({
      currentProfile: profile,
      effectiveDateRange,`,
  `calculateMemberGrowthScoreData({
      currentProfile: profile,
      activeDateRange: effectiveDateRange,`
);

content = content.replace(
  `calculateChapterGrowthScoreData({
      chapterMembers: chapterMebs,
      effectiveDateRange,`,
  `calculateChapterGrowthScoreData({
      chapterMembers: chapterMebs,
      activeDateRange: effectiveDateRange,`
);

fs.writeFileSync(file, content);
console.log("Dashboard fixed.");
