const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');
code = code.replace(
  /import \{ calculateMemberGrowthScore, calculateMemberGrowthScoreData \} from '\.\.\/utils\/growthScore';/,
  "import { calculateMemberGrowthScore, calculateMemberGrowthScoreData, calculateChapterGrowthScoreData } from '../utils/growthScore';"
);
fs.writeFileSync('src/pages/Reports.tsx', code);
