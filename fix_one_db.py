import re

with open("src/pages/OneToOneMeetings.tsx", "r") as f:
    content = f.read()

old_query = """      // 1. Fetch Users
      const { data: usersData, error: uErr } = await supabase
        .from('users')
        .select('*');"""
new_query = """      // 1. Fetch Users
      let queryBuilder = supabase.from('users').select('*');
      
      const currentChapterId = profile?.chapter_id || profile?.chapterId;
      if (memberTab === 'my_chapter') {
        if (profile?.role === 'MASTER_ADMIN') {
          // If we had a master chapter filter, we'd apply it.
        } else if (currentChapterId) {
          queryBuilder = queryBuilder.eq('chapter_id', currentChapterId);
        } else {
          setAllUsersList([]);
          setMembers([]);
          return;
        }
      }

      const { data: usersData, error: uErr } = await queryBuilder;"""
content = content.replace(old_query, new_query)

old_dep = """}, [profile, isAdmin, isChapterAdmin]);"""
new_dep = """}, [profile, isAdmin, isChapterAdmin, memberTab]);"""
content = content.replace(old_dep, new_dep)

with open("src/pages/OneToOneMeetings.tsx", "w") as f:
    f.write(content)
