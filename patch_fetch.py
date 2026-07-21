import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

old_fetch = r"""    // Fetch all members for selection
    const fetchMembers = async \(\) => \{
      if \(\!profile\) return;
      let q;
      if \(isAdmin\) \{
        q = query\(
          collection\(db, 'users'\)
        \);
      \} else \{
        q = query\(
          collection\(db, 'users'\), 
          where\('chapter_id', '==', profile\?\.chapter_id\)
        \);
      \}
      const snap = await getDocs\(q\);
      const memberList = snap\.docs
        \.map\(doc => \(\{ uid: doc\.id, \.\.\.\(doc\.data\(\) as any\) \} as UserProfile\)\)
        \.filter\(m => 
          m\.uid \!\=\= profile\.uid \&\& 
          m\.role \!\=\= 'MASTER_ADMIN'
        \);
      setMembers\(memberList\);
    \};"""

new_fetch = """    // Fetch all members for selection
    const fetchMembers = async () => {
      if (!profile) return;
      
      try {
        let queryBuilder = supabase.from('users').select('*');
        
        if (!isAdmin && profile.chapter_id) {
          queryBuilder = queryBuilder.eq('chapter_id', profile.chapter_id);
        }
        
        const { data, error } = await queryBuilder;
        
        if (error) {
          console.error("Error fetching members:", error);
          return;
        }
        
        if (data) {
          const memberList = data
            .map((doc: any) => ({ uid: doc.id, ...doc } as UserProfile))
            .filter(m => 
              m.uid !== profile.uid && 
              m.role !== 'MASTER_ADMIN'
            );
          setMembers(memberList);
        }
      } catch (err) {
        console.error("Fetch members error:", err);
      }
    };"""

content = re.sub(old_fetch, new_fetch, content)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
