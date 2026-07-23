import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

old_dash_q = """    // 1. Subscribe to users (chapter members & global users for name resolution)
    const unsubUsers = databaseService.subscribe<any>('users', [], (data) => {
      setAllUsersList(data);
      let filtered = data;
      if (profile.role !== 'MASTER_ADMIN') {
        const currentUserDbRecord = data.find((u: any) => u.id === profile.uid || u.uid === profile.uid);
        const myChapId = String(currentUserDbRecord?.chapter_id || profile.chapter_id || '').trim();
        
        if (!myChapId) {
          filtered = [];
        } else {
          filtered = filtered.filter((u: any) => {
            const memId = String(u.chapter_id || u.chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }
      const allowedRoles = ['MEMBER', 'CHAPTER_ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TREASURER'];
      const chapterMems = filtered.filter(u => {
        const r = (u.role || '').toUpperCase();
        const p = (u.position || '').toUpperCase();
        return r !== 'MASTER_ADMIN' && (allowedRoles.includes(r) || allowedRoles.includes(p) || (r === '' && p === ''));
      });
      setChapterUsers(chapterMems);
    });"""

new_dash_q = """    // 1. Subscribe to users (chapter members & global users for name resolution)
    let userConstraints: any[] = [];
    if (profile.role !== 'MASTER_ADMIN') {
      const myChapId = String(profile.chapter_id || '').trim();
      if (myChapId) {
        userConstraints = [where('chapter_id', '==', myChapId)];
      }
    }
    const unsubUsers = databaseService.subscribe<any>('users', userConstraints, (data) => {
      setAllUsersList(data);
      
      const allowedRoles = ['MEMBER', 'CHAPTER_ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TREASURER'];
      const chapterMems = data.filter(u => {
        const r = (u.role || '').toUpperCase();
        const p = (u.position || '').toUpperCase();
        return r !== 'MASTER_ADMIN' && (allowedRoles.includes(r) || allowedRoles.includes(p) || (r === '' && p === ''));
      });
      setChapterUsers(chapterMems);
    });"""

content = content.replace(old_dash_q, new_dash_q)
with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)
