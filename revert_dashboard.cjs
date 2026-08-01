const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace effectiveDateRange back to activeDateRange
content = content.replace(/effectiveDateRange/g, 'activeDateRange');

fs.writeFileSync(file, content);
console.log("Reverted effectiveDateRange.");
