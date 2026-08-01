const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/const weeklyMeetingAttendance = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveMeetings, profile\]\);/, `const weeklyMeetingAttendance = useMemo(() => {
    const chapterMeetings = profile?.role === 'MASTER_ADMIN' 
      ? effectiveMeetings 
      : effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id);
    const completedMeetings = chapterMeetings.filter(m => m.isCompleted === true || (m.isCompleted as any) === 'true' || m.status === 'COMPLETED');
    if (completedMeetings.length === 0) return 0;
    
    let totalPresent = 0;
    let totalRecords = 0;
    
    if (usePersonalStats && profile) {
       const uid = String(profile.id || profile.uid);
       completedMeetings.forEach(m => {
          totalRecords++;
          if (m.attendance && m.attendance[uid]) {
             if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(m.attendance[uid]))) {
                totalPresent++;
             }
          }
       });
       return totalRecords === 0 ? 0 : Math.round((totalPresent / totalRecords) * 100);
    }

    completedMeetings.forEach(m => {
      if (m.attendance) {
        Object.values(m.attendance).forEach(status => {
          totalRecords++;
          if (['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(status))) {
            totalPresent++;
          }
        });
      }
    });
    return totalRecords === 0 ? 0 : Math.round((totalPresent / totalRecords) * 100);
  }, [effectiveMeetings, profile, usePersonalStats]);`);


code = code.replace(/const chapterMeetingsCount = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveMeetings, profile\]\);/, `const chapterMeetingsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveMeetings.length;
    }
    if (usePersonalStats) {
       const uid = String(profile?.id || profile?.uid);
       return effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id && m.attendance && m.attendance[uid] && ['PRESENT', 'Yes', 'Substitute', 'Late', 'YES', 'SUBSTITUTE'].includes(String(m.attendance[uid]))).length;
    }
    return effectiveMeetings.filter(m => m.chapter_id === profile?.chapter_id).length;
  }, [effectiveMeetings, profile, usePersonalStats]);`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
