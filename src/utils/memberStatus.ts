export function isMemberActive(u: any): boolean {
  if (!u || u.role === 'MASTER_ADMIN') return false;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Subscription End Date check: subscription_end_date >= CURRENT_DATE
  const endDateVal = u.subscription_end_date || u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end;
  if (!endDateVal) return false;

  let endDateStr = '';
  try {
    const endDateObj = new Date(endDateVal);
    if (isNaN(endDateObj.getTime())) return false;
    endDateStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
  } catch (e) {
    return false;
  }

  if (endDateStr < todayStr) return false;

  // 2. Subscription Status check: subscription_status = 'Active' (case-insensitive)
  const rawSubStatus = (u.subscription_status || u.subscriptionStatus || '').trim();
  if (rawSubStatus.toLowerCase() !== 'active') return false;

  // 3. Password Changed check: password_changed = true (default password has been changed)
  // Must NOT be pending password change
  const isPwdChanged = (u.password_changed === true || u.passwordChanged === true) && 
                       u.must_change_password !== true && 
                       u.mustChangePassword !== true;
  if (!isPwdChanged) return false;

  // 4. Account Status check: account_status = 'Active' (case-insensitive)
  const rawAccountStatus = (
    u.account_status || 
    u.accountStatus || 
    u.membership_status || 
    u.membershipStatus || 
    u.status || 
    ''
  ).trim();

  if (rawAccountStatus.toLowerCase() !== 'active') return false;

  // Locked check if applicable
  if (u.is_locked === true || u.locked === true) return false;

  return true;
}

export function getMemberStatusLabel(u: any): 'Active' | 'Inactive' {
  return isMemberActive(u) ? 'Active' : 'Inactive';
}

export function getMemberInactiveReasons(u: any): string[] {
  const reasons: string[] = [];
  if (!u || u.role === 'MASTER_ADMIN') return ['Master Admin'];

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Subscription End Date
  const endDateVal = u.subscription_end_date || u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end;
  if (!endDateVal) {
    reasons.push('No Subscription Date');
  } else {
    try {
      const endDateObj = new Date(endDateVal);
      const endDateStr = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;
      if (endDateStr < todayStr) {
        reasons.push('Subscription Expired');
      }
    } catch (e) {
      reasons.push('Invalid Subscription Date');
    }
  }

  // 2. Subscription Status
  const rawSubStatus = (u.subscription_status || u.subscriptionStatus || '').trim();
  if (rawSubStatus.toLowerCase() !== 'active') {
    reasons.push(`Subscription ${rawSubStatus || 'Expired'}`);
  }

  // 3. Password Changed
  const isPwdChanged = (u.password_changed === true || u.passwordChanged === true) && 
                       u.must_change_password !== true && 
                       u.mustChangePassword !== true;
  if (!isPwdChanged) {
    reasons.push('Default Password Not Changed');
  }

  // 4. Account Status
  const rawAccountStatus = (
    u.account_status || 
    u.accountStatus || 
    u.membership_status || 
    u.membershipStatus || 
    u.status || 
    ''
  ).trim();

  if (rawAccountStatus.toLowerCase() !== 'active') {
    reasons.push(`Account ${rawAccountStatus || 'Inactive'}`);
  }

  if (u.is_locked === true || u.locked === true) {
    reasons.push('Account Locked');
  }

  return reasons;
}
