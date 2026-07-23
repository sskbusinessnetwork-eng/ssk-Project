import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

# Replace filteredMembers chapter logic
old_filter = """    // 1. Tab Filtering
    if (activeTab === 'chapter') {
      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (memberChapId !== selectedChap) return false;
      } else {
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
      }
    }"""

new_filter = """    // 1. Tab Filtering
    if (activeTab === 'chapter') {
      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (memberChapId !== selectedChap) return false;
      } else {
        const myChapId = (currentUserChapterId || '').trim();
        if (!myChapId) return false;

        const memberChapId = (member.chapter_id || '').trim();
        if (myChapId !== memberChapId) return false;
      }
    }"""
content = content.replace(old_filter, new_filter)

# Replace totalChapterCount chapter logic
old_count = """  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim();
      return (m.chapter_id || '').trim() === selectedChap;
    } else {
      const myChapId = (currentUserChapterId || '').trim();
      const myChapName = (currentUserChapterName || '').trim().toLowerCase();
      if (!myChapId && !myChapName) return false;

      const memberChapId = (m.chapter_id || '').trim();
      const memberChapName = (m.chapter_name || m.chapterName || '').trim().toLowerCase();

      if (myChapId && memberChapId && memberChapId === myChapId) return true;
      if (myChapName && memberChapName && memberChapName === myChapName) return true;
      return false;
    }
  }).length;"""

new_count = """  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim();
      return (m.chapter_id || '').trim() === selectedChap;
    } else {
      const myChapId = (currentUserChapterId || '').trim();
      if (!myChapId) return false;
      const memberChapId = (m.chapter_id || '').trim();
      return myChapId === memberChapId;
    }
  }).length;"""
content = content.replace(old_count, new_count)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
