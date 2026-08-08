import { supabase } from '../lib/supabaseClient';
import { calculateProfileCompletion } from './profileUtils';

export interface MemberActivitiesInput {
  attendancePercent?: number;
  completedOneToOnes?: number;
  referralsSent?: number;
  referralsReceived?: number;
  thankYouSlipsSent?: number;
  thankYouSlipsReceived?: number;
  guestInvites?: number;
  testimonialsSubmitted?: number;
  isProfileComplete?: boolean;
  isSubscriptionActive?: boolean;
}

export interface GrowthTrendResult {
  percentage: number;
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
}

export interface GrowthScoreResult {
  score: number;
  status: 'Needs Action' | 'On Track' | 'Excellent';
  statusColor: string;
}

export interface WorkspaceTask {
  key: string;
  label: string;
  desc: string;
  pointsVal: number;
  isDone: boolean;
  isFailed?: boolean;
  isHidden?: boolean;
  link?: string;
  linkText?: string;
  iconColor?: string;
  bgColor?: string;
}

export interface GrowthScoreDetailedResult {
  score: number;
  totalEarned: number;
  maxPossible: number;
  daily_score: number;
  daily_max_score: number;
  monthly_score: number;
  monthly_max_score: number;
  growth_score: number;
  completed_tasks: number;
  total_tasks: number;
  analysed_days: number;
  daysAnalysed: number;
  daysAnalysedText: string;
  scoreText: string;
  status: 'Needs Action' | 'On Track' | 'Excellent';
  statusColor: string;
  membersAnalysed?: number;
  tasks?: WorkspaceTask[];
}

export function isToday(dateInput: any): boolean {
  if (!dateInput) return false;
  try {
    const key = formatDateKey(dateInput);
    if (!key) return false;
    const todayKey = formatDateKey(new Date());
    return key === todayKey;
  } catch {
    return false;
  }
}

/**
 * Format any date object or ISO string into a local YYYY-MM-DD string key
 */
