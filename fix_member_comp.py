import re

with open('src/components/MemberCompanionView.tsx', 'r') as f:
    content = f.read()

content = content.replace('profile.id || profile.uid', 'profile.uid')
content = content.replace('profile.uid || profile.id', 'profile.uid')
content = content.replace('profile.id', 'profile.uid')

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(content)
