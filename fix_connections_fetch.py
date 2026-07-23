import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

# Change select('*') to select('*, chapters!users_chapter_id_fkey(chapter_name)') or just select('*, chapters(chapter_name)')
# Let's try select('*, chapters(chapter_name)') first

old_query = """        let queryBuilder = supabase
          .from('users')
          .select('*')
          .eq('status', 'ACTIVE');"""

new_query = """        let queryBuilder = supabase
          .from('users')
          .select('*, chapters(chapter_name)')
          .eq('status', 'ACTIVE');"""

content = content.replace(old_query, new_query)

old_map = """            chapterName: chapMap[row.chapter_id || ''] || row.chapter_name || 'SSK Chapter',"""
new_map = """            chapterName: (row.chapters && row.chapters.chapter_name) ? row.chapters.chapter_name : (chapMap[row.chapter_id || ''] || row.chapter_name || 'SSK Chapter'),"""

content = content.replace(old_map, new_map)

# Replace the fallback logic in filteredMembers to strictly use profile?.chapter_id if currentUserChapterId is missing
# Actually, the user says: "Fetch the logged-in user's record from the users table. Read: users.chapter_id. Store this as: currentChapterId"
# which is already being done! 

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
