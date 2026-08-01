const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/const growthScoreData = chapterGrowthScoreData;\s*const dynamicGrowthScore = chapterGrowthScoreData\.score;\s*const growthStatus = chapterGrowthScoreData\.status;\s*const growthStatusColor = chapterGrowthScoreData\.statusColor;/, `const growthScoreData = profile?.role === 'MASTER_ADMIN' ? chapterGrowthScoreData : memberGrowthScoreData;
  const dynamicGrowthScore = growthScoreData.score;
  const growthStatus = growthScoreData.status;
  const growthStatusColor = growthScoreData.statusColor;`);

code = code.replace(/\{chapterGrowthScoreData\.membersAnalysed\}/g, '{growthScoreData.membersAnalysed}');
code = code.replace(/\{chapterGrowthScoreData\.daysAnalysedText\}/g, '{growthScoreData.daysAnalysedText}');
code = code.replace(/\{chapterGrowthScoreData\.scoreText\}/g, '{growthScoreData.scoreText}');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
