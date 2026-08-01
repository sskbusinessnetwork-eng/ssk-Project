const fs = require('fs');

let content = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const testimonialLogic = `
    // 8. Give Testimonial Tasks
    completedReceivedReferrals.forEach(ref => {
      const senderId = ref.fromUserId || ref.sender_id || ref.authorMemberId;
      const hasTestimonial = testimonials.some(t => {
        const author = t.authorMemberId || t.sender_id || t.fromUserId;
        if (String(author) !== String(userId)) return false;
        const tRef = t.referralId || t.referral_id;
        const tRec = t.receiverMemberId || t.receiver_id || t.toUserId;
        return String(tRef) === String(ref.id) || (Boolean(senderId) && String(tRec) === String(senderId));
      });
      rawTasks.push({
        key: \`task_testimonial_ref_\${ref.id}_\${dateStr}\`,
        label: 'Give Testimonial',
        desc: 'Submit a testimonial following a successful referral.',
        autoDone: hasTestimonial,
        link: \`/testimonials?memberId=\${senderId}&refId=\${ref.id}\`,
        linkText: hasTestimonial ? 'VIEW' : 'GIVE TESTIMONIAL',
        iconColor: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10'
      });
    });

    const completedOneToOnes = oneToOnes.filter(m => {
      const isParticipant = (
        String(m.organizer_id || m.creatorId || m.sender_id || m.created_by || m.createdBy) === String(userId) ||
        String(m.guest_id || m.memberId || m.receiver_id || m.target_user_id || m.withUserId) === String(userId) ||
        (m.participantIds || []).map(String).includes(String(userId))
      );
      if (!isParticipant) return false;
      const statusNorm = String(m.status || '').toUpperCase();
      return (statusNorm === 'COMPLETED' || Boolean(m.completed_at)) && isDateInRange(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt);
    });

    completedOneToOnes.forEach(m => {
      const isOrganizer = String(m.organizer_id || m.creatorId || m.sender_id || m.created_by || m.createdBy) === String(userId);
      const otherMemberId = isOrganizer
        ? (m.guest_id || m.memberId || m.receiver_id || m.target_user_id || m.withUserId)
        : (m.organizer_id || m.creatorId || m.sender_id || m.created_by || m.createdBy);

      if (!otherMemberId) return;

      const hasTestimonial = testimonials.some(t => {
        const author = t.authorMemberId || t.sender_id || t.fromUserId;
        if (String(author) !== String(userId)) return false;
        const tMeeting = t.oneToOneId || t.one_to_one_id || t.meetingId;
        const tRec = t.receiverMemberId || t.receiver_id || t.toUserId;
        return String(tMeeting) === String(m.id) || (Boolean(otherMemberId) && String(tRec) === String(otherMemberId));
      });

      rawTasks.push({
        key: \`task_testimonial_121_\${m.id}_\${dateStr}\`,
        label: 'Give Testimonial',
        desc: 'Submit a testimonial following your 1-to-1 meeting.',
        autoDone: hasTestimonial,
        link: \`/testimonials?memberId=\${otherMemberId}&oneToOneId=\${m.id}\`,
        linkText: hasTestimonial ? 'VIEW' : 'GIVE TESTIMONIAL',
        iconColor: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10'
      });
    });

    const totalTasksCount = rawTasks.length;
`;

content = content.replace("    const totalTasksCount = rawTasks.length;", testimonialLogic);
fs.writeFileSync('src/utils/growthScore.ts', content);
