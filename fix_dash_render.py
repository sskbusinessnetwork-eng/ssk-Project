import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"m\.role === 'CHAPTER_ADMIN' \|\| m\.position === 'chapter_admin' \? 'Chapter Admin' :\s+m\.position === 'president' \? 'President' :\s+m\.position === 'vice_president' \|\| m\.position === 'vice-president' \? 'Vice President' :\s+m\.position === 'treasurer' \? 'Treasurer' : 'Associate Member'",
    r"m.role === 'CHAPTER_ADMIN' ? 'Chapter Admin' :\n                       m.role === 'PRESIDENT' ? 'President' :\n                       m.role === 'VICE_PRESIDENT' ? 'Vice President' :\n                       m.role === 'TREASURER' ? 'Treasurer' : 'Member'",
    content
)

with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)
