import { supabase } from '../lib/supabaseClient';
import { calculateProfileCompletion } from './profileUtils';
import { parseSafeDate } from './dateUtils';
import { isNormalReferral } from '../types';

const IST_OFFSET_MS = 19_800_000; // Asia/Kolkata is fixed UTC+05:30 (no DST)

const IST_PARTS_FORMATTER = (() => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  } catch {
    return null;
  }
})();

function formatISTFromDate(date: Date): { year: string; month: string; day: string } {
  const ms = date.getTime();
  if (!Number.isNaN(ms) && ms >= 0) {
    const shifted = new Date(ms + IST_OFFSET_MS);
    return {
      year: String(shifted.getUTCFullYear()),
      month: String(shifted.getUTCMonth() + 1).padStart(2, "0"),
      day: String(shifted.getUTCDate()).padStart(2, "0")
    };
  }
  if (IST_PARTS_FORMATTER) {
    try {
      const parts = IST_PARTS_FORMATTER.formatToParts(date);
      const year = parts.find(p => p.type === "year")?.value;
      const month = parts.find(p => p.type === "month")?.value;
      const day = parts.find(p => p.type === "day")?.value;
      if (year && month && day) return { year, month, day };
    } catch {}
  }
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    day: String(date.getDate()).padStart(2, "0")
  };
}

export function getISTDayBounds(inputDate: Date | string | number = new Date()) {
  try {
    const date = parseSafeDate(inputDate) || new Date();
    const { year, month, day } = formatISTFromDate(date);
    const start = new Date(`${year}-${month}-${day}T00:00:00+05:30`);
    const end = new Date(`${year}-${month}-${day}T23:59:59.999+05:30`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const localStart = new Date(date);
      localStart.setHours(0, 0, 0, 0);
      const localEnd = new Date(date);
      localEnd.setHours(23, 59, 59, 999);
      return { start: localStart, end: localEnd };
    }
    return { start, end };
  } catch (e) {
    const fallbackStart = new Date();
    fallbackStart.setHours(0, 0, 0, 0);
    const fallbackEnd = new Date();
    fallbackEnd.setHours(23, 59, 59, 999);
    return { start: fallbackStart, end: fallbackEnd };
  }
}

