import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

old_filter_code = """      if (profile.role !== 'MASTER_ADMIN' && profile.chapter_id) {
        filtered = filtered.filter(u => String(u.chapter_id || u.chapterId) === String(profile.chapter_id));
      }"""

new_filter_code = """      if (profile.role !== 'MASTER_ADMIN') {
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

content = content.replace(old_filter_code, new_filter_code)

with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)

