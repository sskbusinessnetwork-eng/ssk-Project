const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(/const businessSentSlips = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveSlips, chapterUserIds, appliedMemberFilter, profile\]\);/, `const businessSentSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const subBy = String(s.submitted_by || s.fromUserId || s.from_user_id || '');
        return subBy === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const subBy = String(s.submitted_by || s.fromUserId || s.from_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(subBy) : chapterUserIds.includes(subBy);
    });
  }, [effectiveSlips, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`);

code = code.replace(/const businessReceivedSlips = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveSlips, chapterUserIds, appliedMemberFilter, profile\]\);/, `const businessReceivedSlips = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveSlips.filter(s => {
        const sendBy = String(s.receiver_id || s.toUserId || s.to_user_id || '');
        return sendBy === String(appliedMemberFilter);
      });
    }
    return effectiveSlips.filter(s => {
      const sendBy = String(s.receiver_id || s.toUserId || s.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(sendBy) : chapterUserIds.includes(sendBy);
    });
  }, [effectiveSlips, chapterUserIds, userCandidateIds, appliedMemberFilter, profile, usePersonalStats]);`);

code = code.replace(/const referralsSentList = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveReferrals, chapterUserIds, profile, appliedMemberFilter\]\);/, `const referralsSentList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveReferrals.filter(r => String(r.fromUserId || r.sender_id || r.from_user_id || '') === String(appliedMemberFilter));
    }
    return effectiveReferrals.filter(r => {
      const senderId = String(r.fromUserId || r.sender_id || r.from_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(senderId) : chapterUserIds.includes(senderId);
    });
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);`);

code = code.replace(/const referralsReceivedList = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveReferrals, chapterUserIds, profile, appliedMemberFilter\]\);/, `const referralsReceivedList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveReferrals.filter(r => String(r.toUserId || r.receiver_id || r.to_user_id || '') === String(appliedMemberFilter));
    }
    return effectiveReferrals.filter(r => {
      const receiverId = String(r.toUserId || r.receiver_id || r.to_user_id || '');
      return usePersonalStats ? userCandidateIds.includes(receiverId) : chapterUserIds.includes(receiverId);
    });
  }, [effectiveReferrals, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);`);

code = code.replace(/const testimonialsGivenList = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveTestimonials, chapterUserIds, profile, appliedMemberFilter\]\);/, `const testimonialsGivenList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveTestimonials.filter(t => String(t.authorMemberId || t.author_id || t.fromUserId || '') === String(appliedMemberFilter));
    }
    return effectiveTestimonials.filter(t => {
      const authorId = String(t.authorMemberId || t.author_id || t.fromUserId || '');
      return usePersonalStats ? userCandidateIds.includes(authorId) : chapterUserIds.includes(authorId);
    });
  }, [effectiveTestimonials, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);`);

code = code.replace(/const testimonialsReceivedList = useMemo\(\(\) => \{[\s\S]*?\}, \[effectiveTestimonials, chapterUserIds, profile, appliedMemberFilter\]\);/, `const testimonialsReceivedList = useMemo(() => {
    if (profile?.role === 'MASTER_ADMIN' && appliedMemberFilter !== 'ALL') {
      return effectiveTestimonials.filter(t => String(t.recipientMemberId || t.recipient_id || t.toUserId || '') === String(appliedMemberFilter));
    }
    return effectiveTestimonials.filter(t => {
      const recipientId = String(t.recipientMemberId || t.recipient_id || t.toUserId || '');
      return usePersonalStats ? userCandidateIds.includes(recipientId) : chapterUserIds.includes(recipientId);
    });
  }, [effectiveTestimonials, chapterUserIds, userCandidateIds, profile, appliedMemberFilter, usePersonalStats]);`);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
