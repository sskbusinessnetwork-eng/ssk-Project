import re

with open("src/pages/Reports.tsx", "r") as f:
    content = f.read()

old_pos = """      // Human-readable position label
      let displayPosition = 'Associate Member';
      if (member.position === 'president') displayPosition = 'President';
      else if (member.position === 'vice_president') displayPosition = 'Vice President';
      else if (member.position === 'treasurer') displayPosition = 'Treasurer';
      else if (member.position === 'chapter_admin' || member.role === 'CHAPTER_ADMIN') displayPosition = 'Chapter Admin';"""

new_pos = """      // Human-readable position label
      let displayPosition = 'Member';
      const role = (member.role || 'MEMBER').toUpperCase();
      if (role === 'PRESIDENT') displayPosition = 'President';
      else if (role === 'VICE_PRESIDENT') displayPosition = 'Vice President';
      else if (role === 'TREASURER') displayPosition = 'Treasurer';
      else if (role === 'CHAPTER_ADMIN') displayPosition = 'Chapter Admin';"""

content = content.replace(old_pos, new_pos)

old_badge = """                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                row.positionKey === 'president' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                row.positionKey === 'vice_president' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                row.positionKey === 'treasurer' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                row.positionKey === 'chapter_admin' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}>"""

new_badge = """                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                row.position === 'President' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                row.position === 'Vice President' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                row.position === 'Treasurer' ? "bg-purple-500/10 text-purple-400 border-purple-500/20" :
                                row.position === 'Chapter Admin' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}>"""

content = content.replace(old_badge, new_badge)

with open("src/pages/Reports.tsx", "w") as f:
    f.write(content)
