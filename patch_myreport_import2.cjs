const fs = require('fs');
let code = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');
code = code.replace(
  /import \{ StatGrid \} from '\.\.\/components\/StatGrid';/,
  "import StatGrid from '../components/StatGrid';"
);
fs.writeFileSync('src/pages/MyReport.tsx', code);
