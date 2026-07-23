const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

code = code.replace(
  "₹{Object.values(tempAmount).reduce((a, b) => a + (parseInt(b) || 0), 0).toLocaleString()}",
  "₹{Object.values(tempAmount).reduce((a: number, b: any) => a + (parseInt(b) || 0), 0).toLocaleString()}"
);

fs.writeFileSync('src/pages/Meetings.tsx', code);
