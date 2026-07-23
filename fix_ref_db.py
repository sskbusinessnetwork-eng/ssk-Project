import re

with open("src/pages/Referrals.tsx", "r") as f:
    content = f.read()

old_ref_q = """      // 3. Query all users from Supabase users table
      const { data: usersData, error } = await supabase
        .from('users')
        .select('*');"""

new_ref_q = """      // 3. Query all users from Supabase users table
      let usersQuery = supabase.from('users').select('*');
      
      if (memberFilter === 'my_chapter') {
        if (profile?.role === 'MASTER_ADMIN') {
          // keep all
        } else if (userChapId) {
          usersQuery = usersQuery.eq('chapter_id', userChapId);
        } else {
          setAllMembers([]);
          setMembers([]);
          return;
        }
      }
      
      const { data: usersData, error } = await usersQuery;"""
content = content.replace(old_ref_q, new_ref_q)

old_dep = """  useEffect(() => {
    if (!profile) return;

    fetchReferrals();
    loadAllMembers();"""
    
new_dep = """  useEffect(() => {
    if (!profile) return;

    fetchReferrals();
    loadAllMembers();"""
# wait, the useEffect is: 
content = content.replace("}, [profile, isChapterAdmin, isMasterAdmin]);", "}, [profile, isChapterAdmin, isMasterAdmin, memberFilter]);")

with open("src/pages/Referrals.tsx", "w") as f:
    f.write(content)
