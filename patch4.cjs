const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/const chapterGuestsList = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveGuestInvitations, chapterUserIds, profile, appliedChapterFilter\]\);/, `const chapterGuestsList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedChapterFilter === 'ALL') {
      return effectiveGuestInvitations;
    }
    const myChapId = String(profile?.chapter_id || profile?.chapterId || '').trim();
    return effectiveGuestInvitations.filter(g => {
      const gChapId = String(g.chapter_id || g.chapterId || '').trim();
      const inviter = String(g.inviterId || g.inviter_id || '');
      if (usePersonalStats) return userCandidateIds.includes(inviter);
      return chapterUserIds.includes(inviter) || (gChapId && gChapId === myChapId);
    });
  }, [effectiveGuestInvitations, chapterUserIds, userCandidateIds, profile, appliedChapterFilter, usePersonalStats]);`);

// Fix oneToOneMeetingsCount which also failed because of hardcoded logic
code = code.replace(/const oneToOneMeetingsCount = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveOneToOnes, chapterUserIds, profile\]\);/, `const oneToOneMeetingsCount = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN') {
      return effectiveOneToOnes.length;
    }
    const chapterOneToOnes = effectiveOneToOnes.filter(m => 
      usePersonalStats 
        ? (userCandidateIds.includes(m.organizer_id) || userCandidateIds.includes(m.creatorId) || (m.participantIds || []).some((id: string) => userCandidateIds.includes(id)))
        : (chapterUserIds.includes(m.organizer_id) || chapterUserIds.includes(m.creatorId) || (m.participantIds && m.participantIds.some((pid: string) => chapterUserIds.includes(pid))))
    );
    return chapterOneToOnes.length;
  }, [effectiveOneToOnes, chapterUserIds, userCandidateIds, profile, usePersonalStats]);`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
