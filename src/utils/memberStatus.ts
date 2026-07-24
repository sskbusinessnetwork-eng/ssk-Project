export function parseDateToYYYYMMDD(val: any): { ymd: string; date: Date | null } {
  if (!val) return { ymd: '', date: null };
  const strVal = String(val).trim();
  if (!strVal) return { ymd: '', date: null };

  let y = 0, m = 0, d = 0;

  // Check DD/MM/YYYY or DD-MM-YYYY (e.g. 24/07/2027 or 24-07-2027)
  const matchDDMMYYYY = strVal.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDDMMYYYY) {
    d = parseInt(matchDDMMYYYY[1], 10);
    m = parseInt(matchDDMMYYYY[2], 10);
    y = parseInt(matchDDMMYYYY[3], 10);
  } else {
    // Check YYYY-MM-DD or YYYY/MM/DD (e.g. 2027-07-24 or 2027/07/24)
    const matchYYYYMMDD = strVal.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (matchYYYYMMDD) {
      y = parseInt(matchYYYYMMDD[1], 10);
      m = parseInt(matchYYYYMMDD[2], 10);
      d = parseInt(matchYYYYMMDD[3], 10);
    } else {
      // Fallback Date object parsing
      const dateObj = new Date(strVal);
      if (!isNaN(dateObj.getTime())) {
        y = dateObj.getFullYear();
        m = dateObj.getMonth() + 1;
        d = dateObj.getDate();
      } else {
        return { ymd: '', date: null };
      }
    }
  }

  if (y > 0 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
    const ymd = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    // Construct local Date at 23:59:59 (end of day) so local timezone offset does not expire day early
    const date = new Date(y, m - 1, d, 23, 59, 59);
    return { ymd, date };
  }

  return { ymd: '', date: null };
}

export function getSubscriptionDates(u: any): { startDate: Date | null; endDate: Date | null; startDateStr: string; endDateStr: string } {
  if (!u) return { startDate: null, endDate: null, startDateStr: '', endDateStr: '' };

  const startVal = u.subscriptionStart || u.subscription_start || u.subscription_start_date || u.subscriptionStartDate;
  const endVal = u.subscriptionEnd || u.subscription_end || u.subscription_end_date || u.subscriptionEndDate;

  const startParsed = parseDateToYYYYMMDD(startVal);
  const endParsed = parseDateToYYYYMMDD(endVal);

  return {
    startDate: startParsed.date,
    endDate: endParsed.date,
    startDateStr: startParsed.ymd,
    endDateStr: endParsed.ymd
  };
}

export type SubscriptionStatusType = 'Active' | 'Inactive / Expired' | 'Pending';

export function getSubscriptionStatus(u: any): SubscriptionStatusType {
  if (!u) return 'Inactive / Expired';
  if (u.role === 'MASTER_ADMIN') return 'Active';

  const { startDateStr, endDateStr } = getSubscriptionDates(u);

  // If no dates are present at all
  if (!endDateStr && !startDateStr) {
    const rawStatus = (u.membership_status || u.subscription_status || u.subscriptionStatus || '').trim().toLowerCase();
    if (rawStatus === 'active') return 'Active';
    return 'Inactive / Expired';
  }

  const now = new Date();
  const todayYMD = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // If today's date is strictly AFTER Subscription End Date -> Expired
  // e.g. today "2027-07-25" > endDateStr "2027-07-24" -> Inactive / Expired
  // e.g. today "2027-07-24" > endDateStr "2027-07-24" -> false -> Active
  if (endDateStr && todayYMD > endDateStr) {
    return 'Inactive / Expired';
  }

  // If subscription has not yet started -> Pending
  if (startDateStr && todayYMD < startDateStr) {
    return 'Pending';
  }

  // Today's date is <= End Date (inclusive) -> Active
  return 'Active';
}

export function isMemberActive(u: any): boolean {
  if (!u) return false;
  if (u.role === 'MASTER_ADMIN') return true;

  // Account level suspension/inactive check
  const rawAccountStatus = (u.account_status || u.accountStatus || '').trim().toUpperCase();
  if (rawAccountStatus === 'SUSPENDED' || rawAccountStatus === 'INACTIVE') {
    return false;
  }
  
  const rawMembershipStatus = (u.membership_status || u.membershipStatus || u.status || '').trim().toUpperCase();
  if (rawMembershipStatus === 'INACTIVE') {
    return false;
  }

  if (u.is_locked === true || u.locked === true) {
    return false;
  }

  return getSubscriptionStatus(u) === 'Active';
}

export function getMemberStatusLabel(u: any): 'Active' | 'Inactive / Expired' | 'Pending' {
  if (!u) return 'Inactive / Expired';
  if (u.role === 'MASTER_ADMIN') return 'Active';
  return getSubscriptionStatus(u);
}

export function getMemberInactiveReasons(u: any): string[] {
  const reasons: string[] = [];
  if (!u) return ['No User'];
  if (u.role === 'MASTER_ADMIN') return [];

  const subStatus = getSubscriptionStatus(u);
  if (subStatus === 'Inactive / Expired') {
    const { endDateStr } = getSubscriptionDates(u);
    if (!endDateStr) {
      reasons.push('No Subscription Date');
    } else {
      reasons.push('Subscription Expired');
    }
  } else if (subStatus === 'Pending') {
    reasons.push('Subscription Not Started Yet');
  }

  const rawAccountStatus = (u.account_status || u.accountStatus || '').trim().toUpperCase();
  if (rawAccountStatus === 'SUSPENDED' || rawAccountStatus === 'INACTIVE') {
    reasons.push(`Account ${rawAccountStatus}`);
  }
  
  const rawMembershipStatus = (u.membership_status || u.membershipStatus || u.status || '').trim().toUpperCase();
  if (rawMembershipStatus === 'INACTIVE') {
    reasons.push(`Membership ${rawMembershipStatus}`);
  }

  if (u.is_locked === true || u.locked === true) {
    reasons.push('Account Locked');
  }

  return reasons;
}
