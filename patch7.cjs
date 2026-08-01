const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/chapterHealthScore=\{chapterGrowthScoreData\.score\}/, 'chapterHealthScore={memberGrowthScoreData.score}');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
