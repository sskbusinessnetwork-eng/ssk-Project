const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexTable = /<div className="overflow-x-auto w-full">\s*<table className="w-full text-left border-collapse">[\s\S]*?<\/table>\s*<\/div>/m;

const newCardList = `<div className="flex flex-col gap-3 sm:gap-4 w-full">
              {paginatedUpcomingTableMeetings.map((meeting) => {
                const dateFormatted = meeting.date ? format(new Date(meeting.date), 'dd MMM yyyy') : 'N/A';
                const timeFormatted = formatTime12h(meeting.time || '07:30');
                const canUpdate = canUserUpdateMeeting(meeting);
                const mStatus = getMeetingStatus(meeting);

                return (
                  <motion.div
                    key={meeting.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleOpenAttendanceReport(meeting)}
                    className="group bg-[#111827] border border-white/5 hover:border-white/10 rounded-xl sm:rounded-[18px] p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-w-0">
                      {/* Top: Status & Title */}
                      <div className="flex items-start justify-between sm:justify-start gap-3">
                        <h3 className="text-[14px] sm:text-[16px] font-black text-white uppercase tracking-wide truncate leading-tight">
                          {meeting.title || meeting.topic || \`\${getChapterName(meeting)} MEETING\`}
                        </h3>
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0", mStatus.color)}>
                          {mStatus.label}
                        </span>
                      </div>
                      
                      {/* Info: Date & Location */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5">
                        <div className="flex items-center gap-2 text-neutral-300 text-[11px] sm:text-xs font-bold">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Calendar size={12} className="text-primary" />
                          </div>
                          <span>{dateFormatted} &middot; {timeFormatted}</span>
                        </div>
                        <div className="flex items-start sm:items-center gap-2 text-neutral-400 text-[11px] sm:text-xs font-semibold">
                          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <MapPin size={12} />
                          </div>
                          <span className="truncate max-w-[200px] sm:max-w-[250px]">{meeting.location || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0 w-full sm:w-auto">
                      {canUpdate ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeeting(meeting);
                              const normalizedAttendance: Record<string, string> = {};
                              if (meeting.attendance) {
                                Object.entries(meeting.attendance).forEach(([uid, val]) => {
                                  const v = String(val);
                                  if (v === 'PRESENT' || v === 'YES' || v === 'Yes') normalizedAttendance[uid] = 'Present';
                                  else if (v === 'ABSENT' || v === 'NO' || v === 'No') normalizedAttendance[uid] = 'Absent';
                                  else if (v === 'SUBSTITUTE' || v === 'Substitute') normalizedAttendance[uid] = 'Substitute';
                                  else if (v === 'MEDICAL' || v === 'Medical') normalizedAttendance[uid] = 'Medical';
                                  else normalizedAttendance[uid] = String(val);
                                });
                              }
                              setTempAttendance(normalizedAttendance);
                              setTempAmount(meeting.amountCollected || {});
                              setTempMemberNotes(meeting.memberNotes || {});
                              setIsUpdateModalOpen(true);
                            }}
                            className="flex-1 sm:flex-none text-center px-4 py-2 sm:py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            Update
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeeting(meeting);
                              setIsCancelConfirmOpen(true);
                            }}
                            className="flex-1 sm:flex-none text-center px-4 py-2 sm:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <div className="w-full text-right sm:text-left">
                          <span className="text-[10px] text-neutral-500 italic block py-2 sm:py-0">No actions</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>`;

if (content.match(regexTable)) {
  content = content.replace(regexTable, newCardList);
  fs.writeFileSync('src/pages/Meetings.tsx', content);
  console.log('Replaced upcoming table with card layout');
} else {
  console.log('regexTable not found');
}

