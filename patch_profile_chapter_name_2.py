import re

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"\{formData\.chapterName \|\| resolvedChapterName \|\| 'SSK Chapter'\}",
    r"{formData.chapterName || resolvedChapterName || 'Chapter Not Assigned'}",
    content
)

content = re.sub(
    r"\{targetProfile\.chapterName \|\| resolvedChapterName \|\| 'SSK Chapter'\}",
    r"{targetProfile.chapterName || resolvedChapterName || 'Chapter Not Assigned'}",
    content
)

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)

