import re

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

# Replace chapterName in setFormData to include fallback
content = re.sub(
    r"chapterName: currentUserProfile\.chapterName \|\| '',",
    r"chapterName: currentUserProfile.chapterName || currentUserProfile.chapter_name || '',",
    content
)

# Replace the input value for chapterName to include resolvedChapterName and 'Chapter Not Assigned'
content = re.sub(
    r"value=\{formData\.chapterName \|\| 'Not Assigned'\}",
    r"value={formData.chapterName || resolvedChapterName || 'Chapter Not Assigned'}",
    content
)

# Add auto-update logic for missing chapter_name
old_chapter_logic = """        if (chapterId) {
          try {
            const chap = await databaseService.get<any>('chapters', chapterId);
            if (chap && chap.chapter_name) {
              setResolvedChapterName(chap.chapter_name);
            }
          } catch (e) {
            console.error("Error loading chapter name:", e);
          }
        }"""

new_chapter_logic = """        if (chapterId) {
          try {
            const chap = await databaseService.get<any>('chapters', chapterId);
            if (chap && chap.chapter_name) {
              setResolvedChapterName(chap.chapter_name);
              if (!isViewMode && currentUserProfile && !currentUserProfile.chapterName && !currentUserProfile.chapter_name) {
                try {
                  await supabase.from('users').update({ chapter_name: chap.chapter_name, chapterName: chap.chapter_name }).eq('id', currentUserProfile.id || currentUserProfile.uid);
                } catch (e) {}
              }
            }
          } catch (e) {
            console.error("Error loading chapter name:", e);
          }
        } else if (!isViewMode && currentUserProfile && !currentUserProfile.chapterName && !currentUserProfile.chapter_name) {
          console.error("Chapter Not Assigned for user: ", currentUserProfile.id || currentUserProfile.uid);
        }"""

content = content.replace(old_chapter_logic, new_chapter_logic)

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)

