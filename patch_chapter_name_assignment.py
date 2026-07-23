import re

# Patch 1: CreateChapter.tsx
with open("src/components/CreateChapter.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"chapterName:\s*formData\.chapter_name\.trim\(\),",
    r"chapter_name: formData.chapter_name.trim(),\n            chapterName: formData.chapter_name.trim(),",
    content
)

with open("src/components/CreateChapter.tsx", "w") as f:
    f.write(content)


# Patch 2: AddMemberForm.tsx
with open("src/components/members/AddMemberForm.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"chapterName:\s*finalChapterName,",
    r"chapter_name: finalChapterName,\n        chapterName: finalChapterName,",
    content
)

with open("src/components/members/AddMemberForm.tsx", "w") as f:
    f.write(content)


# Patch 3: Members.tsx
with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r"chapterName:\s*finalChapterName,",
    r"chapter_name: finalChapterName,\n        chapterName: finalChapterName,",
    content
)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

