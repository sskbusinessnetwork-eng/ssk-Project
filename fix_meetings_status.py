import re

with open('src/pages/Meetings.tsx', 'r') as f:
    content = f.read()

content = content.replace("where('membershipStatus', '==', 'ACTIVE')", "where('status', '==', 'ACTIVE')")

with open('src/pages/Meetings.tsx', 'w') as f:
    f.write(content)
