import re

with open("src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

old_func = """const getDisplayPosition = (pos?: string, r?: string) => {
        if (r === 'MASTER_ADMIN') return 'Master Admin';
        if (r === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 'Chapter Admin';
        if (pos === 'president') return 'President';
        if (pos === 'vice_president') return 'Vice President';
        if (pos === 'treasurer') return 'Treasurer';
        return 'Associate Member';
      };"""

new_func = """const getDisplayPosition = (pos?: string, r?: string) => {
        const role = (r || 'MEMBER').toUpperCase();
        if (role === 'MASTER_ADMIN') return 'Master Admin';
        if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
        if (role === 'PRESIDENT') return 'President';
        if (role === 'VICE_PRESIDENT') return 'Vice President';
        if (role === 'TREASURER') return 'Treasurer';
        return 'Member';
      };"""

content = content.replace(old_func, new_func)

# Also fix the other occurrence at line 1302 and 1359
old_render = """                       m.position === 'chapter_admin' ? 'Chapter Admin' :
                       m.position === 'president' ? 'President' :
                       m.position === 'vice_president' || m.position === 'vice-president' ? 'Vice President' :
                       m.position === 'treasurer' ? 'Treasurer' : 'Member'"""

new_render = """                       m.role === 'CHAPTER_ADMIN' ? 'Chapter Admin' :
                       m.role === 'PRESIDENT' ? 'President' :
                       m.role === 'VICE_PRESIDENT' ? 'Vice President' :
                       m.role === 'TREASURER' ? 'Treasurer' : 'Member'"""

content = content.replace(old_render, new_render)
content = content.replace(old_render, new_render) # Replace both if identical

# Wait, the actual line 1302 is:
#                        m.position === 'chapter_admin' ? 'Chapter Admin' :
#                        m.position === 'president' ? 'President' :
#                        m.position === 'vice_president' || m.position === 'vice-president' ? 'Vice President' :
#                        m.position === 'treasurer' ? 'Treasurer' : 'Member'

with open("src/pages/Dashboard.tsx", "w") as f:
    f.write(content)
