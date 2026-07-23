import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_count_code = """    } else {
      const myChapId = (currentUserChapterId || '').trim();
      const myChapName = (currentUserChapterName || '').trim().toLowerCase();
      if (!myChapId && !myChapName) return false;

      const memberChapId = (m.chapter_id || '').trim();
      const memberChapName = (m.chapter_name || m.chapterName || '').trim().toLowerCase();

      if (myChapId && memberChapId && memberChapId === myChapId) return true;
      if (myChapName && memberChapName && memberChapName === myChapName) return true;
      return false;
    }"""

new_count_code = """    } else {
      const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
      if (!myChapId) return false;

      const memberChapId = (m.chapter_id || '').trim();
      const memberChapName = (m.chapter_name || m.chapterName || '').trim();

      if (!memberChapId || !memberChapName) return false;
      return myChapId === memberChapId;
    }"""

content = content.replace(old_count_code, new_count_code)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)

