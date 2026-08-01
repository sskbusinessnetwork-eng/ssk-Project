const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');
code = code.replace(/<Link to="\/reports"/, '<Link to="/member/my-report"');
fs.writeFileSync('src/pages/Dashboard.tsx', code);
