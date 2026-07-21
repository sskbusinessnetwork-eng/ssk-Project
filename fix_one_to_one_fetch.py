import re

with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

fetch_logic = """    // Fetch all members for selection
    const fetchMembers = async () => {
      if (!profile) return;
      let q;
      if (isAdmin) {
        q = query(
          collection(db, 'users')
        );
      } else {
        q = query(
          collection(db, 'users'), 
          where('chapter_id', '==', profile?.chapter_id)
        );
      }
      const snap = await getDocs(q);
      const memberList = snap.docs
        .map(doc => ({ uid: doc.id, ...(doc.data() as any) } as UserProfile))
        .filter(m => 
          m.uid !== profile.uid && 
          m.role !== 'MASTER_ADMIN' &&
          (m.status === 'ACTIVE' || m.membershipStatus === 'ACTIVE')
        ); // Exclude self, Master Admin, and only keep ACTIVE

      setMembers(memberList);
    };"""

content = re.sub(
    r'    // Fetch all members for selection.*?setMembers\(memberList\);\n    \};',
    fetch_logic,
    content,
    flags=re.DOTALL
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
