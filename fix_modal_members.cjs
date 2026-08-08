const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexTableMembers = /<div className="overflow-x-auto">\s*<div className="min-w-\[600px\] px-4 sm:px-0">\s*<table className="w-full text-left border-collapse">[\s\S]*?<\/table>\s*<\/div>\s*<\/div>/;

const newListMembers = `<div className="flex flex-col divide-y divide-white/5">
                  {(() => {
                    const meetingChapId = selectedMeeting?.chapter_id || (selectedMeeting?.adminId ? usersMap[selectedMeeting.adminId]?.chapter_id : null) || profile?.chapter_id;
                    const getPositionRank = (u: any) => {
                      const role = String(u.role || '').toUpperCase();
                      const pos = String(u.position || u.chapter_position || '').toLowerCase();
                      if (role === 'CHAPTER_ADMIN' || pos === 'chapter_admin' || pos === 'chapter admin') return 1;
                      if (pos === 'president') return 2;
                      if (pos.includes('vice')) return 3;
                      if (pos === 'secretary') return 4;
                      if (pos === 'treasurer') return 5;
                      return 6;
                    };
                    const meetingMembers = (modalChapterMembers.length > 0 ? modalChapterMembers : members.filter(m => {
                      if (m.role === 'MASTER_ADMIN') return false;
                      return Boolean(m.chapter_id && meetingChapId && String(m.chapter_id).trim() === String(meetingChapId).trim());
                    })).sort((a, b) => {
                      const rankA = getPositionRank(a);
                      const rankB = getPositionRank(b);
                      if (rankA !== rankB) return rankA - rankB;
                      return (a.name || '').localeCompare(b.name || '');
                    });

                    if (meetingMembers.length === 0) {
                      return (
                        <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                          No members found for this chapter.
                        </div>
                      );
                    }

                    return meetingMembers.map((member) => {
                      const mId = member.id || member.uid;
                      const attendanceVal = tempAttendance[mId] || 'Present';
                      const amtVal = tempAmount[mId] || '';
                      
                      const getStatusColor = (status: string) => {
                        const s = String(status || '').toLowerCase();
                        if (s === 'present') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                        if (s === 'absent') return 'text-red-400 bg-red-500/10 border-red-500/20';
                        if (s === 'substitute') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                        if (s === 'medical') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                        return 'text-neutral-400 bg-[#151C2E] border-white/10';
                      };
                      
                      return (
                        <div key={mId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-[#151C2E] transition-colors group">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                              {member.name || member.displayName || 'Unknown Member'}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-neutral-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                              {member.position || member.chapter_position || 'Member'}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                            <select
                              value={attendanceVal}
                              onChange={(e) => {
                                setTempAttendance({ ...tempAttendance, [mId]: e.target.value });
                                if (e.target.value === 'Absent' || e.target.value === 'Medical') {
                                  setTempAmount(prev => {
                                    const next = { ...prev };
                                    delete next[mId];
                                    return next;
                                  });
                                }
                              }}
                              className={cn(
                                "flex-1 sm:flex-none px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg border outline-none appearance-none cursor-pointer text-center",
                                getStatusColor(attendanceVal)
                              )}
                            >
                              <option value="Present" className="bg-[#111827] text-white">Present</option>
                              <option value="Absent" className="bg-[#111827] text-white">Absent</option>
                              <option value="Substitute" className="bg-[#111827] text-white">Substitute</option>
                              <option value="Medical" className="bg-[#111827] text-white">Medical</option>
                            </select>
                            
                            {(attendanceVal === 'Present' || attendanceVal === 'Substitute') && (
                              <div className="relative flex-shrink-0 w-24">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-[11px]">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={amtVal}
                                  onChange={(e) => setTempAmount({ ...tempAmount, [mId]: e.target.value })}
                                  className="w-full pl-6 pr-2 py-1.5 sm:py-2 bg-black/20 border border-white/5 rounded-lg text-[11px] sm:text-xs font-bold text-white placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>`;

if(content.match(regexTableMembers)) {
  content = content.replace(regexTableMembers, newListMembers);
  fs.writeFileSync('src/pages/Meetings.tsx', content);
  console.log("Replaced update modal Members table");
} else {
  console.log("Regex not matched");
}