export function formatDateKey(dateInput: any): string {
  if (!dateInput) return '';
  try {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

/**
 * Sync growth score and workspace checklist state directly to Supabase users table
 */
export async function syncGrowthScoreToDatabase(userId: string, scoreData: any, checklistObj?: any) {
  if (!userId) return;
  try {
    let payload: any = {};
    if (typeof scoreData === 'number') {
      payload = {
        growth_score: scoreData,
        daily_score: scoreData,
        daily_max_score: 100
      };
    } else if (typeof scoreData === 'object' && scoreData !== null) {
      payload = {
        growth_score: scoreData.score ?? scoreData.growth_score ?? 0,
        daily_score: scoreData.daily_score ?? scoreData.score ?? 0,
        daily_max_score: scoreData.daily_max_score ?? 100,
        monthly_score: scoreData.monthly_score ?? 0,
        monthly_max_score: scoreData.monthly_max_score ?? 3000,
        completed_tasks: scoreData.completed_tasks ?? scoreData.totalEarned ?? 0,
        total_tasks: scoreData.total_tasks ?? scoreData.maxPossible ?? 0,
        analysed_days: scoreData.analysed_days ?? scoreData.daysAnalysed ?? 1,
      };
    }
    if (checklistObj) {
      payload.workspace_checklist = checklistObj;
    }
    await supabase
      .from('users')
      .update(payload)
      .or(`id.eq.${userId},uid.eq.${userId}`);
  } catch (err) {
    console.warn("Failed to sync growth score to database:", err);
  }
}

/**
 * Single source of truth for generating Workspace Checklist tasks and their completed status.
 * Configured tasks & points (Total Max = 100 points):
 * 1. Complete Profile: 10 pts
 * 2. Invite Guest: 15 pts
 * 3. Pass Referral: 15 pts
 * 4. Receive Referral: 10 pts
 * 5. Attend Chapter Meeting: 15 pts
 * 6. One-to-One Meeting: 15 pts
 * 7. Send Thank You Slip: 10 pts
 * 8. Submit Testimonial: 10 pts
 */
export function getWorkspaceChecklistTasks(
  profile: any,
  activities: {
    allReferrals?: any[];
    oneToOnes?: any[];
    meetings?: any[];
    guestInvitations?: any[];
    allSlips?: any[];
    testimonials?: any[];
    allUsers?: any[];
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
    testimonials = [],
    allUsers = []
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
        let d = new Date(dateInput);
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
          const [year, month, day] = dateInput.split('-').map(Number);
          d = new Date(year, month - 1, day);
        }
        if (isNaN(d.getTime())) return false;
        
        const dLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const currentLocal = new Date(current.getTime() - current.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        if (dLocal === currentLocal) return true;

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
        key: `task_complete_profile_${dateStr}`,
        label: 'Complete Your Profile',
        desc: 'Fill all required profile details.',
        autoDone: isProfileCompleteAuto,
        link: '/profile',
        linkText: isProfileCompleteAuto ? 'VIEW' : 'COMPLETE',
        iconColor: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        pointsVal: 100
      });
    }

    const hasGuestAuto = guestInvitations.some(g => {
      const creator = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.member_id || g.user_id || g.inviterId || g.inviter_id || '').trim();
      return creator === String(userId) && g.status !== 'Cancelled' && g.status !== 'Invalid' && (isDateInRange(g.created_at || g.createdAt || g.date) || (!isNaN(new Date(g.created_at || g.createdAt || g.date).getTime()) && Math.abs(new Date().getTime() - new Date(g.created_at || g.createdAt || g.date).getTime()) < 30 * 24 * 60 * 60 * 1000));
    });
    rawTasks.push({
      key: `task_invite_guest_${dateStr}`,
      label: 'Invite a New Guest',
      desc: 'Invite a guest to join your chapter.',
      autoDone: hasGuestAuto,
      link: hasGuestAuto ? '/guests' : '/guests?action=new',
      linkText: hasGuestAuto ? 'VIEW' : 'INVITE',
      iconColor: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    });

    const hasPassRefAuto = allReferrals.some(r => {
      const sender = r.fromUserId || r.sender_id || r.authorMemberId;
      return sender === userId && (isDateInRange(r.created_at || r.createdAt || r.date) || (!isNaN(new Date(r.created_at || r.createdAt || r.date).getTime()) && Math.abs(new Date().getTime() - new Date(r.created_at || r.createdAt || r.date).getTime()) < 30 * 24 * 60 * 60 * 1000));
    });
    rawTasks.push({
      key: `task_pass_referral_${dateStr}`,
      label: 'Pass Referral',
      desc: 'Pass a referral to a chapter member.',
      autoDone: hasPassRefAuto,
      link: hasPassRefAuto ? '/referrals' : '/referrals?action=new',
      linkText: hasPassRefAuto ? 'VIEW' : 'PASS REFERRAL',
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    });

    const hasScheduleMeetingAuto = oneToOnes.some(m => {
      const isCreator = m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || m.created_by === userId || m.createdBy === userId;
      return isCreator && isDateInRange(m.created_at || m.createdAt || m.meeting_date || m.date);
    }) || meetings.some(m => {
      const isCreator = m.created_by === userId || m.createdBy === userId || m.adminId === userId || m.admin_id === userId;
      return isCreator && isDateInRange(m.created_at || m.createdAt || m.meeting_date || m.date);
    });
    rawTasks.push({
      key: `task_schedule_meeting_${dateStr}`,
      label: 'Schedule Meeting',
      desc: 'Schedule a 1-to-1 or chapter meeting.',
      autoDone: hasScheduleMeetingAuto,
      link: hasScheduleMeetingAuto ? '/one-to-one' : '/one-to-one?action=new',
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
      return isCompleted && (isDateInRange(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt) || (!isNaN(new Date(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt).getTime()) && Math.abs(new Date().getTime() - new Date(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000));
    });
    rawTasks.push({
      key: `task_one_to_one_${dateStr}`,
      label: 'One-to-One Meeting',
      desc: 'Complete today\'s scheduled 1-to-1 meeting.',
      autoDone: has121Auto,
      link: has121Auto ? '/one-to-one' : '/one-to-one?action=new',
      linkText: has121Auto ? 'VIEW' : 'COMPLETE 1-ON-1',
      iconColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    });
    
    // 6. Attend Chapter Meeting
    const userChapterId = String(profile.chapter_id || profile.chapterId || '').trim();

    const getMeetingStartTimeMs = (m: any): number => {
      const rawDate = m.date || m.meeting_date || m.created_at || m.createdAt;
      if (!rawDate) return 0;
      let d = new Date(rawDate);
      if (isNaN(d.getTime())) return 0;
      if (m.time && typeof m.time === 'string') {
        const timeStr = m.time.trim();
        const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
        if (match) {
          let hours = parseInt(match[1], 10);
          const minutes = parseInt(match[2], 10);
          const ampm = match[3];
          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          }
          d.setHours(hours, minutes, 0, 0);
        }
      }
      return d.getTime();
    };

    const userChapterMeetings = meetings.filter(m => {
      const mChap = String(m.chapter_id || m.chapterId || '').trim();
      return !userChapterId || !mChap || mChap === userChapterId;
    });

    let meetingTaskToRender: {
      meeting: any;
      taskIsVisible: boolean;
      taskIsCompleted: boolean;
      isAbsent: boolean;
    } | null = null;

    const nowMs = new Date().getTime();

    for (const m of userChapterMeetings) {
      const attMap = m.attendance || {};
      const userAtt = String(attMap[userId] || m.attendance_status || '').trim();
      const isPresent = ['Present', 'PRESENT', 'Yes', 'YES', 'Substitute', 'SUBSTITUTE'].includes(userAtt);
      const isAbsent = ['Absent', 'ABSENT', 'No', 'NO'].includes(userAtt);
      const isMarked = isPresent || isAbsent;

      const meetingStartMs = getMeetingStartTimeMs(m);
      const windowStartMs = meetingStartMs > 0 ? meetingStartMs - (24 * 60 * 60 * 1000) : 0;
      const windowEndMs = meetingStartMs > 0 ? meetingStartMs + (12 * 60 * 60 * 1000) : 0;

      let taskIsVisible = false;
      let taskIsCompleted = false;

      if (isMarked) {
        taskIsVisible = true;
        taskIsCompleted = true;
      } else if (meetingStartMs > 0) {
        if (nowMs >= windowStartMs && nowMs <= windowEndMs) {
          taskIsVisible = true;
          taskIsCompleted = false;
        } else if (nowMs > windowEndMs && (nowMs - windowEndMs) < 7 * 24 * 60 * 60 * 1000) {
          taskIsVisible = true;
          taskIsCompleted = false;
        } else {
          taskIsVisible = false;
          taskIsCompleted = false;
        }
      } else if (m.id) {
        taskIsVisible = true;
        taskIsCompleted = false;
      }

      if (taskIsVisible) {
        if (!meetingTaskToRender || (!meetingTaskToRender.taskIsCompleted && taskIsCompleted)) {
          meetingTaskToRender = {
            meeting: m,
            taskIsVisible,
            taskIsCompleted,
            isAbsent
          };
        } else if (!meetingTaskToRender.taskIsCompleted && !taskIsCompleted) {
          meetingTaskToRender = {
            meeting: m,
            taskIsVisible,
            taskIsCompleted,
            isAbsent
          };
        }
      }
    }

    if (meetingTaskToRender && meetingTaskToRender.taskIsVisible) {
      const targetMeetingId = meetingTaskToRender.meeting.id;
      rawTasks.push({
        key: `task_chapter_meeting_${targetMeetingId || dateStr}`,
        label: 'Attend Chapter Meeting',
        desc: meetingTaskToRender.taskIsCompleted
          ? (meetingTaskToRender.isAbsent ? 'Attendance Recorded (Absent).' : 'Attended chapter meeting.')
          : `Attend chapter meeting "${meetingTaskToRender.meeting.title || 'Weekly Chapter Meeting'}".`,
        autoDone: meetingTaskToRender.taskIsCompleted,
        noPoints: meetingTaskToRender.isAbsent,
        link: targetMeetingId ? `/meetings?meetingId=${targetMeetingId}&attend=true` : '/meetings?attend=true',
        linkText: meetingTaskToRender.taskIsCompleted ? 'VIEW' : 'ATTEND',
        iconColor: 'text-purple-400',
        bgColor: 'bg-purple-500/10'
      });
    }

    // 7. Referral Conversion & Thank You Slip Workflow
    const receivedReferrals = allReferrals.filter(r => {
      const receiver = r.toUserId || r.receiver_id || r.to_user_id || r.receiverMemberId;
      return String(receiver || '') === String(userId) && isDateInRange(r.updated_at || r.updatedAt || r.created_at || r.createdAt || r.date);
    });

    receivedReferrals.forEach(ref => {
      const statusNorm = String(ref.status || '').toUpperCase();
      const isConverted = statusNorm === 'CONVERTED' || statusNorm === 'COMPLETED';

      // Find referring member (sender) name
      const senderId = ref.fromUserId || ref.sender_id || ref.from_user_id || ref.authorMemberId || ref.submitted_by;
      const referringMember = (allUsers || []).find((u: any) =>
        String(u.id || '').trim() === String(senderId || '').trim() ||
        String(u.uid || '').trim() === String(senderId || '').trim()
      );
      const senderName = referringMember?.name || (referringMember as any)?.full_name || referringMember?.displayName || ref.fromUserName || ref.from_user_name || 'Unknown Member';

      // Check if Thank You Slip exists for this referral
      const hasSlip = allSlips.some(s => {
        const refMatch = String(s.referralId || s.referral_id || '') === String(ref.id || '');
        const userMatch = String(s.fromUserId || s.sender_id || s.submitted_by || s.from_user_id || '') === String(userId || '');
        return refMatch || (userMatch && refMatch);
      });

      const contactOrCustomerName = ref.contactName || ref.contact_name || ref.customerName || ref.customer_name || 'Referral';

      if (!isConverted) {
        // Step 1 & Step 2: "Update Referral" task (Pending until referral status is updated to Converted)
        rawTasks.push({
          key: `task_update_referral_${ref.id}_${dateStr}`,
          label: 'Update Referral',
          desc: `Update referral status for ${contactOrCustomerName} received from ${senderName}.`,
          autoDone: false,
          link: '/referrals',
          linkText: 'UPDATE',
          iconColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10'
        });
      } else {
        // Step 3 & Step 4: Referral is Converted! Replace "Update Referral" with "Send Thank You Slip to <Referring Member Name>"
        rawTasks.push({
          key: `task_thank_you_slip_${ref.id}_${dateStr}`,
          label: `Send Thank You Slip to ${senderName}`,
          desc: `Send a Thank You Slip to ${senderName} for converted referral (${contactOrCustomerName}).`,
          autoDone: hasSlip,
          link: hasSlip ? '/thank-you-slips' : `/thank-you-slips?referralId=${ref.id}&action=new`,
          linkText: hasSlip ? 'VIEW' : 'SEND SLIP',
          iconColor: 'text-teal-400',
          bgColor: 'bg-teal-500/10'
        });
      }
    });

    const completedReceivedReferrals = receivedReferrals.filter(r => {
      const statusNorm = String(r.status || '').toUpperCase();
      return statusNorm === 'CONVERTED' || statusNorm === 'COMPLETED';
    });


    // 8. Give Testimonial Task (Assigned to Referral Sender AFTER Thank You Slip is submitted by Receiver)
    const sentReferrals = allReferrals.filter(r => {
      const sender = r.fromUserId || r.sender_id || r.from_user_id || r.authorMemberId || r.submitted_by;
      return String(sender || '') === String(userId) && isDateInRange(r.updated_at || r.updatedAt || r.created_at || r.createdAt || r.date);
    });

    let createdRefTestimonialTask = false;

    sentReferrals.forEach(ref => {
      // Step 5: ONLY AFTER the Thank You Slip is successfully submitted by Referral Receiver
      const hasSlip = allSlips.some(s => String(s.referralId || s.referral_id || '') === String(ref.id || ''));

      if (hasSlip) {
        createdRefTestimonialTask = true;
        const receiverId = ref.toUserId || ref.receiver_id || ref.to_user_id || ref.receiverMemberId;
        const receiverMember = (allUsers || []).find((u: any) =>
          String(u.id || '').trim() === String(receiverId || '').trim() ||
          String(u.uid || '').trim() === String(receiverId || '').trim()
        );
        const receiverName = receiverMember?.name || (receiverMember as any)?.full_name || receiverMember?.displayName || ref.toUserName || ref.to_user_name || 'Chapter Member';
        const contactOrCustomerName = ref.contactName || ref.contact_name || ref.customerName || ref.customer_name || 'Referral';

        // Check if Member A (Referral Sender) has submitted a testimonial for this referral
        const hasSubmittedTestimonialForRef = testimonials.some(t => {
          const author = t.authorMemberId || t.author_id || t.fromUserId || t.authorId;
          if (String(author || '') !== String(userId || '')) return false;
          const matchRef = String(t.referral_id || t.referralId || '') === String(ref.id || '');
          const matchReceiver = String(t.receiverMemberId || t.receiver_id || t.toUserId || '') === String(receiverId || '');
          return matchRef || (matchReceiver && String(t.referral_id || t.referralId || '') === String(ref.id || ''));
        });

        rawTasks.push({
          key: `task_give_testimonial_ref_${ref.id}_${dateStr}`,
          label: `Give Testimonial to ${receiverName}`,
          desc: `Give a testimonial to ${receiverName} for completed referral (${contactOrCustomerName}).`,
          autoDone: hasSubmittedTestimonialForRef,
          link: hasSubmittedTestimonialForRef ? '/testimonials' : `/testimonials?referralId=${ref.id}&recipientId=${receiverId}&action=new`,
          linkText: hasSubmittedTestimonialForRef ? 'VIEW' : 'GIVE TESTIMONIAL',
          iconColor: 'text-indigo-400',
          bgColor: 'bg-indigo-500/10'
        });
      }
    });

    const hasSubmittedTestimonial = testimonials.some(t => {
      const author = t.authorMemberId || t.author_id || t.fromUserId || t.authorId;
      return String(author || '') === String(userId || '');
    });

    const completedOneToOnes = oneToOnes.filter(m => {
      const isParticipant = (
        String(m.organizer_id || m.creatorId || m.sender_id || m.created_by || m.createdBy) === String(userId) ||
        String(m.guest_id || m.memberId || m.receiver_id || m.target_user_id || m.withUserId) === String(userId) ||
        (m.participantIds || []).map(String).includes(String(userId))
      );
      if (!isParticipant) return false;
      const statusNorm = String(m.status || '').toUpperCase();
      return (statusNorm === 'COMPLETED' || Boolean(m.completed_at)) && (isDateInRange(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt) || (!isNaN(new Date(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt).getTime()) && Math.abs(new Date().getTime() - new Date(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000));
    });

    const hasMeetingTrigger = completedOneToOnes.length > 0;

    if (!createdRefTestimonialTask && (hasMeetingTrigger || hasSubmittedTestimonial)) {
      rawTasks.push({
        key: `task_testimonial_single_${dateStr}`,
        label: 'Give Testimonial',
        desc: 'Submit a testimonial for a chapter member.',
        autoDone: hasSubmittedTestimonial,
        link: hasSubmittedTestimonial ? '/testimonials' : '/testimonials?action=new',
        linkText: hasSubmittedTestimonial ? 'VIEW' : 'GIVE TESTIMONIAL',
        iconColor: 'text-indigo-400',
        bgColor: 'bg-indigo-500/10'
      });
    }

    // Deduplicate rawTasks by label to guarantee no duplicate tasks exist
    const deduplicatedRawTasks: typeof rawTasks = [];
    const seenTaskLabels = new Set<string>();

    for (const task of rawTasks) {
      const normLabel = task.label.trim().toLowerCase();
      if (!seenTaskLabels.has(normLabel)) {
        seenTaskLabels.add(normLabel);
        deduplicatedRawTasks.push(task);
      } else if (normLabel.includes('give testimonial') && task.autoDone) {
        const existing = deduplicatedRawTasks.find(t => t.label.trim().toLowerCase() === normLabel);
        if (existing) {
          existing.autoDone = true;
          existing.linkText = 'VIEW';
        }
      }
    }

    const totalTasksCount = deduplicatedRawTasks.length;

    // Score Formula: 100 / Today's Total Tasks
    const pointsPerTask = totalTasksCount > 0 ? Number((100 / totalTasksCount).toFixed(1)) : 0;

    const formattedTasks = deduplicatedRawTasks.map(t => ({
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
}

export function calculateMemberGrowthScoreData(input: {
  profile: any;
  allReferrals?: any[];
  oneToOnes?: any[];
  meetings?: any[];
  guestInvitations?: any[];
  allSlips?: any[];
  testimonials?: any[];
  allUsers?: any[];
  activeDateRange?: any;
  todayTasks?: any[];
}): GrowthScoreDetailedResult {
  const {
    profile,
    allReferrals = [],
    oneToOnes = [],
    meetings = [],
    guestInvitations = [],
    allSlips = [],
    testimonials = [],
    allUsers = []
  } = input;

  if (!profile) {
    return {
      score: 0,
      totalEarned: 0,
      maxPossible: 100,
      daily_score: 0,
      daily_max_score: 100,
      monthly_score: 0,
      monthly_max_score: 3000,
      growth_score: 0,
      completed_tasks: 0,
      total_tasks: 0,
      analysed_days: 1,
      daysAnalysed: 1,
      daysAnalysedText: '1 / 30',
      scoreText: '0 / 100',
      status: 'Needs Action',
      statusColor: 'bg-red-500/20 text-red-400 border-red-500/10',
      tasks: []
    };
  }

  const userId = profile.uid || profile.id;
  const tasks = getWorkspaceChecklistTasks(profile, {
    allReferrals,
    oneToOnes,
    meetings,
    guestInvitations,
    allSlips,
    testimonials,
    allUsers
  });

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isDone).length;
  
  // Calculate total score based on points earned across all tasks
  const rawScore = tasks.reduce((acc, t) => acc + (t.isDone ? (t.pointsVal || 0) : 0), 0);
  const todayScore = Math.round(rawScore);
  
  // Calculate max possible score based on date range
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;

  // Days Analysed Logic (Last 30 calendar days)
  const todayKey = formatDateKey(new Date());
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

  const activeDates = new Set<string>();

  const addDateIfValid = (dateInput: any) => {
    if (!dateInput) return;
    try {
      const d = new Date(dateInput);
      if (!isNaN(d.getTime()) && d.getTime() >= thirtyDaysAgoTime) {
        const key = formatDateKey(d);
        if (key) activeDates.add(key);
      }
    } catch {
      // ignore
    }
  };

  allReferrals.forEach(r => {
    if ((r.fromUserId || r.sender_id || r.authorMemberId) === userId || (r.toUserId || r.receiver_id || r.receiverMemberId) === userId) {
      addDateIfValid(r.created_at || r.createdAt || r.date);
    }
  });

  oneToOnes.forEach(m => {
    const isParticipant = (
      m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || 
      m.member_id === userId || m.receiver_id === userId || (m.participantIds || []).includes(userId)
    );
    if (isParticipant) {
      addDateIfValid(m.created_at || m.meeting_date || m.date);
    }
  });

  meetings.forEach(m => {
    const att = (m.attendance || {})[userId];
    // The user explicitly requires that Chapter Admins must mark themselves Present. No auto-credit for creators.
    if (att === 'Present' || att === 'PRESENT' || att === 'Yes' || att === 'YES' || att === 'Substitute' || att === 'SUBSTITUTE') {
      addDateIfValid(m.meeting_date || m.date || m.created_at || m.createdAt);
    }
  });

  guestInvitations.forEach(g => {
    const creator = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.member_id || g.user_id || g.inviterId || g.inviter_id || '').trim();
    if (creator === String(userId)) {
      addDateIfValid(g.created_at || g.date);
    }
  });

  allSlips.forEach(s => {
    if ((s.fromUserId || s.sender_id || s.authorMemberId) === userId) {
      addDateIfValid(s.created_at || s.date);
    }
  });

  testimonials.forEach(t => {
    if ((t.authorMemberId || t.sender_id || t.fromUserId) === userId) {
      addDateIfValid(t.created_at || t.date);
    }
  });

  if (completedTasksCount > 0) {
    activeDates.add(todayKey);
  }

  let analysedDaysCount = Math.min(30, Math.max(completedTasksCount > 0 ? 1 : 0, activeDates.size));
  if (profile.analysed_days && typeof profile.analysed_days === 'number') {
    analysedDaysCount = Math.min(30, Math.max(analysedDaysCount, profile.analysed_days));
  }

  const daysAnalysedText = `${analysedDaysCount} / 30`;

  // Monthly Score = sum of daily scores over analysed days, capped at 3000
  const estimatedAvgScore = todayScore > 0 ? todayScore : 70;
  const historicalDays = Math.max(0, analysedDaysCount - (completedTasksCount > 0 ? 1 : 0));
  let monthlyScore = Math.min(3000, todayScore + (historicalDays * estimatedAvgScore));
  if (profile.monthly_score && typeof profile.monthly_score === 'number') {
    monthlyScore = Math.min(3000, Math.max(monthlyScore, profile.monthly_score));
  }

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';

  if (todayScore >= 75) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (todayScore >= 50) {
    status = 'On Track';
    statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/10';
  }

  return {
    score: todayScore,
    totalEarned: completedTasksCount,
    maxPossible: maxPossible,
    daily_score: todayScore,
    daily_max_score: maxPossible,
    monthly_score: monthlyScore,
    monthly_max_score: 3000,
    growth_score: todayScore,
    completed_tasks: completedTasksCount,
    total_tasks: totalTasksCount,
    analysed_days: analysedDaysCount,
    daysAnalysed: analysedDaysCount,
    daysAnalysedText,
    scoreText: `${todayScore} / ${maxPossible}`,
    status,
    statusColor,
    tasks
  };
}

/**
 * Calculates Chapter Growth Score as the average Workspace Checklist score of all chapter members.
 */
export function calculateChapterGrowthScoreData(input: {
  chapterMembers: any[];
  allReferrals?: any[];
  oneToOnes?: any[];
  meetings?: any[];
  guestInvitations?: any[];
  allSlips?: any[];
  testimonials?: any[];
  activeDateRange?: any;
  currentProfile?: any;
  todayTasks?: any[];
}): GrowthScoreDetailedResult {
  const {
    chapterMembers = [],
    allReferrals = [],
    oneToOnes = [],
    meetings = [],
    guestInvitations = [],
    allSlips = [],
    testimonials = []
  } = input;

  const applicableMembers = chapterMembers.filter(u => (u.role || '').toUpperCase() !== 'MASTER_ADMIN');
  const N = applicableMembers.length;

  if (N === 0) {
    return {
      score: 0,
      totalEarned: 0,
      maxPossible: 100,
      daily_score: 0,
      daily_max_score: 100,
      monthly_score: 0,
      monthly_max_score: 3000,
      growth_score: 0,
      completed_tasks: 0,
      total_tasks: 0,
      analysed_days: 1,
      membersAnalysed: 0,
      daysAnalysed: 1,
      daysAnalysedText: '1 / 30',
      scoreText: '0 / 100',
      status: 'Needs Action',
      statusColor: 'bg-red-500/20 text-red-400 border-red-500/10'
    };
  }

  let totalMemberScores = 0;
  let totalAnalysedDaysSum = 0;
  let totalCompletedTasks = 0;
  let totalTasksCount = 0;

  for (const m of applicableMembers) {
    const res = calculateMemberGrowthScoreData({
      profile: m,
      allReferrals,
      oneToOnes,
      meetings,
      guestInvitations,
      allSlips,
      testimonials,
      activeDateRange: input.activeDateRange
    });
    totalMemberScores += res.score;
    totalAnalysedDaysSum += res.analysed_days;
    totalCompletedTasks += res.completed_tasks;
    totalTasksCount += res.total_tasks;
  }

  const avgScore = Math.round(totalMemberScores / N);
  const avgAnalysedDays = Math.max(1, Math.round(totalAnalysedDaysSum / N));
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const start = input.activeDateRange?.start ? new Date(input.activeDateRange.start) : new Date(today);
  start.setHours(0,0,0,0);
  const end = input.activeDateRange?.end ? new Date(input.activeDateRange.end) : new Date(today);
  end.setHours(23,59,59,999);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';

  if (avgScore >= 75) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (avgScore >= 50) {
    status = 'On Track';
    statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/10';
  }

  return {
    score: avgScore,
    totalEarned: totalCompletedTasks,
    maxPossible: maxPossible,
    daily_score: avgScore,
    daily_max_score: maxPossible,
    monthly_score: Math.min(3000, avgScore * avgAnalysedDays),
    monthly_max_score: 3000,
    growth_score: avgScore,
    completed_tasks: totalCompletedTasks,
    total_tasks: totalTasksCount,
    analysed_days: avgAnalysedDays,
    membersAnalysed: N,
    daysAnalysed: avgAnalysedDays,
    daysAnalysedText: `${avgAnalysedDays} / 30`,
    scoreText: `${avgScore} / ${maxPossible}`,
    status,
    statusColor
  };
}

export function calculateMemberGrowthScore(input: MemberActivitiesInput): GrowthScoreResult {
  const score = calculateMemberGrowthScoreData({ profile: input as any }).score;
  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';
  if (score >= 75) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (score >= 50) {
    status = 'On Track';
    statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/10';
  }
  return { score, status, statusColor };
}

export function calculateGrowthTrend(currentVal: number, previousVal: number): GrowthTrendResult {
  if (currentVal === 0 && previousVal === 0) {
    return { percentage: 0, formatted: "0%", isPositive: false, isNegative: false };
  }
  if (previousVal === 0) {
    if (currentVal > 0) {
      return { percentage: 100, formatted: "+100%", isPositive: true, isNegative: false };
    }
    return { percentage: 0, formatted: "0%", isPositive: false, isNegative: false };
  }
  const pct = Math.round(((currentVal - previousVal) / previousVal) * 100);
  if (pct > 0) {
    return { percentage: pct, formatted: `+${pct}%`, isPositive: true, isNegative: false };
  } else if (pct < 0) {
    return { percentage: pct, formatted: `${pct}%`, isPositive: false, isNegative: true };
  }
  return { percentage: 0, formatted: "0%", isPositive: false, isNegative: false };
}

export function isDateInRange(dateStrOrObj: any, startDate: Date, endDate: Date): boolean {
  if (!dateStrOrObj) return false;
  try {
    const d = new Date(dateStrOrObj);
    if (isNaN(d.getTime())) return false;
    return d.getTime() >= startDate.getTime() && d.getTime() <= endDate.getTime();
  } catch {
    return false;
  }
}
