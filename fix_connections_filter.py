import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_filter = """    if (activeTab === 'chapter') {
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

new_filter = """    if (activeTab === 'chapter') {
      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (memberChapId !== selectedChap) return false;
      } else {
        const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
        if (!myChapId) return false;

        const memberChapId = String(member.chapter_id || '').trim();
        if (myChapId !== memberChapId) return false;
      }
    }"""

content = content.replace(old_filter, new_filter)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
