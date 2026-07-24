export function getSubscriptionDates(u: any): { startDate: Date | null; endDate: Date | null; startDateStr: string; endDateStr: string } {
  if (!u) return { startDate: null, endDate: null, startDateStr: '', endDateStr: '' };

  const startVal = u.subscription_start_date || u.subscriptionStartDate || u.subscription_start || u.subscriptionStart;
  const endVal = u.subscription_end_date || u.subscriptionEndDate || u.subscription_end || u.subscriptionEnd;

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let startDateStr = '';
  let endDateStr = '';

  const parseDateStr = (val: any): { date: Date | null, str: string } => {
    if (!val) return { date: null, str: '' };
    const strVal = String(val);
    
    // Check if it matches YYYY-MM-DD anywhere in the string (e.g. 2026-07-23T00:00:00Z)
    const match = strVal.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const parsedStr = match[0];
      // new Date('2026-07-23') creates a Date at 00:00 UTC
      return { date: new Date(parsedStr), str: parsedStr };
    }

    // Fallback for other formats (like DD-MM-YYYY)
    const d = new Date(strVal);
    if (!isNaN(d.getTime())) {
      const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { date: d, str: s };
    }
    return { date: null, str: '' };
  };

  const startParsed = parseDateStr(startVal);
  startDate = startParsed.date;
  startDateStr = startParsed.str;

  const endParsed = parseDateStr(endVal);
  endDate = endParsed.date;
  endDateStr = endParsed.str;

  return { startDate, endDate, startDateStr, endDateStr };
}

export type SubscriptionStatusType = 'Active' | 'Inactive / Expired' | 'Pending';

export function getSubscriptionStatus(u: any): SubscriptionStatusType {
  if (!u) return 'Inactive / Expired';
  if (u.role === 'MASTER_ADMIN') return 'Active';

  const { startDateStr, endDateStr } = getSubscriptionDates(u);

  // If no dates are present at all
  if (!endDateStr && !startDateStr) {
    const rawStatus = (u.subscription_status || u.subscriptionStatus || '').trim().toLowerCase();
    if (rawStatus === 'active') return 'Active';
    return 'Inactive / Expired';
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // If today's date is after Subscription End Date -> Expired
  if (endDateStr && todayStr > endDateStr) {
    return 'Inactive / Expired';
  }

  // If subscription has not yet started -> Pending
  if (startDateStr && todayStr < startDateStr) {
    return 'Pending';
  }

  // Today's date is between Start Date and End Date (inclusive) -> Active
  return 'Active';
}

export function isMemberActive(u: any): boolean {
  if (!u) return false;
  if (u.role === 'MASTER_ADMIN') return true;

  // Account level suspension/inactive check
  const rawAccountStatus = (
    u.account_status || 
    u.accountStatus || 
    u.membership_status || 
    u.membershipStatus || 
    u.status || 
    ''
  ).trim().toUpperCase();

  if (rawAccountStatus === 'SUSPENDED' || rawAccountStatus === 'INACTIVE') {
    return false;
  }

  if (u.is_locked === true || u.locked === true) {
    return false;
  }

  return getSubscriptionStatus(u) === 'Active';
}

export function getMemberStatusLabel(u: any): 'Active' | 'Inactive / Expired' | 'Pending' {
  if (!u) console.log("Returning Inactive / Expired"); return 'Inactive / Expired';
  if (u.role === 'MASTER_ADMIN') console.log("Returning Active"); return 'Active';
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

  const rawAccountStatus = (
    u.account_status || 
    u.accountStatus || 
    u.membership_status || 
    u.membershipStatus || 
    u.status || 
    ''
  ).trim().toUpperCase();

  if (rawAccountStatus === 'SUSPENDED' || rawAccountStatus === 'INACTIVE') {
    reasons.push(`Account ${rawAccountStatus}`);
  }

  if (u.is_locked === true || u.locked === true) {
    reasons.push('Account Locked');
  }

  return reasons;
}

