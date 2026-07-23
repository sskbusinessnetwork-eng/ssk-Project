import re

# OneToOneMeetings.tsx
with open("src/pages/OneToOneMeetings.tsx", "r") as f:
    content = f.read()

old_onetoone = """      if (memberTab === 'my_chapter') {
        if (!currentUserChapterId) return false;
        
        const memberChapId = (u.chapter_id || '').toString().trim();
        const memberChapName = (u.chapter_name || u.chapterName || '').toString().trim();

        if (!memberChapId || !memberChapName) {
          console.warn(`My Chapter Members filter: User ${u.id || u.uid} is missing chapter_id or chapter_name. Excluded.`);
          return false;
        }

        return memberChapId === String(currentUserChapterId).trim();
      }"""

new_onetoone = """      if (memberTab === 'my_chapter') {
        const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
        const myChapName = String(currentUserRecord?.chapter_name || currentUserRecord?.chapterName || profile?.chapter_name || profile?.chapterName || '').trim();
        
        if (!myChapId && !myChapName) return false;
        
        const memberChapId = (u.chapter_id || '').toString().trim();
        const memberChapName = (u.chapter_name || u.chapterName || '').toString().trim();

        if (!memberChapId && !memberChapName) {
          console.warn(`My Chapter Members filter: User ${u.id || u.uid} is missing chapter_id and chapter_name. Excluded.`);
          return false;
        }

        let isMatch = false;
        if (myChapId && memberChapId && memberChapId === myChapId) isMatch = true;
        if (!isMatch && myChapName && memberChapName && memberChapName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;

        return isMatch;
      }"""

content = content.replace(old_onetoone, new_onetoone)

with open("src/pages/OneToOneMeetings.tsx", "w") as f:
    f.write(content)


# Referrals.tsx
with open("src/pages/Referrals.tsx", "r") as f:
    content = f.read()

old_referrals = """    if (memberFilter === 'my_chapter') {
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

new_referrals = """    if (memberFilter === 'my_chapter') {
      const myChapId = String(effectiveUserChapterId || '').trim();
      const myChapName = String(currentUserChapterName || profile?.chapter_name || profile?.chapterName || '').trim();
      if (!myChapId && !myChapName) return [];
      
      return allMembers.filter(m => {
        const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
        const memberChapName = String(m.chapter_name || m.chapterName || '').trim();
        
        if (!memberChapId && !memberChapName) {
          console.warn(`My Chapter filter: User ${m.id || m.uid} is missing chapter_id and chapter_name. Excluded.`);
          return false;
        }
        
        let isMatch = false;
        if (myChapId && memberChapId && memberChapId === myChapId) isMatch = true;
        if (!isMatch && myChapName && memberChapName && memberChapName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;
        return isMatch;
      });
    }"""

content = content.replace(old_referrals, new_referrals)

old_referrals_count = """  const myChapterCount = useMemo(() => {
    if (!effectiveUserChapterId) return 0;
    return allMembers.filter(m => {
      const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
      const memberChapName = String(m.chapter_name || m.chapterName || '').trim();
      if (!memberChapId || !memberChapName) return false;
      return memberChapId === String(effectiveUserChapterId).trim();
    }).length;
  }, [allMembers, effectiveUserChapterId]);"""

new_referrals_count = """  const myChapterCount = useMemo(() => {
    const myChapId = String(effectiveUserChapterId || '').trim();
    const myChapName = String(currentUserChapterName || profile?.chapter_name || profile?.chapterName || '').trim();
    if (!myChapId && !myChapName) return 0;
    
    return allMembers.filter(m => {
      const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
      const memberChapName = String(m.chapter_name || m.chapterName || '').trim();
      let isMatch = false;
      if (myChapId && memberChapId && memberChapId === myChapId) isMatch = true;
      if (!isMatch && myChapName && memberChapName && memberChapName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;
      return isMatch;
    }).length;
  }, [allMembers, effectiveUserChapterId, currentUserChapterName, profile]);"""

content = content.replace(old_referrals_count, new_referrals_count)

with open("src/pages/Referrals.tsx", "w") as f:
    f.write(content)

