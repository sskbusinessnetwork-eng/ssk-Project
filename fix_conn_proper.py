import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

# 1. Update the query
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

# 2. Add debugging logs before displaying cards inside filteredMembers mapping? No, inside the filter function:
old_filter = """  const filteredMembers = members.filter(member => {
    // 1. Tab Filtering
    if (activeTab === 'chapter') {"""

new_filter = """  const filteredMembers = members.filter(member => {
    // STRCIT DEBUGGING:
    if (activeTab === 'chapter' && profile?.role !== 'MASTER_ADMIN') {
      const myChapId = String(currentUserChapterId || profile?.chapter_id || '').trim();
      const memChapId = String(member.chapter_id || '').trim();
      console.log(`DEBUG Check: Logged in user [id: ${profile?.uid}, chapter_id: ${myChapId}] vs Member [id: ${member.id}, name: ${member.name}, chapter_id: ${memChapId}]`);
      if (myChapId && memChapId && myChapId !== memChapId) {
        console.error(`ERROR: Member from another chapter appeared! Member ${member.name} (${memChapId}) != Current User (${myChapId})`);
        return false;
      }
    }

    // 1. Tab Filtering
    if (activeTab === 'chapter') {"""

content = content.replace(old_filter, new_filter)

# 3. Fix the dependency array ONLY for the main useEffect
old_dep = """      supabase.removeChannel(channel);
    };
}, [profile]);"""
new_dep = """      supabase.removeChannel(channel);
    };
}, [profile, activeTab, masterSelectedChapterId, chaptersList]);"""
content = content.replace(old_dep, new_dep)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
