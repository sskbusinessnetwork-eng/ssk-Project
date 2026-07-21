import re

with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = content.replace("where('membershipStatus', '==', 'ACTIVE')", "where('status', '==', 'ACTIVE')")

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
