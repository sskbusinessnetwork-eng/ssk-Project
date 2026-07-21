import re
with open('src/pages/Members.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "<MemberTable",
    "<MemberTable currentUserId={profile?.uid}"
)

with open('src/pages/Members.tsx', 'w') as f:
    f.write(content)
