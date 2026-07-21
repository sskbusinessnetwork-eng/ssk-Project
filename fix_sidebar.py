import re

with open('src/components/Sidebar.tsx', 'r') as f:
    content = f.read()

content = content.replace("const isChapterAdmin = profile?.position === 'chapter_admin';", "const isChapterAdmin = profile?.position === 'chapter_admin' || profile?.role === 'CHAPTER_ADMIN';")

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(content)
