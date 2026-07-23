const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

code = code.replace(
  "return guestInvitations.filter(g => g.status === 'Attended').length;",
  "return guestInvitations.filter(g => g.status === 'Present' || g.attendance_status === 'Present').length;"
);

code = code.replace(
  "return chapterGuests.filter(g => g.status === 'Attended').length || 0;",
  "return chapterGuests.filter(g => g.status === 'Present' || g.attendance_status === 'Present').length || 0;"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
