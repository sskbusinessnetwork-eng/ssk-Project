const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "label: 'Referral Received (Update)',",
  "label: 'Referral Received',"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
