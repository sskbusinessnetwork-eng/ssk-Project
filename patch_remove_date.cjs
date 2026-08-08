const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regexDate = /<span className="text-\[10px\] text-neutral-400 mt-0\.5 font-medium">\s*\{format\(new Date\(slip\.createdAt\), 'dd MMM yyyy'\)\}\s*<\/span>/g;
content = content.replace(regexDate, '');

fs.writeFileSync('src/pages/ThankYouSlips.tsx', content);
console.log("Removed date from mobile list");

