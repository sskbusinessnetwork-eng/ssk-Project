import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_code = """      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        const memberChapId = (member.chapter_id || '').trim();
        if (memberChapId !== selectedChap) return false;
      } else {"""

new_code = """      if (profile?.role === 'MASTER_ADMIN') {
        const selectedChap = (masterSelectedChapterId || '').trim();
        if (!selectedChap) return false;
        
        const memberChapId = (member.chapter_id || '').trim();
        const memberChapName = (member.chapter_name || member.chapterName || '').trim();
        
        if (!memberChapId || !memberChapName) {
          console.warn(`My Chapter Members filter: User ${member.id || member.uid} is missing chapter_id or chapter_name. Excluded.`);
          return false;
        }

        if (memberChapId !== selectedChap) return false;
      } else {"""

content = content.replace(old_code, new_code)

old_count_code = """  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim();
      return (m.chapter_id || '').trim() === selectedChap;
    } else {"""

new_count_code = """  const totalChapterCount = members.filter(m => {
    if (profile?.role === 'MASTER_ADMIN') {
      const selectedChap = (masterSelectedChapterId || '').trim();
      if (!selectedChap) return false;
      const memberChapId = (m.chapter_id || '').trim();
      const memberChapName = (m.chapter_name || m.chapterName || '').trim();
      if (!memberChapId || !memberChapName) return false;
      return memberChapId === selectedChap;
    } else {"""

content = content.replace(old_count_code, new_count_code)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)

