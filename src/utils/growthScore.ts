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

export interface GrowthScoreDetailedResult {
  score: number;
  totalEarned: number;
  maxPossible: number;
  daysAnalysed: number;
  daysAnalysedText: string;
  scoreText: string;
  status: 'Needs Action' | 'On Track' | 'Excellent';
  statusColor: string;
  membersAnalysed?: number;
}

/**
 * Format any date object or ISO string into a local YYYY-MM-DD string key
 */
export function formatDateKey(dateInput: any): string {
  if (!dateInput) return '';
  try {
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
 * Generate a list of YYYY-MM-DD date strings for the requested range.
 * Clamps end date to today (future days must NOT reduce Growth Score).
 * If no date filter is provided, defaults to TODAY ONLY ([todayKey]).
 */
export function getDaysList(startDate?: Date | string | null, endDate?: Date | string | null): string[] {
  const now = new Date();
  const todayKey = formatDateKey(now);

  if (!startDate || !endDate) {
    return [todayKey];
  }

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return [todayKey];
  start.setHours(0, 0, 0, 0);

  const endFilter = new Date(endDate);
  if (isNaN(endFilter.getTime())) return [todayKey];
  endFilter.setHours(23, 59, 59, 999);

  // Clamp end date to today (Requirement 6: Future days must NOT reduce Growth Score)
  const effectiveEnd = endFilter < now ? endFilter : now;

  if (start > effectiveEnd) {
    return [todayKey];
  }

  const days: string[] = [];
  const curr = new Date(start);
  while (curr <= effectiveEnd) {
    const key = formatDateKey(curr);
    if (key && !days.includes(key)) {
      days.push(key);
    }
    curr.setDate(curr.getDate() + 1);
  }

  return days.length > 0 ? days : [todayKey];
}

/**
 * Calculates a user's task workspace score on a specific date (0 to 100 max points per day).
 * 1. Guest invited: 20 pts
 * 2. Pass Referral: 20 pts
 * 3. Complete Profile: 10 pts
 * 4. One-to-One Meeting: 20 pts
 * 5. Referral Received updated: 10 pts
 * 6. Attend Chapter Meeting: 20 pts
 */
export function calculateUserDailyTaskScore(
  u: any,
  dateStr: string,
  allReferrals: any[] = [],
  oneToOnes: any[] = [],
  meetings: any[] = [],
  guestInvitations: any[] = []
): number {
  if (!u || !dateStr) return 0;
  const userId = u.uid || u.id;

  // 1. Guest invited (20 pts)
  const hasGuest = guestInvitations.some(g => {
    const creator = g.createdBy || g.member_id || g.invited_by || g.user_id;
    const gDate = formatDateKey(g.createdAt || g.created_at || g.date);
    return creator === userId && gDate === dateStr && g.status !== 'Cancelled' && g.status !== 'Invalid';
  });

  // 2. Pass Referral (20 pts)
  const hasRef = allReferrals.some(r => {
    const sender = r.fromUserId || r.sender_id || r.authorMemberId;
    const rDate = formatDateKey(r.createdAt || r.created_at || r.date);
    return sender === userId && rDate === dateStr;
  });

  // 3. Complete Profile (10 pts)
  const isProfileComplete = Boolean(
    u.profile_photo && u.name && u.phone && u.email && 
    (u.business_name || u.businessName) && (u.category || u.business_category) && 
    (u.chapter_id || u.chapterId) && u.position && u.address && u.bio
  );

  // 4. One-to-One Meeting (20 pts)
  const hasOneToOne = oneToOnes.some(m => {
    const isParticipant = (
      m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || 
      m.member_id === userId || m.receiver_id === userId || (m.participantIds || []).includes(userId)
    );
    const mDate = formatDateKey(m.date || m.created_at || m.createdAt);
    if (!isParticipant || mDate !== dateStr) return false;
    const userAtt = (m.attendance || {})[userId];
    return m.status === 'COMPLETED' || userAtt === 'PRESENT';
  });

  // 5. Referral Received updated (10 pts)
  const hasUpdatedRef = allReferrals.some(r => {
    const receiver = r.toUserId || r.receiver_id || r.receiverMemberId;
    const uDate = formatDateKey(r.updated_at);
    const cDate = formatDateKey(r.created_at || r.createdAt);
    return receiver === userId && uDate === dateStr && uDate !== cDate;
  });

  // 6. Attend Chapter Meeting (20 pts)
  const hasMeeting = meetings.some(m => {
    const matchChapter = String(m.chapter_id || m.chapterId) === String(u.chapter_id || u.chapterId);
    const mDate = formatDateKey(m.date || m.meeting_date || m.createdAt || m.created_at);
    if (!matchChapter || mDate !== dateStr) return false;
    const att = (m.attendance || {})[userId];
    return att === 'Present' || att === 'PRESENT' || att === 'Yes' || att === 'YES' || att === 'Substitute' || att === 'SUBSTITUTE';
  });

  const rawScore = (hasGuest ? 20 : 0) +
                   (hasRef ? 20 : 0) +
                   (isProfileComplete ? 10 : 0) +
                   (hasOneToOne ? 20 : 0) +
                   (hasUpdatedRef ? 10 : 0) +
                   (hasMeeting ? 20 : 0);

  return Math.min(100, rawScore);
}

/**
 * Calculates Member Growth Score based on Daily Task Workspace completion data over selected date range.
 * Defaults to TODAY ONLY when no date range filter is provided.
 */
export function calculateMemberGrowthScoreData(input: {
  profile: any;
  activeDateRange?: { start?: Date | string; end?: Date | string; startDate?: string; endDate?: string } | null;
  allReferrals?: any[];
  oneToOnes?: any[];
  meetings?: any[];
  guestInvitations?: any[];
  todayTasks?: any[];
}): GrowthScoreDetailedResult {
  const {
    profile,
    activeDateRange,
    allReferrals = [],
    oneToOnes = [],
    meetings = [],
    guestInvitations = [],
    todayTasks = [],
  } = input;

  if (!profile) {
    return {
      score: 0,
      totalEarned: 0,
      maxPossible: 100,
      daysAnalysed: 1,
      daysAnalysedText: '1 Day',
      scoreText: '0 / 100',
      status: 'Needs Action',
      statusColor: 'bg-red-500/20 text-red-400 border-red-500/10'
    };
  }

  const rawStart = activeDateRange ? (activeDateRange.start || (activeDateRange as any).startDate) : null;
  const rawEnd = activeDateRange ? (activeDateRange.end || (activeDateRange as any).endDate) : null;
  const dateList = getDaysList(rawStart, rawEnd);
  const D = dateList.length;
  const todayKey = formatDateKey(new Date());

  let totalEarned = 0;
  for (const dStr of dateList) {
    if (dStr === todayKey && todayTasks && todayTasks.length > 0) {
      let todayScore = 0;
      for (const t of todayTasks) {
        if (t.pointsVal) todayScore += t.pointsVal;
      }
      totalEarned += Math.min(100, todayScore);
    } else {
      totalEarned += calculateUserDailyTaskScore(profile, dStr, allReferrals, oneToOnes, meetings, guestInvitations);
    }
  }

  const maxPossible = D * 100;
  const score = D > 0 ? Math.min(100, Math.round((totalEarned / maxPossible) * 100)) : 0;

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';

  if (score >= 75) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (score >= 50) {
    status = 'On Track';
    statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/10';
  }

  return {
    score,
    totalEarned,
    maxPossible,
    daysAnalysed: D,
    daysAnalysedText: `${D} Day${D > 1 ? 's' : ''}`,
    scoreText: `${totalEarned.toLocaleString()} / ${maxPossible.toLocaleString()}`,
    status,
    statusColor
  };
}

/**
 * Calculates Chapter Growth Score based on Daily Task Workspace completion data of all applicable chapter members.
 * Formula: Total Earned / (Total Applicable Members * Days Analysed * 100) * 100
 * Defaults to TODAY ONLY when no date range filter is provided.
 */
export function calculateChapterGrowthScoreData(input: {
  chapterMembers: any[];
  activeDateRange?: { start?: Date | string; end?: Date | string; startDate?: string; endDate?: string } | null;
  allReferrals?: any[];
  oneToOnes?: any[];
  meetings?: any[];
  guestInvitations?: any[];
  currentProfile?: any;
  todayTasks?: any[];
}): GrowthScoreDetailedResult {
  const {
    chapterMembers = [],
    activeDateRange,
    allReferrals = [],
    oneToOnes = [],
    meetings = [],
    guestInvitations = [],
    currentProfile,
    todayTasks = [],
  } = input;

  // Filter applicable chapter members (exclude MASTER_ADMIN)
  const applicableMembers = chapterMembers.filter(u => (u.role || '').toUpperCase() !== 'MASTER_ADMIN');
  const N = applicableMembers.length;

  const rawStart = activeDateRange ? (activeDateRange.start || (activeDateRange as any).startDate) : null;
  const rawEnd = activeDateRange ? (activeDateRange.end || (activeDateRange as any).endDate) : null;
  const dateList = getDaysList(rawStart, rawEnd);
  const D = dateList.length;
  const todayKey = formatDateKey(new Date());

  let totalEarned = 0;

  if (N > 0 && D > 0) {
    for (const m of applicableMembers) {
      const mId = m.uid || m.id;
      const isCurrent = currentProfile && (currentProfile.uid || currentProfile.id) === mId;

      for (const dStr of dateList) {
        if (dStr === todayKey && isCurrent && todayTasks && todayTasks.length > 0) {
          let todayScore = 0;
          for (const t of todayTasks) {
            if (t.pointsVal) todayScore += t.pointsVal;
          }
          totalEarned += Math.min(100, todayScore);
        } else {
          totalEarned += calculateUserDailyTaskScore(m, dStr, allReferrals, oneToOnes, meetings, guestInvitations);
        }
      }
    }
  }

  const maxPossible = N * D * 100;
  const score = (N > 0 && D > 0 && maxPossible > 0) ? Math.min(100, Math.round((totalEarned / maxPossible) * 100)) : 0;

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';

  if (score >= 75) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (score >= 50) {
    status = 'On Track';
    statusColor = 'bg-amber-500/20 text-amber-400 border-amber-500/10';
  }

  return {
    score,
    totalEarned,
    maxPossible,
    membersAnalysed: N,
    daysAnalysed: D,
    daysAnalysedText: `${D} Day${D > 1 ? 's' : ''}`,
    scoreText: `${totalEarned.toLocaleString()} / ${maxPossible.toLocaleString()}`,
    status,
    statusColor
  };
}

/**
 * Calculates the Growth Score (0 to 100) based strictly on completed member activities.
 */
export function calculateMemberGrowthScore(input: MemberActivitiesInput): GrowthScoreResult {
  const {
    attendancePercent = 0,
    completedOneToOnes = 0,
    referralsSent = 0,
    referralsReceived = 0,
    thankYouSlipsSent = 0,
    thankYouSlipsReceived = 0,
    guestInvites = 0,
    testimonialsSubmitted = 0,
    isProfileComplete = false,
    isSubscriptionActive = false,
  } = input;

  // Total points calculation (max capped at 100)
  const attendancePts = Math.min(20, Math.round((attendancePercent / 100) * 20));
  const oneToOnePts = Math.min(15, completedOneToOnes * 10);
  const refSentPts = Math.min(15, referralsSent * 5);
  const refRecvPts = Math.min(10, referralsReceived * 5);
  const slipsSentPts = Math.min(10, thankYouSlipsSent * 5);
  const slipsRecvPts = Math.min(10, thankYouSlipsReceived * 5);
  const guestsPts = Math.min(10, guestInvites * 5);
  const testimonialsPts = Math.min(5, testimonialsSubmitted * 5);
  const profilePts = isProfileComplete ? 5 : 0;
  const subPts = isSubscriptionActive ? 5 : 0;

  const rawScore = attendancePts + oneToOnePts + refSentPts + refRecvPts + slipsSentPts + slipsRecvPts + guestsPts + testimonialsPts + profilePts + subPts;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  let status: 'Needs Action' | 'On Track' | 'Excellent' = 'Needs Action';
  let statusColor = 'bg-red-500/20 text-red-400 border-red-500/10';

  if (score >= 80) {
    status = 'Excellent';
    statusColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/10';
  } else if (score >= 50) {
    status = 'On Track';
    statusColor = 'bg-blue-500/20 text-blue-400 border-blue-500/10';
  }

  return { score, status, statusColor };
}

/**
 * Calculates growth percentage comparing current timeframe score/count with previous timeframe score/count.
 * Formula: ((Current - Previous) / Previous) * 100
 */
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

/**
 * Helper to check if an ISO date string or Date falls within [startDate, endDate)
 */
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
