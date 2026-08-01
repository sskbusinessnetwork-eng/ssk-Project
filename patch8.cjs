const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/chapterHealthScore=\{memberGrowthScoreData\.score\}\s*membersAnalysed=\{chapterGrowthScoreData\.membersAnalysed\}\s*daysAnalysedText=\{chapterGrowthScoreData\.daysAnalysedText\}\s*scoreText=\{chapterGrowthScoreData\.scoreText\}/, `chapterHealthScore={memberGrowthScoreData.score}
          membersAnalysed={memberGrowthScoreData.membersAnalysed}
          daysAnalysedText={memberGrowthScoreData.daysAnalysedText}
          scoreText={memberGrowthScoreData.scoreText}`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
