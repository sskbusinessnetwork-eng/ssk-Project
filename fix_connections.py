import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

# Fix MASTER_ADMIN
old_master = """      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        
        const memberChapId = (member.chapter_id || '').trim();
        const memberChapName = (member.chapter_name || member.chapterName || '').trim();
        
        if (!memberChapId && !memberChapName) {
          console.warn(`My Chapter Members filter: User ${member.id || member.uid} is missing chapter_id and chapter_name. Excluded.`);
          return false;
        }

        if (memberChapId !== selectedChap) return false;
      }"""

new_master = """      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (!memberChapId) return false;
        return memberChapId === selectedChap;
      }"""
content = content.replace(old_master, new_master)

# Fix regular
old_regular = """      } else {
        const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
        const myChapName = (currentUserChapterName || profile?.chapter_name || profile?.chapterName || '').trim();

        if (!myChapId && !myChapName) {
          return false;
        }

        const memberChapId = (member.chapter_id || '').trim();
        const memberChapName = (member.chapter_name || member.chapterName || '').trim();

        if (!memberChapId && !memberChapName) {
          console.warn(`My Chapter Members filter: User ${member.id || member.uid} is missing chapter_id and chapter_name. Excluded.`);
          return false;
        }

        let isMatch = false;
        if (myChapId && memberChapId && memberChapId === myChapId) isMatch = true;
        if (!isMatch && myChapName && memberChapName && memberChapName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;

        if (!isMatch) return false;
      }"""

new_regular = """      } else {
        const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
        if (!myChapId) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (!memberChapId) return false;
        return myChapId === memberChapId;
      }"""
content = content.replace(old_regular, new_regular)

# Fix counts regular
old_count_regular = """    } else {
      const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
      const myChapName = (currentUserChapterName || profile?.chapter_name || profile?.chapterName || '').trim();
      if (!myChapId && !myChapName) return false;

      const memberChapId = (m.chapter_id || '').trim();
      const memberChapName = (m.chapter_name || m.chapterName || '').trim();

      let isMatch = false;
      if (myChapId && memberChapId && memberChapId === myChapId) isMatch = true;
      if (!isMatch && myChapName && memberChapName && memberChapName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;

      return isMatch;
    }"""
new_count_regular = """    } else {
      const myChapId = (currentUserChapterId || profile?.chapter_id || '').trim();
      if (!myChapId) return false;
      const memberChapId = (m.chapter_id || '').trim();
      if (!memberChapId) return false;
      return myChapId === memberChapId;
    }"""
content = content.replace(old_count_regular, new_count_regular)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
