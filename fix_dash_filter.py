import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

old_filter = """      const allowedRoles = ['MEMBER', 'CHAPTER_ADMIN', 'PRESIDENT', 'VICE_PRESIDENT', 'TREASURER'];
      const chapterMems = data.filter(u => {
        const r = (u.role || '').toUpperCase();
        const p = (u.position || '').toUpperCase();
        return r !== 'MASTER_ADMIN' && (allowedRoles.includes(r) || allowedRoles.includes(p) || (r === '' && p === ''));
      });"""

new_filter = """      const chapterMems = data.filter(u => {
        const r = (u.role || 'MEMBER').toUpperCase();
        return r !== 'MASTER_ADMIN';
      });"""

content = content.replace(old_filter, new_filter)

old_pres_calc = """    const presidents = chapterUsers.filter(u => u.position === 'president').length;
    const vicePresidents = chapterUsers.filter(u => u.position === 'vice_president' || u.position === 'vice-president').length;
    const treasurers = chapterUsers.filter(u => u.position === 'treasurer').length;
    const chapterAdmins = chapterUsers.filter(u => u.role === 'CHAPTER_ADMIN' || u.position === 'chapter_admin').length;
    const associateMembers = chapterUsers.filter(u => u.position === 'member' || !u.position).length;"""

new_pres_calc = """    const presidents = chapterUsers.filter(u => (u.role || '').toUpperCase() === 'PRESIDENT').length;
    const vicePresidents = chapterUsers.filter(u => (u.role || '').toUpperCase() === 'VICE_PRESIDENT').length;
    const treasurers = chapterUsers.filter(u => (u.role || '').toUpperCase() === 'TREASURER').length;
    const chapterAdmins = chapterUsers.filter(u => (u.role || '').toUpperCase() === 'CHAPTER_ADMIN').length;
    const associateMembers = chapterUsers.filter(u => (u.role || 'MEMBER').toUpperCase() === 'MEMBER').length;"""

content = content.replace(old_pres_calc, new_pres_calc)

with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)
