import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_query = """        let queryBuilder = supabase
          .from('users')
          .select('*, chapters(chapter_name)')
          .eq('status', 'ACTIVE');"""

new_query = """        let queryBuilder = supabase
          .from('users')
          .select('*')
          .eq('status', 'ACTIVE');"""

content = content.replace(old_query, new_query)

old_map = """            chapterName: (row.chapters && row.chapters.chapter_name) ? row.chapters.chapter_name : (chapMap[row.chapter_id || ''] || row.chapter_name || 'SSK Chapter'),"""
new_map = """            chapterName: chapMap[row.chapter_id || ''] || row.chapter_name || 'SSK Chapter',"""

content = content.replace(old_map, new_map)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
