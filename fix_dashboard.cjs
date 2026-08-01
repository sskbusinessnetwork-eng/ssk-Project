const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'effectiveDateRange,',
  'activeDateRange: effectiveDateRange,'
);

content = content.replace(
  'effectiveDateRange,',
  'activeDateRange: effectiveDateRange,'
);

fs.writeFileSync(file, content);
console.log("Dashboard fixed.");
