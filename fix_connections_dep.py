import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_deps = "  }, [profile]);"
new_deps = "  }, [profile, activeTab, masterSelectedChapterId]);"
content = content.replace(old_deps, new_deps)

old_query_logic = """        let queryBuilder = supabase
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
        }

        if (profile?.role !== 'MASTER_ADMIN' && currentChapterId) {
          queryBuilder = queryBuilder.eq('chapter_id', currentChapterId);
        }"""

new_query_logic = """        let queryBuilder = supabase
          .from('users')
          .select('*')
          .eq('status', 'ACTIVE');

        if (activeTab === 'chapter') {
          if (profile.role === 'MASTER_ADMIN') {
            if (masterSelectedChapterId) {
              queryBuilder = queryBuilder.eq('chapter_id', masterSelectedChapterId);
            } else {
              const chaps = await databaseService.list<any>('chapters');
              if (chaps && chaps.length > 0) {
                queryBuilder = queryBuilder.eq('chapter_id', chaps[0].id);
              } else {
                setMembers([]);
                setLoading(false);
                return;
              }
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

content = content.replace(old_query_logic, new_query_logic)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
