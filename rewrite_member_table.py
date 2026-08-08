import re

with open('src/components/members/MemberTable.tsx', 'r') as f:
    content = f.read()

# Replace from <div className="space-y-6"> to the end of the file.
pattern = re.compile(r'    <div className="space-y-6">.*', re.DOTALL)

replacement = """    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {members.length > 0 ? (
        members.map((member) => {
          const displayPosition = getDisplayPosition(member.position, member.role);
          return (
            <div key={member.uid} className="bg-[#111827] p-4 rounded-xl border border-white/5 relative flex flex-col gap-2 shadow-sm hover:border-white/10 transition-colors">
              <div className="flex items-start gap-3">
                <Avatar src={member.photoURL} name={member.name} size="w-12 h-12" className="rounded-full shrink-0" fallbackClassName="rounded-full text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-white text-sm leading-tight truncate">{member.name || member.displayName}</p>
                    <div className={cn(
                      "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0",
                      isMemberActive(member) ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                    )}>
                      {isMemberActive(member) ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>
                  <p className="text-xs text-primary font-semibold truncate mt-0.5">{member.businessName || member.category || 'Member'}</p>
                  {displayPosition && (
                    <p className="text-[10px] font-medium text-neutral-400 mt-0.5">{displayPosition}</p>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-[11px] text-neutral-300 font-medium">
                    <Phone size={10} className="text-neutral-500" />
                    <span>{member.phone || 'No Phone'}</span>
                  </div>
                </div>
              </div>

              {/* Action bar */}
              {showActions && (
                <div className="pt-3 mt-1 border-t border-white/5 flex flex-wrap items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/profile?id=${member.uid}`)}
                    className="px-2 py-1 bg-[#151C2E] text-neutral-200 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    View
                  </button>
                  {currentUserId === member.uid && (
                  <button
                    onClick={() => onEditMember(member)}
                    className="px-2 py-1 bg-[#151C2E] text-neutral-200 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    Edit
                  </button>
                  )}
                  <button
                    onClick={() => onResetPassword(member)}
                    className="px-2 py-1 bg-[#151C2E] text-neutral-200 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => onOpenSubModal(member)}
                    className="px-2 py-1 bg-[#151C2E] text-neutral-200 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-[#1C2538]"
                  >
                    Sub
                  </button>
                  
                  {member.membershipStatus === 'ACTIVE' ? (
                    <button
                      onClick={() => onUpdateStatus(member.uid, 'SUSPENDED')}
                      className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-red-500/20"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(member.uid, 'ACTIVE')}
                      className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95 hover:bg-emerald-500/20"
                    >
                      Activate
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDeleteMember(member)}
                    className="h-6 w-6 bg-red-500/10 text-red-400 rounded flex items-center justify-center transition-all active:scale-95 hover:bg-red-500/20"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="col-span-full bg-[#111827] p-8 rounded-xl border border-white/5 text-center">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">No members found.</p>
        </div>
      )}
    </div>
  );
}
"""

content = re.sub(pattern, replacement, content)
with open('src/components/members/MemberTable.tsx', 'w') as f:
    f.write(content)
