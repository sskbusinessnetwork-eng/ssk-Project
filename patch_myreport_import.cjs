const fs = require('fs');
let code = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');
code = code.replace(
  /import \{ isMemberActive \} from '\.\.\/utils\/authUtils';/,
  "import { isMemberActive } from '../utils/memberStatus';"
);
fs.writeFileSync('src/pages/MyReport.tsx', code);
