const fs = require('fs');
let code = fs.readFileSync('src/components/CreateChapter.tsx', 'utf8');

code = code.replace(/subscriptionEnd: endDateISO,/g, `subscriptionEndDate: endDateISO,`);

fs.writeFileSync('src/components/CreateChapter.tsx', code);
