const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  `calculateMemberGrowthScoreData({
      profile,
      effectiveDateRange,`,
  `calculateMemberGrowthScoreData({
      profile,
      activeDateRange: effectiveDateRange,`
);

fs.writeFileSync(file, content);
console.log("Dashboard fixed 3.");
