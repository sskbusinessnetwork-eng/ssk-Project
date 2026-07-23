import re

with open("src/pages/Members.tsx", "r") as f:
    content = f.read()

old_filter_code = """    // Chapter Admin can ONLY see members they created
    const isUserChapterAdmin = profile?.role === 'CHAPTER_ADMIN' || (profile?.role === 'MEMBER' && profile?.position === 'chapter_admin');
    if (isUserChapterAdmin && m.chapter_id !== profile?.chapter_id) return false;"""

new_filter_code = """    // Chapter Admin can ONLY see members they created
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

content = content.replace(old_filter_code, new_filter_code)

with open("src/pages/Members.tsx", "w") as f:
    f.write(content)

