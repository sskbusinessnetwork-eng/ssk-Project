import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_filter_code = """      } else {
        const myChapId = (currentUserChapterId || '').trim();
        const myChapName = (currentUserChapterName || '').trim().toLowerCase();

        if (!myChapId && !myChapName) {
          return false;
        }

        const memberChapId = (member.chapter_id || '').trim();
        const memberChapName = (member.chapter_name || member.chapterName || '').trim().toLowerCase();

        let isMatch = false;
        if (myChapId && memberChapId) {
          if (memberChapId === myChapId) {
            isMatch = true;
          }
        }
        if (!isMatch && myChapName && memberChapName) {
          if (memberChapName === myChapName) {
            isMatch = true;
          }
        }

        if (!isMatch) return false;
      }"""

new_filter_code = """      } else {
        const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();

        if (!myChapId) {
          return false;
        }

        const memberChapId = (member.chapter_id || '').trim();
        const memberChapName = (member.chapter_name || member.chapterName || '').trim();

        if (!memberChapId || !memberChapName) {
          console.warn(`My Chapter Members filter: User ${member.id || member.uid} is missing chapter_id or chapter_name. Excluded.`);
          return false;
        }

        if (memberChapId !== myChapId) {
          return false;
        }
      }"""

content = content.replace(old_filter_code, new_filter_code)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)

