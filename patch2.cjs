const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/const chapterSlips = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveSlips, chapterUserIds\]\);/, `const chapterSlips = useMemo(() => {
    return effectiveSlips.filter(slip => 
      usePersonalStats ? (userCandidateIds.includes(slip.fromUserId) || userCandidateIds.includes(slip.toUserId)) : (chapterUserIds.includes(slip.fromUserId) || chapterUserIds.includes(slip.toUserId))
    );
  }, [effectiveSlips, chapterUserIds, userCandidateIds, usePersonalStats]);`);

code = code.replace(/const chapterReferralsList = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveReferrals, chapterUserIds\]\);/, `const chapterReferralsList = useMemo(() => {
    return effectiveReferrals.filter(ref => 
      usePersonalStats ? (userCandidateIds.includes(ref.fromUserId) || userCandidateIds.includes(ref.toUserId)) : (chapterUserIds.includes(ref.fromUserId) || chapterUserIds.includes(ref.toUserId))
    );
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, usePersonalStats]);`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
