const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

// We need to fix businessSentSlips and businessReceivedSlips

const oldSent = `  const businessSentSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const subBy = String(s.fromUserId || s.from_user_id || s.submitted_by || '');
        return subBy === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const subBy = String(s.fromUserId || s.from_user_id || s.submitted_by || '');
      return usePersonalStats ? userCandidateIds.includes(subBy) : chapterUserIds.includes(subBy);
    });
  }, [effectiveSlips, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`;

const newSent = `  const businessSentSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        // Business SENT by user means they are the recipient of the Thank You Slip (toUserId)
        const recBy = String(s.toUserId || s.to_user_id || '');
        return recBy === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const recBy = String(s.toUserId || s.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(recBy) : chapterUserIds.includes(recBy);
    });
  }, [effectiveSlips, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`;

const oldRecv = `  const businessReceivedSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const recBy = String(s.toUserId || s.to_user_id || '');
        return recBy === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const recBy = String(s.toUserId || s.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(recBy) : chapterUserIds.includes(recBy);
    });
  }, [effectiveSlips, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`;

const newRecv = `  const businessReceivedSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        // Business RECEIVED by user means they submitted the Thank You Slip (fromUserId)
        const subBy = String(s.fromUserId || s.from_user_id || s.submitted_by || '');
        return subBy === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const subBy = String(s.fromUserId || s.from_user_id || s.submitted_by || '');
      return usePersonalStats ? userCandidateIds.includes(subBy) : chapterUserIds.includes(subBy);
    });
  }, [effectiveSlips, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`;

if (code.includes(oldSent) && code.includes(oldRecv)) {
  code = code.replace(oldSent, newSent);
  code = code.replace(oldRecv, newRecv);
  fs.writeFileSync('src/pages/Dashboard.tsx', code);
  console.log('SUCCESS');
} else {
  console.log('TARGET NOT FOUND');
}
