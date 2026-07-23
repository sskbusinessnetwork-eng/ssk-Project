import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_total = """    } else {
      const myChapId = (currentUserChapterId || '').trim();
      if (!myChapId) return false;
      const memberChapId = (m.chapter_id || '').trim();
      return myChapId === memberChapId;
    }"""

new_total = """    } else {
      const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
      if (!myChapId) return false;
      const memberChapId = String(m.chapter_id || '').trim();
      return myChapId === memberChapId;
    }"""

content = content.replace(old_total, new_total)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
