import re

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

old_func = """  const getDisplayPosition = (pos?: string, role?: string) => {
    if (role === 'MASTER_ADMIN') return 'Master Admin';
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 'Chapter Admin';
    if (pos === 'president') return 'President';
    if (pos === 'vice_president') return 'Vice President';
    if (pos === 'treasurer') return 'Treasurer';
    return 'Associate Member';
  };"""

new_func = """  const getDisplayPosition = (pos?: string, r?: string) => {
    const role = (r || 'MEMBER').toUpperCase();
    if (role === 'MASTER_ADMIN') return 'Master Admin';
    if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (role === 'PRESIDENT') return 'President';
    if (role === 'VICE_PRESIDENT') return 'Vice President';
    if (role === 'TREASURER') return 'Treasurer';
    return 'Member';
  };"""

content = content.replace(old_func, new_func)

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)
