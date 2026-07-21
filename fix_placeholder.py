import re

with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'placeholder="Search across all chapters..."',
    'placeholder={isAdmin ? "Search across all chapters..." : "Search in your chapter..."}'
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
