import re

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"\{targetProfile\.chapterName \|\| resolvedChapterName \|\| 'Chapter Not Assigned'\}",
    r"{targetProfile.chapterName || targetProfile.chapter_name || resolvedChapterName || 'Chapter Not Assigned'}",
    content
)

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)

