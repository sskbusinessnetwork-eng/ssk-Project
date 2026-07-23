import re

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

old_chapter_logic = """        if (chapterId) {
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

new_chapter_logic = """        if (chapterId) {
          try {
            const { data: chap, error: chapErr } = await supabase.from('chapters').select('chapter_name').eq('id', chapterId).single();
            if (chapErr || !chap) {
              console.error("Invalid Chapter for id:", chapterId, chapErr);
              setResolvedChapterName('Invalid Chapter');
            } else if (chap && chap.chapter_name) {
              setResolvedChapterName(chap.chapter_name);
              if (!isViewMode && currentUserProfile && (!currentUserProfile.chapterName || !currentUserProfile.chapter_name)) {
                try {
                  await supabase.from('users').update({ chapter_name: chap.chapter_name, chapterName: chap.chapter_name }).eq('id', currentUserProfile.id || currentUserProfile.uid);
                } catch (e) {}
              }
            }
          } catch (e) {
            console.error("Error loading chapter name:", e);
            setResolvedChapterName('Invalid Chapter');
          }
        } else if (!isViewMode && currentUserProfile && !currentUserProfile.chapterName && !currentUserProfile.chapter_name) {
          console.error("Chapter Not Assigned for user: ", currentUserProfile.id || currentUserProfile.uid);
          setResolvedChapterName('Chapter Not Assigned');
        } else if (isViewMode && targetProfile && !targetProfile.chapterName && !targetProfile.chapter_name) {
          setResolvedChapterName('Chapter Not Assigned');
        }"""

content = content.replace(old_chapter_logic, new_chapter_logic)

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)

