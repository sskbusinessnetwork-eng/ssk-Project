import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

replacement = """  const referralsPassedCount = useMemo(() => {
    const isCompleted = (r: any) => ['COMPLETED', 'CONVERTED', 'CLOSED'].includes((r.status || '').toUpperCase());
    if (profile?.role === 'MASTER_ADMIN') {
      return allReferrals.filter(isCompleted).length || 0;
    }
    return chapterReferralsList.filter(isCompleted).length || 0;
  }, [allReferrals, chapterReferralsList, profile]);"""

pattern = r"const referralsPassedCount = useMemo\(\(\) => \{.*?\}, \[allReferrals, chapterReferralsList, profile\]\);"
content = re.sub(pattern, replacement, content, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
