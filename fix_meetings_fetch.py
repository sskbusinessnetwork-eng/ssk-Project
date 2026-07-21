import re

with open('src/pages/Meetings.tsx', 'r') as f:
    content = f.read()

fetch_logic = """    const fetchMembers = async () => {
      const constraints: any[] = [];
      if (chapterId) {
        // If we have a chapterId, we want members of that chapter
        constraints.push(where('chapter_id', '==', chapterId));
      } else {
        // If no chapterId (Master Admin "All Chapters"), we want all members and admins
        constraints.push(where('role', '==', 'MEMBER'));
      }
      try {
        let data = await databaseService.list<UserProfile>('users', constraints);
        
        // If chapterId is set, we also need to fetch the Chapter Admin themselves
        if (chapterId) {
          const admin = await databaseService.get<UserProfile>('users', chapterId);
          if (admin && !data.find(m => m.uid === admin.uid)) {
            data = [...data, admin];
          }
        }

        // Filter ACTIVE in memory
        const activeMembers = data.filter(m => m.status === 'ACTIVE' || m.membershipStatus === 'ACTIVE');

        setMembers(activeMembers);"""

content = re.sub(
    r'    const fetchMembers = async \(\) => \{\n      const constraints: any\[\] = \[\n        where\(\'status\', \'==\', \'ACTIVE\'\)\n      \];\n.*?setMembers\(activeMembers\);',
    fetch_logic,
    content,
    flags=re.DOTALL
)

with open('src/pages/Meetings.tsx', 'w') as f:
    f.write(content)
