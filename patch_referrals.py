import re

with open("src/pages/Referrals.tsx", "r") as f:
    content = f.read()

old_filter_code = """    if (memberFilter === 'my_chapter') {
      if (!effectiveUserChapterId) return [];
      return allMembers.filter(m => String(m.chapter_id || m.chapterId || '').trim() === String(effectiveUserChapterId).trim());
    }"""

new_filter_code = """    if (memberFilter === 'my_chapter') {
      if (!effectiveUserChapterId) return [];
      return allMembers.filter(m => {
        const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
        const memberChapName = String(m.chapter_name || m.chapterName || '').trim();
        
        if (!memberChapId || !memberChapName) {
          console.warn(`My Chapter filter: User ${m.id || m.uid} is missing chapter_id or chapter_name. Excluded.`);
          return false;
        }
        return memberChapId === String(effectiveUserChapterId).trim();
      });
    }"""

content = content.replace(old_filter_code, new_filter_code)

old_count_code = """  const myChapterCount = useMemo(() => {
    if (!effectiveUserChapterId) return 0;
    return allMembers.filter(m => String(m.chapter_id || m.chapterId || '').trim() === String(effectiveUserChapterId).trim()).length;
  }, [allMembers, effectiveUserChapterId]);"""

new_count_code = """  const myChapterCount = useMemo(() => {
    if (!effectiveUserChapterId) return 0;
    return allMembers.filter(m => {
      const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
      const memberChapName = String(m.chapter_name || m.chapterName || '').trim();
      if (!memberChapId || !memberChapName) return false;
      return memberChapId === String(effectiveUserChapterId).trim();
    }).length;
  }, [allMembers, effectiveUserChapterId]);"""

content = content.replace(old_count_code, new_count_code)

with open("src/pages/Referrals.tsx", "w") as f:
    f.write(content)

