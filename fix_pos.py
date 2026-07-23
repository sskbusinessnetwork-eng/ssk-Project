import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_getDisplayPosition = """  const getDisplayPosition = (pos?: string, role?: string) => {
    if (role === 'MASTER_ADMIN') return 'Master Admin';
    if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') return 'Chapter Admin';
    if (pos === 'president') return 'President';
    if (pos === 'vice_president') return 'Vice President';
    if (pos === 'treasurer') return 'Treasurer';
    return 'Associate Member';
  };"""

new_getDisplayPosition = """  const getDisplayPosition = (pos?: string, role?: string) => {
    if (!role) return 'Member';
    const r = role.toUpperCase();
    if (r === 'MASTER_ADMIN') return 'Master Admin';
    if (r === 'CHAPTER_ADMIN') return 'Chapter Admin';
    if (r === 'PRESIDENT') return 'President';
    if (r === 'VICE_PRESIDENT') return 'Vice President';
    if (r === 'TREASURER') return 'Treasurer';
    if (r === 'MEMBER') return 'Member';
    return 'Member';
  };"""

content = content.replace(old_getDisplayPosition, new_getDisplayPosition)

old_getPositionBadge = """  const getPositionBadge = (member: UserProfile) => {
    const role = member.role;
    const pos = member.position?.toLowerCase();
    
    let label = 'Associate Member';
    let classes = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

    if (role === 'MASTER_ADMIN') {
      label = 'Master Admin';
      classes = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    } else if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin') {
      label = 'Chapter Admin';
      classes = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (pos === 'president') {
      label = 'President';
      classes = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (pos === 'vice_president') {
      label = 'Vice President';
      classes = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (pos === 'treasurer') {
      label = 'Treasurer';
      classes = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    }

    return (
      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0", classes)}>
        {label}
      </span>
    );
  };"""

new_getPositionBadge = """  const getPositionBadge = (member: UserProfile) => {
    const role = (member.role || 'MEMBER').toUpperCase();
    
    let label = 'Member';
    let classes = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

    if (role === 'MASTER_ADMIN') {
      label = 'Master Admin';
      classes = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    } else if (role === 'CHAPTER_ADMIN') {
      label = 'Chapter Admin';
      classes = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    } else if (role === 'PRESIDENT') {
      label = 'President';
      classes = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    } else if (role === 'VICE_PRESIDENT') {
      label = 'Vice President';
      classes = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    } else if (role === 'TREASURER') {
      label = 'Treasurer';
      classes = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
    } else if (role === 'MEMBER') {
      label = 'Member';
    }

    return (
      <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border shrink-0", classes)}>
        {label}
      </span>
    );
  };"""

content = content.replace(old_getPositionBadge, new_getPositionBadge)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
