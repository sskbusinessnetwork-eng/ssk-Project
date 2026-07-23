import re

with open("src/pages/ManageSubscriptions.tsx", "r") as f:
    content = f.read()

old_func = """      const matchesChapter = !chapterFilter || u.chapter_id === chapterFilter;
      const matchesPosition = !positionFilter || u.position === positionFilter;"""

new_func = """      const matchesChapter = !chapterFilter || u.chapter_id === chapterFilter;
      const matchesPosition = !positionFilter || (u.role || 'MEMBER').toLowerCase() === positionFilter.toLowerCase();"""

content = content.replace(old_func, new_func)

with open("src/pages/ManageSubscriptions.tsx", "w") as f:
    f.write(content)
