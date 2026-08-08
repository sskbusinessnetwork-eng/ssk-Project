const fs = require('fs');

let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

code = code.replace(/Number\(slip\.businessValue\) \|\| 0/g, 'Number(slip.businessValue || slip.business_value) || 0');
code = code.replace(/acc \+ slip\.businessValue/g, 'acc + (Number(slip.businessValue || slip.business_value) || 0)');

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('ThankYouSlips fixed');
