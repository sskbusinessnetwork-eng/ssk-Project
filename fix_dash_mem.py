import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

old_dash = """    const unsubUsers = databaseService.subscribe<any>('users', [], (data) => {
      setAllUsersList(data);
      let filtered = data;
      if (profile.role !== 'MASTER_ADMIN') {
        const myChapId = String(profile.chapter_id || '').trim();
        if (myChapId) {
          filtered = filtered.filter(u => {
            const memId = String(u.chapter_id || u.chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }"""
new_dash = """    const unsubUsers = databaseService.subscribe<any>('users', [], (data) => {
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
      }"""
content = content.replace(old_dash, new_dash)
with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

old_mem = """    const unsubscribe = databaseService.subscribe<UserProfile>('users', constraints, (data) => {
      let filteredData = data;
      if (profile.role !== 'MASTER_ADMIN') {
        const myChapId = String(profile.chapter_id || '').trim();
        if (myChapId) {
          filteredData = filteredData.filter(u => {
            const memId = String(u.chapter_id || (u as any).chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }"""
new_mem = """    const unsubscribe = databaseService.subscribe<UserProfile>('users', constraints, (data) => {
      let filteredData = data;
      if (profile.role !== 'MASTER_ADMIN') {
        const currentUserDbRecord = data.find(u => u.uid === profile.uid || u.id === profile.uid);
        const myChapId = String(currentUserDbRecord?.chapter_id || profile.chapter_id || '').trim();
        
        if (!myChapId) {
          filteredData = [];
        } else {
          filteredData = filteredData.filter(u => {
            const memId = String(u.chapter_id || (u as any).chapterId || '').trim();
            if (!memId) return false;
            return memId === myChapId;
          });
        }
      }"""
content = content.replace(old_mem, new_mem)
with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