export function getISTDateString(inputDate: Date | string | number = new Date()) {
  try {
    if (typeof inputDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      return inputDate;
    }
    const date = parseSafeDate(inputDate) || new Date();
    const { year, month, day } = formatISTFromDate(date);
    return `${year}-${month}-${day}`;
  } catch (e) {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, "0")}-${now.getDate().toString().padStart(2, "0")}`;
  }
}
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
    const d = parseSafeDate(dateInput);
    if (!d) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

const lastSyncedScoreMap = new Map<string, { sig: string; timestamp: number }>();

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

    const sig = JSON.stringify(payload);
    const prev = lastSyncedScoreMap.get(userId);
    const now = Date.now();
    if (prev && prev.sig === sig && (now - prev.timestamp < 30_000)) {
      return;
    }
    lastSyncedScoreMap.set(userId, { sig, timestamp: now });

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
  const parseISTStrToUTC = (str: string | Date) => {
    const d = parseSafeDate(str);
    if (!d) return new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  };

  const todayStr = getISTDateString(new Date());
  const startStr = activeDateRange?.start ? getISTDateString(activeDateRange.start) : todayStr;
  const endStr = activeDateRange?.end ? getISTDateString(activeDateRange.end) : todayStr;

  let startUTC = parseISTStrToUTC(startStr);
  let endUTC = parseISTStrToUTC(endStr);
  
  if (startUTC.getTime() > endUTC.getTime()) {
    const tmp = startUTC;
    startUTC = endUTC;
    endUTC = tmp;
  }
  
  if (endUTC.getTime() - startUTC.getTime() > 365 * 24 * 60 * 60 * 1000) {
    startUTC = new Date(endUTC.getTime() - 365 * 24 * 60 * 60 * 1000);
  }

  const userIdStr = String(userId || '').trim();
  const toISTDayKey = (dateInput: any): string => {
    if (!dateInput) return '';
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const d = parseSafeDate(dateInput);
    if (!d) return '';
    return getISTDateString(d);
  };

  // Pre-index users, slips, and per-day activity sets once before the day loop (O(M) instead of O(365 * M))
  const usersById = new Map<string, any>();
  for (const u of allUsers) {
    const idKey = String(u?.id || '').trim();
    const uidKey = String(u?.uid || '').trim();
    if (idKey && !usersById.has(idKey)) usersById.set(idKey, u);
    if (uidKey && !usersById.has(uidKey)) usersById.set(uidKey, u);
  }

  const firstSlipByRefId = new Map<string, any>();
  for (const s of allSlips) {
    const refIdKey = String(s.referralId || s.referral_id || '').trim();
    if (refIdKey && !firstSlipByRefId.has(refIdKey)) {
      firstSlipByRefId.set(refIdKey, s);
    }
  }

  const profileUpdatedDayKey = toISTDayKey(profile.updated_at || profile.created_at);
  const isProfileCompleteAuto = calculateProfileCompletion(profile).isComplete;

  const guestInviteDayKeys = new Set<string>();
  for (const g of guestInvitations) {
    const creator = String(g.invited_by_user_id || g.invited_by || g.createdBy || g.created_by || g.member_id || g.user_id || g.inviterId || g.inviter_id || '').trim();
    if (creator === userIdStr && g.status !== 'Cancelled' && g.status !== 'Invalid') {
      const k1 = toISTDayKey(g.created_at || g.createdAt || g.date);
      const k2 = toISTDayKey(g.meeting_date || g.meetingDate);
      if (k1) guestInviteDayKeys.add(k1);
      if (k2) guestInviteDayKeys.add(k2);
    }
  }

  const passRefDayKeys = new Set<string>();
  const userReceivedReferrals: any[] = [];
  const userSentReferrals: any[] = [];
  for (const r of allReferrals) {
    const sender = String(r.fromUserId || r.from_user_id || r.sender_id || r.authorMemberId || r.submitted_by || '').trim();
    const receiver = String(r.toUserId || r.receiver_id || r.to_user_id || r.receiverMemberId || '').trim();
    const normal = isNormalReferral(r);

    if (normal && sender === userIdStr) {
      const k = toISTDayKey(r.created_at || r.createdAt || r.date);
      if (k) passRefDayKeys.add(k);
    }
    if (normal && receiver === userIdStr) {
      userReceivedReferrals.push(r);
    }
    if (sender === userIdStr) {
      userSentReferrals.push(r);
    }
  }

  const o2oDoneDayKeys = new Set<string>();
  for (const m of oneToOnes) {
    const isCreator = [m.organizer_id, m.creatorId, m.creator_id, m.sender_id, m.created_by, m.createdBy]
      .some(id => id && String(id).trim() === userIdStr);
    if (isCreator) {
      const k1 = toISTDayKey(m.created_at || m.createdAt || m.meeting_date || m.scheduled_date || m.date);
      const k2 = toISTDayKey(m.scheduled_date || m.meeting_date || m.date);
      if (k1) o2oDoneDayKeys.add(k1);
      if (k2) o2oDoneDayKeys.add(k2);
    }

    const isParticipant = isCreator ||
      [m.member_id, m.receiver_id].some(id => id && String(id).trim() === userIdStr) ||
      (m.participantIds || []).some((id: any) => String(id).trim() === userIdStr);
    if (isParticipant) {
      const o2oUserAtt = (m.attendance || {})[userId];
      const isCompleted = String(m.status || '').toUpperCase() === 'COMPLETED' || o2oUserAtt === 'PRESENT' || o2oUserAtt === 'Present' || Boolean(m.completed_at);
      if (isCompleted) {
        const k = toISTDayKey(m.completed_at || m.scheduled_date || m.meeting_date || m.date || m.created_at || m.createdAt);
        if (k) o2oDoneDayKeys.add(k);
      }
    }
  }

  const userChapterId = String(profile.chapter_id || profile.chapterId || '').trim();
  const chapterMeetingsByDay = new Map<string, any[]>();
  for (const m of meetings) {
    const mChap = String(m.chapter_id || m.chapterId || '').trim();
    if (!userChapterId || !mChap || mChap === userChapterId) {
      const dayKey = toISTDayKey(m.date || m.meeting_date || m.created_at || m.createdAt);
      if (dayKey) {
        const bucket = chapterMeetingsByDay.get(dayKey);
        if (bucket) bucket.push(m);
        else chapterMeetingsByDay.set(dayKey, [m]);
      }
    }
  }

  interface PreparedReceivedRef {
    ref: any;
    isConverted: boolean;
    createdDayKey: string;
    convertedDayKey: string;
    senderName: string;
    contactOrCustomerName: string;
    slipForRef: any;
    slipSentDayKey: string;
  }
  const receivedRefsByDay = new Map<string, PreparedReceivedRef[]>();
  const addReceivedRefToDay = (dayKey: string, entry: PreparedReceivedRef) => {
    if (!dayKey) return;
    let bucket = receivedRefsByDay.get(dayKey);
    if (!bucket) {
      bucket = [];
      receivedRefsByDay.set(dayKey, bucket);
    }
    if (!bucket.includes(entry)) bucket.push(entry);
  };

  for (const ref of userReceivedReferrals) {
    const statusNorm = String(ref.status || '').toUpperCase();
    const isConverted = statusNorm === 'CONVERTED' || statusNorm === 'COMPLETED';
    const createdDayKey = toISTDayKey(ref.created_at || ref.createdAt || ref.date);
    const convertedDayKey = isConverted ? toISTDayKey(ref.updated_at || ref.updatedAt || ref.created_at || ref.createdAt || ref.date) : '';
    const senderId = String(ref.fromUserId || ref.sender_id || ref.from_user_id || ref.authorMemberId || ref.submitted_by || '').trim();
    const referringMember = senderId ? usersById.get(senderId) : undefined;
    const senderName = referringMember?.name || (referringMember as any)?.full_name || referringMember?.displayName || ref.fromUserName || ref.from_user_name || 'Unknown Member';
    const contactOrCustomerName = ref.contactName || ref.contact_name || ref.customerName || ref.customer_name || 'Referral';
    const slipForRef = firstSlipByRefId.get(String(ref.id || '').trim());
    const slipSentDayKey = slipForRef ? toISTDayKey(slipForRef.created_at || slipForRef.createdAt || slipForRef.date) : '';

    const entry: PreparedReceivedRef = {
      ref,
      isConverted,
      createdDayKey,
      convertedDayKey,
      senderName,
      contactOrCustomerName,
      slipForRef,
      slipSentDayKey
    };
    addReceivedRefToDay(createdDayKey, entry);
    addReceivedRefToDay(convertedDayKey, entry);
    addReceivedRefToDay(slipSentDayKey, entry);
  }

  // Pre-index testimonials authored by current user by refId or receiverId
  const userAuthoredTestimonials: any[] = [];
  for (const t of testimonials) {
    const author = t.authorMemberId || t.author_id || t.fromUserId || t.authorId || t.from_user_id;
    if (String(author || '').trim() === userIdStr) {
      userAuthoredTestimonials.push(t);
    }
  }

  interface PreparedSentRefTestimony {
    ref: any;
    receiverId: string;
    receiverName: string;
    slipReceivedDayKey: string;
    testimonialForRef: any;
    testimonialSentDayKey: string;
  }
  const sentRefTestimoniesByDay = new Map<string, PreparedSentRefTestimony[]>();
  const addSentRefToDay = (dayKey: string, entry: PreparedSentRefTestimony) => {
    if (!dayKey) return;
    let bucket = sentRefTestimoniesByDay.get(dayKey);
    if (!bucket) {
      bucket = [];
      sentRefTestimoniesByDay.set(dayKey, bucket);
    }
    if (!bucket.includes(entry)) bucket.push(entry);
  };

  for (const ref of userSentReferrals) {
    const receiverId = String(ref.toUserId || ref.receiver_id || ref.to_user_id || ref.receiverMemberId || '').trim();
    const slipForRef = firstSlipByRefId.get(String(ref.id || '').trim());
    if (!slipForRef || !receiverId) continue;

    const slipReceivedDayKey = toISTDayKey(slipForRef.created_at || slipForRef.createdAt || slipForRef.date);
    const receiverMember = usersById.get(receiverId);
    const receiverName = receiverMember?.name || (receiverMember as any)?.full_name || receiverMember?.displayName || ref.toUserName || ref.to_user_name || 'the member you referred';
    const refIdStr = String(ref.id || '').trim();

    const testimonialForRef = userAuthoredTestimonials.find(t => {
      const tRefId = t.referral_id || t.referralId;
      const tReceiverId = t.receiverMemberId || t.receiver_id || t.toUserId || t.to_user_id;
      const matchRef = tRefId && String(tRefId).trim() === refIdStr;
      const matchReceiver = tReceiverId && String(tReceiverId).trim() === receiverId;
      return Boolean(matchRef || (matchReceiver && (tRefId === refIdStr || !tRefId)));
    });
    const testimonialSentDayKey = testimonialForRef
      ? toISTDayKey(testimonialForRef.created_at || testimonialForRef.createdAt || testimonialForRef.date)
      : '';

    const entry: PreparedSentRefTestimony = {
      ref,
      receiverId,
      receiverName,
      slipReceivedDayKey,
      testimonialForRef,
      testimonialSentDayKey
    };
    addSentRefToDay(slipReceivedDayKey, entry);
    addSentRefToDay(testimonialSentDayKey, entry);
  }

  const allTasks: WorkspaceTask[] = [];

  for (let currentUTC = new Date(startUTC); currentUTC <= endUTC; currentUTC.setUTCDate(currentUTC.getUTCDate() + 1)) {
    const currentIST = currentUTC.toISOString().split('T')[0];
    const dateStr = currentIST;
    const rawTasks: any[] = [];

    if (!isProfileCompleteAuto || profileUpdatedDayKey === currentIST) {
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

    const hasGuestAuto = guestInviteDayKeys.has(currentIST);
    rawTasks.push({
      key: `task_invite_guest_${dateStr}`,
      label: 'Invite Guest',
      desc: 'Invite a guest to join your chapter.',
      autoDone: hasGuestAuto,
      link: hasGuestAuto ? '/guests' : '/guests?action=new',
      linkText: hasGuestAuto ? 'VIEW' : 'INVITE GUEST',
      iconColor: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    });

    const hasPassRefAuto = passRefDayKeys.has(currentIST);
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

    const isO2ODone = o2oDoneDayKeys.has(currentIST);
    rawTasks.push({
      key: `task_schedule_meeting_${dateStr}`,
      label: 'Schedule 1-to-1 Meeting',
      desc: 'Schedule or complete a 1-to-1 meeting.',
      autoDone: isO2ODone,
      link: isO2ODone ? '/one-to-one' : '/one-to-one?action=new',
      linkText: isO2ODone ? 'VIEW' : 'SCHEDULE',
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    });

    // 6. Attend Chapter Meeting
    const dayMeetings = chapterMeetingsByDay.get(currentIST) || [];
    let meetingTaskToRender: {
      meeting: any;
      taskIsVisible: boolean;
      taskIsCompleted: boolean;
      isAbsent: boolean;
    } | null = null;

    for (const m of dayMeetings) {
      const attMap = m.attendance || {};
      const userAtt = String(attMap[userId] || m.attendance_status || '').trim();
      const isPresent = ['Present', 'PRESENT', 'Yes', 'YES', 'Substitute', 'SUBSTITUTE'].includes(userAtt);
      const isAbsent = ['Absent', 'ABSENT', 'No', 'NO'].includes(userAtt);
      const taskIsCompleted = isPresent || isAbsent;

      if (!meetingTaskToRender || (!meetingTaskToRender.taskIsCompleted && taskIsCompleted)) {
        meetingTaskToRender = {
          meeting: m,
          taskIsVisible: true,
          taskIsCompleted,
          isAbsent
        };
      } else if (!meetingTaskToRender.taskIsCompleted && !taskIsCompleted) {
        meetingTaskToRender = {
          meeting: m,
          taskIsVisible: true,
          taskIsCompleted,
          isAbsent
        };
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
    const dayReceivedRefs = receivedRefsByDay.get(currentIST);
    if (dayReceivedRefs) {
      for (const item of dayReceivedRefs) {
        const refCreatedToday = item.createdDayKey === currentIST;
        const refConvertedToday = item.isConverted && item.convertedDayKey === currentIST;
        const slipSentToday = Boolean(item.slipForRef) && item.slipSentDayKey === currentIST;

        if (refConvertedToday) {
          rawTasks.push({
            key: `task_update_referral_${item.ref.id}_${dateStr}`,
            label: 'Update Referral',
            desc: `Update referral status for ${item.contactOrCustomerName} received from ${item.senderName}.`,
            autoDone: true,
            link: '/referrals',
            linkText: 'VIEW',
            iconColor: 'text-amber-400',
            bgColor: 'bg-amber-500/10'
          });
        } else if (refCreatedToday && !item.isConverted) {
          rawTasks.push({
            key: `task_update_referral_${item.ref.id}_${dateStr}`,
            label: 'Update Referral',
            desc: `Update referral status for ${item.contactOrCustomerName} received from ${item.senderName}.`,
            autoDone: false,
            link: '/referrals',
            linkText: 'UPDATE',
            iconColor: 'text-amber-400',
            bgColor: 'bg-amber-500/10'
          });
        }

        if (slipSentToday) {
          rawTasks.push({
            key: `task_thank_you_slip_${item.ref.id}_${dateStr}`,
            label: `Send Thank You Slip to ${item.senderName}`,
            desc: `Send a Thank You Slip to ${item.senderName} for converted referral (${item.contactOrCustomerName}).`,
            autoDone: true,
            link: '/thank-you-slips',
            linkText: 'VIEW',
            iconColor: 'text-teal-400',
            bgColor: 'bg-teal-500/10'
          });
        } else if (refConvertedToday && !item.slipForRef) {
          rawTasks.push({
            key: `task_thank_you_slip_${item.ref.id}_${dateStr}`,
            label: `Send Thank You Slip to ${item.senderName}`,
            desc: `Send a Thank You Slip to ${item.senderName} for converted referral (${item.contactOrCustomerName}).`,
            autoDone: false,
            link: `/thank-you-slips?referralId=${item.ref.id}&action=new`,
            linkText: 'SEND SLIP',
            iconColor: 'text-teal-400',
            bgColor: 'bg-teal-500/10'
          });
        }
      }
    }

    // 8. Give Testimony Task
    const daySentRefs = sentRefTestimoniesByDay.get(currentIST);
    if (daySentRefs) {
      for (const item of daySentRefs) {
        const slipReceivedToday = item.slipReceivedDayKey === currentIST;
        const testimonialSentToday = Boolean(item.testimonialForRef) && item.testimonialSentDayKey === currentIST;

        if (testimonialSentToday) {
          rawTasks.push({
            key: `task_give_testimonial_ref_${item.ref.id}_${dateStr}`,
            label: `Give Testimonial to ${item.receiverName}`,
            desc: `Give a testimonial to ${item.receiverName}`,
            autoDone: true,
            link: '/testimonials',
            linkText: 'VIEW',
            iconColor: 'text-indigo-400',
            bgColor: 'bg-indigo-500/10'
          });
        } else if (slipReceivedToday && !item.testimonialForRef) {
          rawTasks.push({
            key: `task_give_testimonial_ref_${item.ref.id}_${dateStr}`,
            label: `Give Testimonial to ${item.receiverName}`,
            desc: `Give a testimonial to ${item.receiverName}`,
            autoDone: false,
            link: `/testimonials?referralId=${item.ref.id}&recipientId=${item.receiverId}&action=new`,
            linkText: 'GIVE TESTIMONY',
            iconColor: 'text-indigo-400',
            bgColor: 'bg-indigo-500/10'
          });
        }
      }
    }

    // Deduplicate rawTasks by key
    const deduplicatedRawTasks: typeof rawTasks = [];
    const seenTaskByKey = new Map<string, any>();

    for (const task of rawTasks) {
      const existing = seenTaskByKey.get(task.key);
      if (!existing) {
        seenTaskByKey.set(task.key, task);
        deduplicatedRawTasks.push(task);
      } else if (task.autoDone) {
        existing.autoDone = true;
        existing.linkText = 'VIEW';
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

  // Calculate max possible score based on subscription date range
  let subStartStr = profile.subscriptionStart || profile.subscriptionStartDate || profile.created_at || profile.createdAt;
  let subEndStr = profile.subscriptionEnd || profile.subscriptionEndDate || profile.current_subscription_end_date;
  const parsedSubStart = parseSafeDate(subStartStr);
  let parsedSubEnd = parseSafeDate(subEndStr);
  if (parsedSubStart && !parsedSubEnd) {
    parsedSubEnd = new Date(parsedSubStart);
    parsedSubEnd.setFullYear(parsedSubEnd.getFullYear() + 1);
  }
  
  const parseISTStrToUTC = (str: string | Date) => {
    const d = parseSafeDate(str);
    if (!d) return new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  };

  const todayStr = getISTDateString(new Date());
  
  let startStr = todayStr;
  let endStr = todayStr;

  if (input.activeDateRange) {
    const rawStart = input.activeDateRange.start || input.activeDateRange.startDate;
    const rawEnd = input.activeDateRange.end || input.activeDateRange.endDate;
    if (rawStart) startStr = getISTDateString(rawStart);
    if (rawEnd) endStr = getISTDateString(rawEnd);
  } else if (parsedSubStart) {
    startStr = getISTDateString(parsedSubStart);
    if (parsedSubEnd) {
      endStr = getISTDateString(parsedSubEnd);
    }
  }

  let start = parseISTStrToUTC(startStr);
  let end = parseISTStrToUTC(endStr);

  if (!input.activeDateRange && input.allUsers && input.allUsers.length > 0) {
    let chapterCreatedAt = new Date();
    for (const u of input.allUsers) {
      const cd = parseSafeDate(u.chapter_createdAt || u.created_at || u.createdAt || u.subscriptionStart);
      if (cd && cd.getTime() < chapterCreatedAt.getTime()) {
        chapterCreatedAt = cd;
      }
    }
    const chapterCreatedUTC = parseISTStrToUTC(chapterCreatedAt);
    if (chapterCreatedUTC.getTime() > start.getTime()) {
      start = chapterCreatedUTC;
    }
  }
  
  // MIN(today, end)
  const todayUTC = parseISTStrToUTC(todayStr);
  if (end.getTime() > todayUTC.getTime()) {
    end = todayUTC;
  }
  
  // If subscription hasn't started yet, or start > end
  if (start.getTime() > end.getTime()) {
    // Return early with 0 score
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

  const tasks = getWorkspaceChecklistTasks(profile, {
    allReferrals,
    oneToOnes,
    meetings,
    guestInvitations,
    allSlips,
    testimonials,
    allUsers
  }, { start, end });
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter(t => t.isDone).length;
  
  // Growth Score = Completed Tasks ÷ Total Available Tasks × 100
  let rawScore = 0;
  if (totalTasksCount > 0) {
    rawScore = (completedTasksCount / totalTasksCount) * 100;
  }
  let todayScore = Math.round(rawScore);
  
  // Enforce score cap between 0 and 100%
  todayScore = Math.min(100, Math.max(0, todayScore));
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const maxPossible = diffDays * 100;

  // Days Analysed Logic (Last 30 calendar days)
  const todayKey = getISTDateString(new Date());
  const thirtyDaysAgo = parseISTStrToUTC(todayKey);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const thirtyDaysAgoTime = thirtyDaysAgo.getTime();

  const activeDates = new Set<string>();

  const addDateIfValid = (dateInput: any) => {
    if (!dateInput) return;
    try {
      const d = parseSafeDate(dateInput);
      if (d && d.getTime() >= thirtyDaysAgoTime) {
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
    scoreText: `${todayScore}%`,
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

  const applicableMembersRaw = chapterMembers.filter(u => (u.role || '').toUpperCase() !== 'MASTER_ADMIN');
  const applicableMembersMap = new Map();
  for (const m of applicableMembersRaw) {
    const id = m.id || m.uid;
    if (id && !applicableMembersMap.has(id)) {
      applicableMembersMap.set(id, m);
    }
  }
  const applicableMembers = Array.from(applicableMembersMap.values());
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

  // 1. Determine Chapter Creation Date
  let chapterCreatedAt = new Date();
  for (const u of chapterMembers) {
    const cd = parseSafeDate(u.chapter_createdAt || u.created_at || u.createdAt || u.subscriptionStart);
    if (cd && cd.getTime() < chapterCreatedAt.getTime()) {
      chapterCreatedAt = cd;
    }
  }

  const todayStr = getISTDateString(new Date());
  
  const parseISTStrToUTC = (str: string | Date) => {
    const d = parseSafeDate(str);
    if (!d) return new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  };
  
  const todayUTC = parseISTStrToUTC(todayStr);

  // Pre-partition activity collections by member ID once so N members don't rescan all records
  const refsByUser = new Map<string, any[]>();
  const pushToUserBucket = (map: Map<string, any[]>, uid: any, item: any) => {
    const key = String(uid || '').trim();
    if (!key) return;
    const arr = map.get(key);
    if (arr) {
      if (arr[arr.length - 1] !== item) arr.push(item);
    } else {
      map.set(key, [item]);
    }
  };

  for (const r of allReferrals) {
    const sender = r.fromUserId || r.from_user_id || r.sender_id || r.authorMemberId || r.submitted_by;
    const receiver = r.toUserId || r.receiver_id || r.to_user_id || r.receiverMemberId;
    pushToUserBucket(refsByUser, sender, r);
    pushToUserBucket(refsByUser, receiver, r);
  }

  const o2oByUser = new Map<string, any[]>();
  for (const m of oneToOnes) {
    const ids = new Set<string>();
    [m.organizer_id, m.creatorId, m.creator_id, m.sender_id, m.created_by, m.createdBy, m.member_id, m.receiver_id].forEach(id => {
      if (id) ids.add(String(id).trim());
    });
    (m.participantIds || []).forEach((id: any) => {
      if (id) ids.add(String(id).trim());
    });
    ids.forEach(uid => pushToUserBucket(o2oByUser, uid, m));
  }

  const guestsByUser = new Map<string, any[]>();
  for (const g of guestInvitations) {
    const creator = g.invited_by_user_id || g.invited_by || g.createdBy || g.created_by || g.member_id || g.user_id || g.inviterId || g.inviter_id;
    pushToUserBucket(guestsByUser, creator, g);
  }

  const testimonialsByUser = new Map<string, any[]>();
  for (const t of testimonials) {
    const author = t.authorMemberId || t.author_id || t.fromUserId || t.authorId || t.from_user_id;
    pushToUserBucket(testimonialsByUser, author, t);
  }

  let totalCompletedTasks = 0;
  let totalTasksCount = 0;

  for (const m of applicableMembers) {
    const mIdKey = String(m.uid || m.id || '').trim();
    // 2. Member subscription start
    let subStart = parseSafeDate(m.subscriptionStart || m.subscriptionStartDate || m.created_at || m.createdAt);
    if (!subStart) subStart = chapterCreatedAt;

    // MAX(chapter_created_at, subscription_start)
    const startDate = new Date(Math.max(chapterCreatedAt.getTime(), subStart.getTime()));

    // 3. Member subscription end
    const subEnd = parseSafeDate(m.subscriptionEnd || m.subscriptionEndDate || m.current_subscription_end_date);

    // MIN(today, subscription_end)
    let endDate = todayUTC;
    if (subEnd && subEnd.getTime() < endDate.getTime()) {
      endDate = subEnd;
    }

    if (startDate.getTime() > endDate.getTime()) {
      continue;
    }

    // 4. Calculate tasks for this specific eligible period using pre-grouped member records
    const tasks = getWorkspaceChecklistTasks(m, {
      allReferrals: refsByUser.get(mIdKey) || [],
      oneToOnes: o2oByUser.get(mIdKey) || [],
      meetings,
      guestInvitations: guestsByUser.get(mIdKey) || [],
      allSlips,
      testimonials: testimonialsByUser.get(mIdKey) || [],
      allUsers: chapterMembers
    }, { start: startDate, end: endDate });

    totalTasksCount += tasks.length;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].isDone) totalCompletedTasks++;
    }
  }

  let chapterScore = 0;
  if (totalTasksCount > 0) {
    chapterScore = Math.round((totalCompletedTasks / totalTasksCount) * 100);
  }
  chapterScore = Math.min(100, Math.max(0, chapterScore));

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';

  if (chapterScore >= 75) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (chapterScore >= 50) {
    status = 'On Track';
    statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/10';
  }

  return {
    score: chapterScore,
    totalEarned: totalCompletedTasks,
    maxPossible: 100,
    daily_score: chapterScore,
    daily_max_score: 100,
    monthly_score: chapterScore, // unused mostly for chapter
    monthly_max_score: 100,
    growth_score: chapterScore,
    completed_tasks: totalCompletedTasks,
    total_tasks: totalTasksCount,
    analysed_days: 1,
    membersAnalysed: N,
    daysAnalysed: 1,
    daysAnalysedText: 'Lifetime',
    scoreText: `${chapterScore}%`,
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
    const d = parseSafeDate(dateStrOrObj);
    if (!d) return false;
    const s = parseSafeDate(startDate);
    const e = parseSafeDate(endDate);
    if (!s || !e) return true;
    return d.getTime() >= s.getTime() && d.getTime() <= e.getTime();
  } catch {
    return false;
  }
}

export function calculateGrowthScoreTrend(currentVal: number, previousVal: number): GrowthTrendResult {
  const diff = Math.round(currentVal - previousVal);
  return {
    percentage: diff,
    formatted: diff > 0 ? `+${diff} percentage points` : diff < 0 ? `${diff} percentage points` : "0 percentage points",
    isPositive: diff > 0,
    isNegative: diff < 0
  };
}
