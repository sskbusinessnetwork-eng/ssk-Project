const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

// chapterOneToOnes
code = code.replace(/const chapterOneToOnes = effectiveOneToOnes\.filter\(m =>\s*chapterUserIds\.includes\(m\.organizer_id\) \|\| chapterUserIds\.includes\(m\.creatorId\) \|\|\s*\(m\.participantIds \|\| \[\]\)\.some\(id => chapterUserIds\.includes\(id\)\)\s*\);/, `const chapterOneToOnes = effectiveOneToOnes.filter(m => 
      usePersonalStats 
        ? (userCandidateIds.includes(m.organizer_id) || userCandidateIds.includes(m.creatorId) || (m.participantIds || []).some(id => userCandidateIds.includes(id)))
        : (chapterUserIds.includes(m.organizer_id) || chapterUserIds.includes(m.creatorId) || (m.participantIds || []).some(id => chapterUserIds.includes(id)))
    );`);

// chapterGuestsList
code = code.replace(/const chapterGuestsList = useMemo\(\(\) => \{[\s\S]*?\}, \[guestInvitations, chapterUserIds, activeDateRange, profile\]\);/, `const chapterGuestsList = useMemo(() => {
    let list = guestInvitations;
    if (activeDateRange) {
      list = list.filter(g => isDateInRange(g.createdAt || g.created_at || g.date, activeDateRange.start, activeDateRange.end));
    }
    if (profile?.role === 'MASTER_ADMIN') {
      return list;
    }
    return list.filter(g => {
      const inviter = String(g.inviterId || g.inviter_id || '');
      return usePersonalStats ? userCandidateIds.includes(inviter) : chapterUserIds.includes(inviter);
    });
  }, [guestInvitations, chapterUserIds, userCandidateIds, activeDateRange, profile, usePersonalStats]);`);

// chapterTestimonialsCount
code = code.replace(/const chapterTestimonialsCount = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveTestimonials, chapterUserIds, profile\]\);/, `const chapterTestimonialsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') return effectiveTestimonials.length;
    return effectiveTestimonials.filter(t => {
      const from = String(t.authorMemberId || t.author_id || t.fromUserId || '');
      const to = String(t.recipientMemberId || t.recipient_id || t.toUserId || '');
      return usePersonalStats 
        ? (userCandidateIds.includes(from) || userCandidateIds.includes(to))
        : (chapterUserIds.includes(from) || chapterUserIds.includes(to));
    }).length;
  }, [effectiveTestimonials, chapterUserIds, userCandidateIds, profile, usePersonalStats]);`);

// chapterMeetings
code = code.replace(/const chapterMeetings = profile\?\.role === 'MASTER_ADMIN'\s*\?\s*effectiveMeetings\s*:\s*effectiveMeetings\.filter\(m => m\.chapter_id === profile\?\.chapter_id\);/, `const chapterMeetings = profile?.role === 'MASTER_ADMIN'
      ? effectiveMeetings
      : effectiveMeetings.filter(m => usePersonalStats ? (m.attendance && (m.attendance[profile?.id] || m.attendance[profile?.uid])) : m.chapter_id === profile?.chapter_id);`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
