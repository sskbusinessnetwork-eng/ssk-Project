const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const target = `      // Perform validation for all members
      let allMembersFilled = true;
      for (const member of meetingMembers) {
        const status = tempAttendance[member.uid];
        const amount = tempAmount[member.uid];
        
        if (!status || String(status).trim() === '') {
          allMembersFilled = false;
          delete tempAttendance[member.uid];
          delete tempAmount[member.uid];
          continue;
        }

        const finalAmount = amount === undefined ? 0 : amount;

        const allowedStatuses = ['Present', 'Absent', 'Substitute', 'Medical', 'PRESENT', 'ABSENT', 'SUBSTITUTE', 'MEDICAL', 'Yes', 'No', 'YES', 'NO'];
        if (!allowedStatuses.includes(status)) {
          setError(\`Invalid attendance status selected for \${member.name || member.displayName || 'member'}.\`);
          setIsSubmitting(false);
          return;
        }
        
        // Save the assumed 0 back to tempAmount so it gets persisted correctly
        tempAmount[member.uid] = finalAmount;
      }`;

const rep = `      // Perform validation for all members
      let allMembersFilled = true;
      for (const member of meetingMembers) {
        const mId = member.id || member.uid;
        const status = tempAttendance[mId];
        const amount = tempAmount[mId];
        
        if (!status || String(status).trim() === '') {
          allMembersFilled = false;
          delete tempAttendance[mId];
          delete tempAmount[mId];
          continue;
        }

        const finalAmount = amount === undefined ? 0 : amount;

        const allowedStatuses = ['Present', 'Absent', 'Substitute', 'Medical', 'PRESENT', 'ABSENT', 'SUBSTITUTE', 'MEDICAL', 'Yes', 'No', 'YES', 'NO'];
        if (!allowedStatuses.includes(status)) {
          setError(\`Invalid attendance status selected for \${member.name || member.displayName || 'member'}.\`);
          setIsSubmitting(false);
          return;
        }
        
        // Save the assumed 0 back to tempAmount so it gets persisted correctly
        tempAmount[mId] = finalAmount;
      }`;

if (code.includes(target)) {
  code = code.replace(target, rep);
  fs.writeFileSync('src/pages/Meetings.tsx', code);
  console.log('patched');
} else {
  console.log('not found');
}
