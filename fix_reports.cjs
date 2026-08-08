const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');
code = code.replace(/Number\(s\.businessValue\) \|\| 0/g, 'Number(s.businessValue || s.business_value) || 0');
fs.writeFileSync('src/pages/Reports.tsx', code);
console.log('Reports fixed');
