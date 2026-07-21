import re

with open('src/pages/Referrals.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "setMembers(data.filter(m => m.uid !== profile.uid && m.membershipStatus === 'ACTIVE'));",
    "setMembers(data.filter(m => m.uid !== profile.uid && (m.status === 'ACTIVE' || m.membershipStatus === 'ACTIVE')));"
)

with open('src/pages/Referrals.tsx', 'w') as f:
    f.write(content)
