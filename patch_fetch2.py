with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

start_idx = content.find("    // Fetch all members for selection")
end_idx = content.find("    fetchMembers();", start_idx)

if start_idx != -1 and end_idx != -1:
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
          
          console.log('Current User:', { id: profile.uid, chapter_id: profile.chapter_id, role: profile.role });
          console.log('Fetched Members Count:', memberList.length);
          console.log('Fetched Members:', memberList);
            
          setMembers(memberList);
        }
      } catch (err) {
        console.error("Fetch members error:", err);
      }
    };
"""
    content = content[:start_idx] + new_fetch + content[end_idx:]

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
