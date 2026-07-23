import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_query = """        let queryBuilder = supabase
          .from('users')
          .select('*')
          .eq('status', 'ACTIVE');"""
new_query = """        let queryBuilder = supabase
          .from('users')
          .select('*')
          .eq('status', 'ACTIVE');

        if (activeTab === 'chapter') {
          if (profile.role === 'MASTER_ADMIN') {
            if (masterSelectedChapterId) {
              queryBuilder = queryBuilder.eq('chapter_id', masterSelectedChapterId);
            } else if (chaptersList.length > 0) {
              queryBuilder = queryBuilder.eq('chapter_id', chaptersList[0].id);
            } else {
              setMembers([]);
              setLoading(false);
              return;
            }
          } else {
            if (currentChapterId) {
              queryBuilder = queryBuilder.eq('chapter_id', currentChapterId);
            } else {
              setMembers([]);
              setLoading(false);
              return;
            }
          }
        }"""
content = content.replace(old_query, new_query)

old_dep = """}, [profile]);"""
new_dep = """}, [profile, activeTab, masterSelectedChapterId, chaptersList]);"""
content = content.replace(old_dep, new_dep)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
