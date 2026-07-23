const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const regex = /if \(gStatus === 'Present'\) \{([\s\S]*?)\}/;
const match = code.match(regex);
if (match) {
  const newLogic = `if (gStatus === 'Present' && guest.status !== 'Present' && guest.attendance_status !== 'Present') {${match[1]}}`;
  code = code.replace(match[0], newLogic);
  fs.writeFileSync('src/pages/Meetings.tsx', code);
}
