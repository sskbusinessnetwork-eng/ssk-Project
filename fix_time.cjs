const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace One-to-One Meeting logic
code = code.replace(
  "const has121Today = today121.length > 0;",
  `const has121Today = today121.length > 0;
    let isPast121Time = false;
    if (has121Today) {
      try {
        const meetingTime = today121[0].time || today121[0].meeting_time || '10:00 AM';
        const [timePart, ampm] = meetingTime.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const meetingDateObj = new Date();
        meetingDateObj.setHours(hours, minutes || 0, 0, 0);
        isPast121Time = new Date() >= meetingDateObj;
      } catch(e) {
        isPast121Time = true;
      }
    }`
);
code = code.replace(
  "desc: hasCompleted121Today ? 'Attendance updated.' : (has121Today ? 'Update your meeting attendance.' : 'No 1-to-1 meetings scheduled for today.'),",
  "desc: hasCompleted121Today ? 'Attendance updated.' : (has121Today ? (isPast121Time ? 'Update your meeting attendance.' : 'Upcoming Meeting') : 'No 1-to-1 meetings scheduled for today.'),"
);
code = code.replace(
  "linkText: has121Today && !hasCompleted121Today ? 'UPDATE ATTENDANCE' : 'VIEW',",
  "linkText: has121Today && !hasCompleted121Today ? (isPast121Time ? 'UPDATE ATTENDANCE' : 'VIEW') : 'VIEW',"
);

// Replace Chapter Meeting logic
code = code.replace(
  "const hasChapterToday = todayChapter.length > 0;",
  `const hasChapterToday = todayChapter.length > 0;
    let isPastChapterTime = false;
    if (hasChapterToday) {
      try {
        const meetingTime = todayChapter[0].time || todayChapter[0].meeting_time || '10:00 AM';
        const [timePart, ampm] = meetingTime.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const meetingDateObj = new Date();
        meetingDateObj.setHours(hours, minutes || 0, 0, 0);
        isPastChapterTime = new Date() >= meetingDateObj;
      } catch(e) {
        isPastChapterTime = true;
      }
    }`
);
code = code.replace(
  "desc: hasAttendedChapterToday ? 'Attendance marked present.' : (hasChapterToday ? 'Update chapter meeting attendance.' : 'No chapter meeting today.'),",
  "desc: hasAttendedChapterToday ? 'Attendance marked present.' : (hasChapterToday ? (isPastChapterTime ? 'Update chapter meeting attendance.' : 'Upcoming Chapter Meeting') : 'No chapter meeting today.'),"
);
code = code.replace(
  "linkText: hasChapterToday && !hasAttendedChapterToday ? 'UPDATE ATTENDANCE' : 'VIEW',",
  "linkText: hasChapterToday && !hasAttendedChapterToday ? (isPastChapterTime ? 'UPDATE ATTENDANCE' : 'VIEW') : 'VIEW',"
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
