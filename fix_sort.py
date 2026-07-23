import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_sort = """  const getSortWeight = (member: UserProfile) => {
    const role = member.role;
    const pos = member.position?.toLowerCase();
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 1;
    if (pos === 'president') return 2;
    if (pos === 'vice_president') return 3;
    if (pos === 'treasurer') return 4;
    return 5;
  };"""

new_sort = """  const getSortWeight = (member: UserProfile) => {
    const role = (member.role || 'MEMBER').toUpperCase();
    if (role === 'CHAPTER_ADMIN') return 1;
    if (role === 'PRESIDENT') return 2;
    if (role === 'VICE_PRESIDENT') return 3;
    if (role === 'TREASURER') return 4;
    return 5;
  };"""

content = content.replace(old_sort, new_sort)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
