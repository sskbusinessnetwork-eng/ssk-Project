import re

# OneToOneMeetings.tsx
with open("src/pages/OneToOneMeetings.tsx", "r") as f:
    content = f.read()

old_onetoone = """      if (memberTab === 'my_chapter') {
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
new_onetoone = """      if (memberTab === 'my_chapter') {
        const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
        if (!myChapId) return false;
        
        const memberChapId = String(u.chapter_id || '').trim();
        if (!memberChapId) return false;

        return myChapId === memberChapId;
      }"""
content = content.replace(old_onetoone, new_onetoone)
with open("src/pages/OneToOneMeetings.tsx", "w") as f:
    f.write(content)

# Referrals.tsx
with open("src/pages/Referrals.tsx", "r") as f:
    content = f.read()

old_referrals = """    if (memberFilter === 'my_chapter') {
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
new_referrals = """    if (memberFilter === 'my_chapter') {
      const myChapId = String(effectiveUserChapterId || '').trim();
      if (!myChapId) return [];
      
      return allMembers.filter(m => {
        const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
        if (!memberChapId) return false;
        return memberChapId === myChapId;
      });
    }"""
content = content.replace(old_referrals, new_referrals)

old_referrals_count = """  const myChapterCount = useMemo(() => {
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
new_referrals_count = """  const myChapterCount = useMemo(() => {
    const myChapId = String(effectiveUserChapterId || '').trim();
    if (!myChapId) return 0;
    
    return allMembers.filter(m => {
      const memberChapId = String(m.chapter_id || m.chapterId || '').trim();
      if (!memberChapId) return false;
      return memberChapId === myChapId;
    }).length;
  }, [allMembers, effectiveUserChapterId]);"""
content = content.replace(old_referrals_count, new_referrals_count)

with open("src/pages/Referrals.tsx", "w") as f:
    f.write(content)

# Dashboard.tsx
with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

old_dashboard = """      if (profile.role !== 'MASTER_ADMIN') {
        const myChapId = String(profile.chapter_id || '').trim();
        const myChapName = String(profile.chapter_name || profile.chapterName || '').trim();
        if (myChapId || myChapName) {
          filtered = filtered.filter(u => {
            const memId = String(u.chapter_id || u.chapterId || '').trim();
            const memName = String(u.chapter_name || u.chapterName || '').trim();
            
            if (!memId && !memName) return false;
            
            let isMatch = false;
            if (myChapId && memId && memId === myChapId) isMatch = true;
            if (!isMatch && myChapName && memName && memName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;
            return isMatch;
          });
        }
      }"""
new_dashboard = """      if (profile.role !== 'MASTER_ADMIN') {
        const myChapId = String(profile.chapter_id || '').trim();
        if (myChapId) {
          filtered = filtered.filter(u => {
            const memId = String(u.chapter_id || u.chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }"""
content = content.replace(old_dashboard, new_dashboard)
with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)

# Members.tsx
with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

old_members = """      if (profile.role !== 'MASTER_ADMIN') {
        const myChapId = String(profile.chapter_id || '').trim();
        const myChapName = String(profile.chapter_name || profile.chapterName || '').trim();
        if (myChapId || myChapName) {
          filteredData = filteredData.filter(u => {
            const memId = String(u.chapter_id || (u as any).chapterId || '').trim();
            const memName = String(u.chapter_name || u.chapterName || '').trim();
            
            if (!memId && !memName) return false;
            
            let isMatch = false;
            if (myChapId && memId && memId === myChapId) isMatch = true;
            if (!isMatch && myChapName && memName && memName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;
            
            return isMatch;
          });
        }
      }"""
new_members = """      if (profile.role !== 'MASTER_ADMIN') {
        const myChapId = String(profile.chapter_id || '').trim();
        if (myChapId) {
          filteredData = filteredData.filter(u => {
            const memId = String(u.chapter_id || (u as any).chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }"""
content = content.replace(old_members, new_members)

old_members_local = """    // Chapter Admin can ONLY see members they created
    const isUserChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
    if (isUserChapterAdmin) {
      const myChapId = String(profile?.chapter_id || '').trim();
      const myChapName = String(profile?.chapter_name || profile?.chapterName || '').trim();
      
      const memId = String(m.chapter_id || (m as any).chapterId || '').trim();
      const memName = String(m.chapter_name || m.chapterName || '').trim();
      
      let isMatch = false;
      if (myChapId && memId && memId === myChapId) isMatch = true;
      if (!isMatch && myChapName && memName && memName.toLowerCase() === myChapName.toLowerCase()) isMatch = true;
      
      if (!isMatch) return false;
    }"""
new_members_local = """    // Chapter Admin can ONLY see members they created
    const isUserChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
    if (isUserChapterAdmin) {
      const myChapId = String(profile?.chapter_id || '').trim();
      const memId = String(m.chapter_id || (m as any).chapterId || '').trim();
      if (!myChapId || !memId || memId !== myChapId) return false;
    }"""
content = content.replace(old_members_local, new_members_local)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

