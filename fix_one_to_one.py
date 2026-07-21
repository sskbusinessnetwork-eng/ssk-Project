import re

with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

# 1. Fix fetchMembers logic
fetch_logic = """    // Fetch all members for selection
    const fetchMembers = async () => {
      if (!profile) return;
      let q;
      if (isAdmin) {
        q = query(
          collection(db, 'users'), 
          where('membershipStatus', '==', 'ACTIVE')
        );
      } else {
        q = query(
          collection(db, 'users'), 
          where('chapter_id', '==', profile?.chapter_id),
          where('membershipStatus', '==', 'ACTIVE')
        );
      }
      const snap = await getDocs(q);
      const memberList = snap.docs
        .map(doc => ({ uid: doc.id, ...(doc.data() as any) } as UserProfile))
        .filter(m => m.uid !== profile.uid && m.role !== 'MASTER_ADMIN'); // Exclude self and Master Admin

      setMembers(memberList);
    };"""

content = re.sub(
    r'    // Fetch all members for selection.*?setMembers\(memberList\);\n    \};',
    fetch_logic,
    content,
    flags=re.DOTALL
)

# 2. Fix filteredMembers logic
filtered_logic = """  const filteredMembers = members.filter(m => {
    const search = searchTerm.toLowerCase();
    const nameMatch = m.name?.toLowerCase().includes(search) || false;
    const phoneMatch = m.phone?.toLowerCase().includes(search) || m.whatsapp_number?.toLowerCase().includes(search) || false;
    const positionMatch = m.position?.toLowerCase().includes(search) || m.role?.toLowerCase().includes(search) || false;
    
    return nameMatch || phoneMatch || positionMatch;
  });"""

content = re.sub(
    r'  const filteredMembers = members\.filter\(m => \n.*?m\.area\?\.toLowerCase\(\)\.includes\(searchTerm\.toLowerCase\(\)\)\n  \);',
    filtered_logic,
    content,
    flags=re.DOTALL
)


# 3. Add leadership badge to member list
item_render = """                            <div className="flex items-center gap-3">
                              <img
                                src={member.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                className="w-10 h-10 rounded-lg object-cover shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-bold text-white uppercase tracking-tight">
                                    {member.name}
                                  </p>
                                  <span className={cn(
                                    "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full",
                                    member.role === 'CHAPTER_ADMIN' || member.position === 'chapter_admin' ? "bg-red-500/20 text-red-400 border border-red-500/20" :
                                    member.position === 'president' ? "bg-amber-500/20 text-amber-400 border border-amber-500/20" :
                                    member.position === 'vice_president' ? "bg-blue-500/20 text-blue-400 border border-blue-500/20" :
                                    member.position === 'treasurer' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
                                    "bg-neutral-500/20 text-neutral-400 border border-neutral-500/20"
                                  )}>
                                    {member.role === 'CHAPTER_ADMIN' || member.position === 'chapter_admin' ? 'Chapter Admin' :
                                     member.position === 'president' ? 'President' :
                                     member.position === 'vice_president' ? 'Vice President' :
                                     member.position === 'treasurer' ? 'Treasurer' : 'Member'}
                                  </span>
                                </div>
                                <p className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest truncate mt-0.5">
                                  {member.category || 'General'} • {member.phone || member.whatsapp_number || 'No Phone'}
                                </p>
                              </div>
                            </div>"""

content = re.sub(
    r'                            <div className="flex items-center gap-3">.*?</div>\n                            </div>',
    item_render,
    content,
    flags=re.DOTALL
)

with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)
