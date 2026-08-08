const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

const target1 = `  const businessSentSlips = useMemo(() => {
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

const replacement1 = `  const businessSentSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId));
        const senderId = ref ? String(ref.fromUserId) : String(s.toUserId || s.to_user_id || '');
        return senderId === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId));
      const senderId = ref ? String(ref.fromUserId) : String(s.toUserId || s.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(senderId) : chapterUserIds.includes(senderId);
    });
  }, [effectiveSlips, effectiveReferrals, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`;

const target2 = `  const businessReceivedSlips = useMemo(() => {
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

const replacement2 = `  const businessReceivedSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId));
        const receiverId = ref ? String(ref.toUserId) : String(s.fromUserId || s.from_user_id || s.submitted_by || '');
        return receiverId === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const ref = effectiveReferrals.find(r => String(r.id) === String(s.referralId));
      const receiverId = ref ? String(ref.toUserId) : String(s.fromUserId || s.from_user_id || s.submitted_by || '');
      return usePersonalStats ? userCandidateIds.includes(receiverId) : chapterUserIds.includes(receiverId);
    });
  }, [effectiveSlips, effectiveReferrals, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replacement1);
  code = code.replace(target2, replacement2);
  fs.writeFileSync('src/pages/Dashboard.tsx', code);
  console.log('SUCCESS Dashboard');
} else {
  console.log('TARGET NOT FOUND');
}
