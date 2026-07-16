import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# I will find the dead code blocks
member_dead_start = content.find("{false && profile?.role === 'MEMBER' && (")
if member_dead_start != -1:
    # find the next Chapter admin block
    chapter_start = content.find("{profile?.role === 'CHAPTER_ADMIN' && (", member_dead_start)
    if chapter_start != -1:
        content = content[:member_dead_start] + content[chapter_start:]

chapter_dead_start = content.find("{false && profile?.role === 'CHAPTER_ADMIN' && (")
if chapter_dead_start != -1:
    master_start = content.find("{profile?.role === 'MASTER_ADMIN' && (", chapter_dead_start)
    if master_start != -1:
        content = content[:chapter_dead_start] + content[master_start:]

master_dead_start = content.find("{false && profile?.role === 'MASTER_ADMIN' && (")
if master_dead_start != -1:
    end_of_companion = content.find("</motion.div>", master_dead_start)
    if end_of_companion != -1:
        content = content[:master_dead_start] + content[end_of_companion:]

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
