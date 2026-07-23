import re

with open("src/pages/OneToOneMeetings.tsx", "r") as f:
    content = f.read()

old_filter_code = """      if (memberTab === 'my_chapter') {
        if (!currentUserChapterId) return false;
        return String(u.chapter_id) === String(currentUserChapterId);
      }"""

new_filter_code = """      if (memberTab === 'my_chapter') {
        if (!currentUserChapterId) return false;
        
        const memberChapId = (u.chapter_id || '').toString().trim();
        const memberChapName = (u.chapter_name || u.chapterName || '').toString().trim();

        if (!memberChapId || !memberChapName) {
          console.warn(`My Chapter Members filter: User ${u.id || u.uid} is missing chapter_id or chapter_name. Excluded.`);
          return false;
        }

        return memberChapId === String(currentUserChapterId).trim();
      }"""

content = content.replace(old_filter_code, new_filter_code)

with open("src/pages/OneToOneMeetings.tsx", "w") as f:
    f.write(content)

