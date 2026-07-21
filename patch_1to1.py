with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

old_fetch = """        .filter(m => 
          m.uid !== profile.uid && 
          m.role !== 'MASTER_ADMIN' &&
          (m.status === 'ACTIVE' || m.membershipStatus === 'ACTIVE')
        ); // Exclude self, Master Admin, and only keep ACTIVE"""

new_fetch = """        .filter(m => 
          m.uid !== profile.uid && 
          m.role !== 'MASTER_ADMIN'
        );"""

content = content.replace(old_fetch, new_fetch)

old_selected = """{members.find(m => m.uid === formData.participantId)?.name}"""

new_selected = """{(() => {
                          const m = members.find(m => m.uid === formData.participantId);
                          if (!m) return '';
                          const role = m.role === 'CHAPTER_ADMIN' || m.position === 'chapter_admin' ? 'Chapter Admin' :
                                       m.position === 'president' ? 'President' :
                                       m.position === 'vice_president' || m.position === 'vice-president' ? 'Vice President' :
                                       m.position === 'treasurer' ? 'Treasurer' : 'Member';
                          return `${m.name} (${role})`;
                        })()}"""

content = content.replace(old_selected, new_selected)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
