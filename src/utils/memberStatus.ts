export function getSubscriptionDates(u: any): { startDate: Date | null; endDate: Date | null; startDateStr: string; endDateStr: string } {
  if (!u) return { startDate: null, endDate: null, startDateStr: '', endDateStr: '' };

  const startVal = u.subscription_start_date || u.subscriptionStartDate || u.subscription_start || u.subscriptionStart;
  const endVal = u.subscription_end_date || u.subscriptionEndDate || u.subscription_end || u.subscriptionEnd;

  let startDate: Date | null = null;
  let endDate: Date | null = null;
  let startDateStr = '';
  let endDateStr = '';

  if (startVal) {
    const s = new Date(startVal);
    if (!isNaN(s.getTime())) {
      startDate = s;
      startDateStr = `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
    }
  }

  if (endVal) {
    const e = new Date(endVal);
    if (!isNaN(e.getTime())) {
      endDate = e;
      endDateStr = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
    }
  }

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

