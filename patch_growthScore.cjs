const fs = require('fs');

let content = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const newGetTasks = `export function getWorkspaceChecklistTasks(
  profile: any,
  activities: {
    allReferrals?: any[];
    oneToOnes?: any[];
    meetings?: any[];
    guestInvitations?: any[];
    allSlips?: any[];
    testimonials?: any[];
  } = {},
  activeDateRange?: { start: Date; end: Date }
): WorkspaceTask[] {
  if (!profile) return [];
  const userId = profile.uid || profile.id;

  const {
    allReferrals = [],
    oneToOnes = [],
    meetings = [],
    guestInvitations = [],
    allSlips = [],
    testimonials = []
  } = activities;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let start = activeDateRange?.start ? new Date(activeDateRange.start) : new Date(today);
  start.setHours(0, 0, 0, 0);
  
  let end = activeDateRange?.end ? new Date(activeDateRange.end) : new Date(today);
  end.setHours(23, 59, 59, 999);
  
  if (end.getTime() - start.getTime() > 365 * 24 * 60 * 60 * 1000) {
    start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  const allTasks: WorkspaceTask[] = [];

  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + 1)) {
    const dStart = new Date(current);
    dStart.setHours(0, 0, 0, 0);
    const dEnd = new Date(current);
    dEnd.setHours(23, 59, 59, 999);
    
    const isDateInRange = (dateInput: any) => {
      if (!dateInput) return false;
      try {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return false;
        return d.getTime() >= dStart.getTime() && d.getTime() <= dEnd.getTime();
      } catch {
        return false;
      }
    };

    const rawTasks: any[] = [];
    const dateStr = formatDateKey(dStart);

    const isProfileCompleteAuto = calculateProfileCompletion(profile).isComplete;
    
    // Only show profile task if it is incomplete OR it was updated during this specific day.
    // If it's complete but updated earlier, it won't show.
    if (!isProfileCompleteAuto || isDateInRange(profile.updated_at || profile.created_at)) {
      rawTasks.push({
        key: \`task_complete_profile_\${dateStr}\`,
        label: 'Complete Your Profile',
        desc: 'Fill all required profile details.',
        autoDone: isProfileCompleteAuto,
        link: '/profile',
        linkText: isProfileCompleteAuto ? 'VIEW' : 'COMPLETE',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10'
      });
    }

    const hasGuestAuto = guestInvitations.some(g => {
      const creator = g.createdBy || g.member_id || g.invited_by || g.user_id;
      return creator === userId && g.status !== 'Cancelled' && g.status !== 'Invalid' && isDateInRange(g.created_at || g.createdAt || g.date);
    });
    rawTasks.push({
      key: \`task_invite_guest_\${dateStr}\`,
      label: 'Invite a New Guest',
      desc: 'Invite a guest to join your chapter.',
      autoDone: hasGuestAuto,
      link: '/guests',
      linkText: hasGuestAuto ? 'VIEW' : 'INVITE',
      iconColor: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    });

    const hasPassRefAuto = allReferrals.some(r => {
      const sender = r.fromUserId || r.sender_id || r.authorMemberId;
      return sender === userId && isDateInRange(r.created_at || r.createdAt || r.date);
    });
    rawTasks.push({
      key: \`task_pass_referral_\${dateStr}\`,
      label: 'Pass Referral',
      desc: 'Pass a referral to a chapter member.',
      autoDone: hasPassRefAuto,
      link: '/refer',
      linkText: hasPassRefAuto ? 'VIEW' : 'PASS REFERRAL',
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    });

    const hasScheduleMeetingAuto = oneToOnes.some(m => {
      const isCreator = m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || m.created_by === userId || m.createdBy === userId;
      return isCreator && isDateInRange(m.created_at || m.createdAt || m.meeting_date || m.date);
    }) || meetings.some(m => {
      const isCreator = m.created_by === userId || m.createdBy === userId;
      return isCreator && isDateInRange(m.created_at || m.createdAt || m.meeting_date || m.date);
    });
    rawTasks.push({
      key: \`task_schedule_meeting_\${dateStr}\`,
      label: 'Schedule Meeting',
      desc: 'Schedule a 1-to-1 or chapter meeting.',
      autoDone: hasScheduleMeetingAuto,
      link: '/one-to-one',
      linkText: hasScheduleMeetingAuto ? 'VIEW' : 'SCHEDULE',
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    });
    
    // 5. One-to-One Meeting completed
    const has121Auto = oneToOnes.some(m => {
      const isParticipant = (
        m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || 
        m.member_id === userId || m.receiver_id === userId || (m.participantIds || []).includes(userId)
      );
      if (!isParticipant) return false;
      const userAtt = (m.attendance || {})[userId];
      const isCompleted = m.status === 'COMPLETED' || userAtt === 'PRESENT' || userAtt === 'Present' || Boolean(m.completed_at);
      return isCompleted && isDateInRange(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt);
    });
    rawTasks.push({
      key: \`task_one_to_one_\${dateStr}\`,
      label: 'One-to-One Meeting',
      desc: 'Complete today\\'s scheduled 1-to-1 meeting.',
      autoDone: has121Auto,
      link: '/one-to-one',
      linkText: has121Auto ? 'VIEW' : 'COMPLETE 1-ON-1',
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    });
    
    // 6. Attend Chapter Meeting
    const hasAttendMeetingAuto = meetings.some(m => {
      const matchChapter = String(m.chapter_id || m.chapterId) === String(profile.chapter_id || profile.chapterId);
      const att = (m.attendance || {})[userId];
      const isPresent = att === 'Present' || att === 'PRESENT' || att === 'Yes' || att === 'YES' || att === 'Substitute' || att === 'SUBSTITUTE';
      return (matchChapter || Boolean(m.id)) && isPresent && isDateInRange(m.meeting_date || m.date || m.created_at || m.createdAt);
    });
    rawTasks.push({
      key: \`task_chapter_meeting_\${dateStr}\`,
      label: 'Attend Chapter Meeting',
      desc: 'Attend your chapter meeting.',
      autoDone: hasAttendMeetingAuto,
      link: '/meetings',
      linkText: hasAttendMeetingAuto ? 'VIEW' : 'ATTEND',
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    });

    const completedReceivedReferrals = allReferrals.filter(r => {
      const receiver = r.toUserId || r.receiver_id || r.receiverMemberId;
      const statusNorm = String(r.status || '').toUpperCase();
      return String(receiver) === String(userId) && (statusNorm === 'COMPLETED' || statusNorm === 'CONVERTED') && isDateInRange(r.updated_at || r.updatedAt || r.created_at || r.createdAt || r.date);
    });

    completedReceivedReferrals.forEach(ref => {
      const hasSlip = allSlips.some(s => {
        const refMatch = String(s.referralId || s.referral_id) === String(ref.id);
        const userMatch = String(s.fromUserId || s.sender_id || s.submitted_by) === String(userId);
        return refMatch || (userMatch && refMatch);
      });
      rawTasks.push({
        key: \`task_thank_you_slip_\${ref.id}_\${dateStr}\`,
        label: 'Send Thank You Slip',
        desc: \`Send a Thank You Slip for referral (\${ref.contactName || ref.customer_name || 'Completed Referral'}).\`,
        autoDone: hasSlip,
        link: \`/thank-you-slips?referralId=\${ref.id}\`,
        linkText: hasSlip ? 'VIEW' : 'SEND SLIP',
        iconColor: 'text-teal-400',
        bgColor: 'bg-teal-500/10'
      });
    });

    const totalTasksCount = rawTasks.length;
    // Score Formula: 100 / Today's Total Tasks
    const pointsPerTask = totalTasksCount > 0 ? Number((100 / totalTasksCount).toFixed(1)) : 0;

    const formattedTasks = rawTasks.map(t => ({
      key: t.key,
      label: t.label,
      desc: t.desc,
      pointsVal: pointsPerTask,
      isDone: Boolean(t.autoDone),
      link: t.link,
      linkText: Boolean(t.autoDone) ? 'VIEW' : t.linkText,
      iconColor: t.iconColor,
      bgColor: t.bgColor,
      date: dateStr 
    }));

    allTasks.push(...formattedTasks);
  }

  return allTasks.reverse();
}`;

let startIdx = content.indexOf('export function getWorkspaceChecklistTasks(');
let endIdx = content.indexOf('export function calculateMemberGrowthScoreData');
content = content.substring(0, startIdx) + newGetTasks + '\n\n' + content.substring(endIdx);

fs.writeFileSync('src/utils/growthScore.ts', content);
