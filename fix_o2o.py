import re

with open("src/pages/OneToOneMeetings.tsx", "r") as f:
    content = f.read()

old_query = """      let queryBuilder = supabase.from('users').select('*');
      
      const currentChapterId = profile?.chapter_id || profile?.chapterId;
      if (memberTab === 'my_chapter') {
        if (profile?.role === 'MASTER_ADMIN') {
          // If we had a master chapter filter, we'd apply it.
        } else if (currentChapterId) {
          queryBuilder = queryBuilder.eq('chapter_id', currentChapterId);
        } else {
          setAllUsersList([]);
          setMembers([]);
          return;
        }
      }"""

new_query = """      let queryBuilder = supabase.from('users').select('*').eq('status', 'ACTIVE');
      
      const currentChapterId = profile?.chapter_id || profile?.chapterId;
      if (memberTab === 'my_chapter') {
        if (profile?.role === 'MASTER_ADMIN') {
          // If we had a master chapter filter, we'd apply it.
        } else if (currentChapterId) {
          queryBuilder = queryBuilder.eq('chapter_id', currentChapterId);
        } else {
          setAllUsersList([]);
          setMembers([]);
          return;
        }
      }
      
      if (profile?.role !== 'MASTER_ADMIN' && currentChapterId && memberTab === 'my_chapter') {
        // Redundant but ensuring it strictly applies
        queryBuilder = queryBuilder.eq('chapter_id', currentChapterId);
      }"""

content = content.replace(old_query, new_query)

# Also fix the frontend filtering in OneToOneMeetings
old_frontend_filter = """  // Derive Available Members based on Tab (My Chapter Members vs All Members)
  const availableMembers = members.filter(m => {
    if (memberTab === 'my_chapter' && profile?.role !== 'MASTER_ADMIN') {
      const myChapId = profile?.chapter_id || profile?.chapterId;
      const myChapName = (profile?.chapterName || (profile as any)?.chapter_name || '').toLowerCase();
      
      const mChapId = m.chapter_id || m.chapterId;
      const mChapName = (m.chapterName || m.chapter_name || '').toLowerCase();
      
      if (myChapId && mChapId && myChapId === mChapId) return true;
      if (myChapName && mChapName && myChapName === mChapName) return true;
      return false;
    }
    return true;
  });"""

new_frontend_filter = """  // Derive Available Members based on Tab (My Chapter Members vs All Members)
  const availableMembers = members.filter(m => {
    if (memberTab === 'my_chapter' && profile?.role !== 'MASTER_ADMIN') {
      const myChapId = profile?.chapter_id || profile?.chapterId;
      const mChapId = m.chapter_id || m.chapterId;
      
      if (myChapId && mChapId && myChapId === mChapId) return true;
      return false;
    }
    return true;
  });"""

content = content.replace(old_frontend_filter, new_frontend_filter)

with open("src/pages/OneToOneMeetings.tsx", "w") as f:
    f.write(content)
