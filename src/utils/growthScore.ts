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
  // Attendance: up to 20 pts
  const attendancePts = Math.min(20, Math.round((attendancePercent / 100) * 20));
  // 1-to-1s: 10 pts each, max 15
  const oneToOnePts = Math.min(15, completedOneToOnes * 10);
  // Referrals sent: 5 pts each, max 15
  const refSentPts = Math.min(15, referralsSent * 5);
  // Referrals received: 5 pts each, max 10
  const refRecvPts = Math.min(10, referralsReceived * 5);
  // Slips sent: 5 pts each, max 10
  const slipsSentPts = Math.min(10, thankYouSlipsSent * 5);
  // Slips received: 5 pts each, max 10
  const slipsRecvPts = Math.min(10, thankYouSlipsReceived * 5);
  // Guest invites: 5 pts each, max 10
  const guestsPts = Math.min(10, guestInvites * 5);
  // Testimonials: 5 pts each, max 5
  const testimonialsPts = Math.min(5, testimonialsSubmitted * 5);
  // Profile completion: 5 pts
  const profilePts = isProfileComplete ? 5 : 0;
  // Subscription active: 5 pts
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
    return d.getTime() >= startDate.getTime() && d.getTime() < endDate.getTime();
  } catch {
    return false;
  }
}
