import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("return allChapters.length || 0;", "return allChapters.filter(c => c.status === 'ACTIVE').length || 0;")

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
