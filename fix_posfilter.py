import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_filter = """    // Position Filter
    if (selectedPositionFilter) {
      const role = member.role;
      const pos = member.position?.toLowerCase();
      if (selectedPositionFilter === 'chapter_admin') {
        if (role !== 'CHAPTER_ADMIN' && pos !== 'chapter_admin') return false;
      } else if (selectedPositionFilter === 'president') {
        if (pos !== 'president') return false;
      } else if (selectedPositionFilter === 'vice_president') {
        if (pos !== 'vice_president') return false;
      } else if (selectedPositionFilter === 'treasurer') {
        if (pos !== 'treasurer') return false;
      } else if (selectedPositionFilter === 'member') {
        if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin' || pos === 'president' || pos === 'vice_president' || pos === 'treasurer') {
          return false;
        }
      }
    }"""

new_filter = """    // Position Filter
    if (selectedPositionFilter) {
      const role = (member.role || 'MEMBER').toUpperCase();
      if (selectedPositionFilter === 'chapter_admin') {
        if (role !== 'CHAPTER_ADMIN') return false;
      } else if (selectedPositionFilter === 'president') {
        if (role !== 'PRESIDENT') return false;
      } else if (selectedPositionFilter === 'vice_president') {
        if (role !== 'VICE_PRESIDENT') return false;
      } else if (selectedPositionFilter === 'treasurer') {
        if (role !== 'TREASURER') return false;
      } else if (selectedPositionFilter === 'member') {
        if (role !== 'MEMBER') return false;
      }
    }"""

content = content.replace(old_filter, new_filter)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
