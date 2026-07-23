import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

replacement = """  const isMemberActive = (u: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Check end date
    let isExpiredByDate = false;
    let isEndDateValid = false;
    const endDateVal = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end;
    if (endDateVal) {
      const endDate = new Date(endDateVal);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < now) {
        isExpiredByDate = true;
      } else {
        isEndDateValid = true;
      }
    }
    
    // Check if explicitly expired/inactive
    const isSubStatusExpired = (u.subscriptionStatus || '').toLowerCase() === 'expired' || (u.subscription_status || '').toLowerCase() === 'expired';
    const isAccountInactive = (u.status || '').toLowerCase() === 'inactive' || (u.membershipStatus || '').toLowerCase() === 'inactive' || (u.membership_status || '').toLowerCase() === 'inactive';

    if (isExpiredByDate || isSubStatusExpired || isAccountInactive) {
      return false;
    }

    // Check account status
    const isAccountActive = (u.status || '').toLowerCase() === 'active' || (u.membershipStatus || '').toLowerCase() === 'active' || (u.membership_status || '').toLowerCase() === 'active';
    // Check subscription status
    const isSubStatusActive = (u.subscriptionStatus || '').toLowerCase() === 'active' || (u.subscription_status || '').toLowerCase() === 'active';

    return isAccountActive || isSubStatusActive || isEndDateValid;
  };"""

pattern = r"const isMemberActive = \(u: any\) => \{.*?(?=const activePartnersCount = useMemo)"

content = re.sub(pattern, replacement + "\n\n  ", content, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
