import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

replacement = """  const isMemberActive = (u: any) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today

    // Check account status
    const isAccountActive = u.status === 'ACTIVE' || u.membershipStatus === 'ACTIVE';

    // Check subscription status
    const isSubStatusActive = u.subscriptionStatus === 'Active' || u.subscription_status === 'Active';

    // Check end date
    let isEndDateValid = false;
    const endDateVal = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date;
    if (endDateVal) {
      const endDate = new Date(endDateVal);
      endDate.setHours(0, 0, 0, 0);
      if (endDate >= now) {
        isEndDateValid = true;
      }
    }

    return isAccountActive || isSubStatusActive || isEndDateValid;
  };

  const activePartnersCount = useMemo(() => {
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(isMemberActive).length;
  }, [chapterUsers]);

  const inactiveMembersCount = useMemo(() => {
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(u => !isMemberActive(u)).length;
  }, [chapterUsers]);

  const inactiveMembersList = useMemo(() => {
    const now = new Date();
    const members = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
    return members.filter(u => !isMemberActive(u)).map(u => {
      let subStatus: 'Active' | 'Expired' | 'Inactive' = 'Inactive';
      const endDateVal = u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date;
      if (endDateVal && new Date(endDateVal) <= now) {
        subStatus = 'Expired';
      } else {
        subStatus = 'Inactive';
      }

      let inactiveReason = subStatus === 'Expired' ? 'Subscription Expired' : 'Account Inactive';"""

pattern = r"const activePartnersCount = useMemo\(\(\) => \{.*?(?=const getDisplayPosition = \(pos\?: string, r\?: string\) => \{)"

content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
