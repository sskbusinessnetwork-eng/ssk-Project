const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const scoreSnippet = `
  const chapterGrowthScoreData = useMemo(() => {
    return calculateChapterGrowthScoreData({
      chapterMembers: currentChapterMemberIds.map(id => users.find(u => u.uid === id || u.id === id)).filter(Boolean),
      activeDateRange: startDate && endDate ? { startDate, endDate } : null,
      allReferrals: referrals,
      oneToOnes: oneToOnes,
      meetings: meetings,
      guestInvitations: guestInvitations,
      currentProfile: profile,
      todayTasks: []
    });
  }, [currentChapterMemberIds, users, startDate, endDate, referrals, oneToOnes, meetings, guestInvitations, profile]);
`;

code = code.replace(/const statsSummary = useMemo/, scoreSnippet + '\n  const statsSummary = useMemo');
fs.writeFileSync('src/pages/Reports.tsx', code);
