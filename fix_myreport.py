import re

with open("src/pages/MyReport.tsx", "r") as f:
    content = f.read()

old_func = """const formatUserRoleOrPosition = (user: any): string => {
  if (!user) return 'Member';
  
  const pos = user.position || user.chapter_position || user.chapterPosition;
  if (pos && typeof pos === 'string') {
    const pLower = pos.toLowerCase().trim();
    if (pLower === 'president') return 'President';
    if (pLower === 'vice_president' || pLower === 'vice president') return 'Vice President';
    if (pLower === 'treasurer') return 'Treasurer';
    if (pLower === 'chapter_admin' || pLower === 'chapter admin') return 'Chapter Admin';
    if (pLower === 'member') return 'Member';
  }

  const role = user.role;
  if (role) {
    const rUpper = String(role).toUpperCase().trim();
    if (rUpper === 'PRESIDENT') return 'President';
    if (rUpper === 'VICE_PRESIDENT') return 'Vice President';
    if (rUpper === 'TREASURER') return 'Treasurer';
    if (rUpper === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (rUpper === 'MASTER_ADMIN') return 'Master Admin';
    if (rUpper === 'MEMBER') return 'Member';
  }

  return 'Member';
};"""

new_func = """const formatUserRoleOrPosition = (user: any): string => {
  if (!user) return 'Member';
  const role = user.role;
  if (role) {
    const rUpper = String(role).toUpperCase().trim();
    if (rUpper === 'PRESIDENT') return 'President';
    if (rUpper === 'VICE_PRESIDENT') return 'Vice President';
    if (rUpper === 'TREASURER') return 'Treasurer';
    if (rUpper === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (rUpper === 'MASTER_ADMIN') return 'Master Admin';
    if (rUpper === 'MEMBER') return 'Member';
  }
  return 'Member';
};"""

content = content.replace(old_func, new_func)

with open("src/pages/MyReport.tsx", "w") as f:
    f.write(content)
