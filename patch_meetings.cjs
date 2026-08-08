const fs = require('fs');

const content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const startStr = `          {upcomingTableMeetings.length > 0 ? (`;
const endStr = `          ) : (
            <div className="p-8 text-center bg-[#111827] rounded-[20px] border border-dashed border-white/5">
              <div className="w-10 h-10 bg-[#151C2E] rounded-full flex items-center justify-center mx-auto mb-2 text-neutral-400">`;

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
  const replaceStr = `          {upcomingTableMeetings.length > 0 ? (
            <div className="bg-[#111827] rounded-[18px] border border-white/5 overflow-hidden shadow-sm flex flex-col">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
                  <thead>
                    <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-neutral-400 bg-[#151C2E]/50">
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Date & Time</th>
                      <th className="px-4 py-3 font-bold">Address</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 font-bold whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paginatedUpcomingTableMeetings.map((meeting) => {
                      const dateFormatted = meeting.date ? format(new Date(meeting.date), 'dd MMM yyyy') : 'N/A';
                      const timeFormatted = formatTime12h(meeting.time || '07:30');
                      const canUpdate = canUserUpdateMeeting(meeting);
                      const mStatus = getMeetingStatus(meeting);

                      return (
                        <tr 
                          key={meeting.id}
                          onClick={() => handleOpenAttendanceReport(meeting)}
                          className="hover:bg-[#151C2E]/80 transition-colors group cursor-pointer"
                        >
                          {/* Date & Time */}
                          <td className="px-4 py-3 align-middle">
                            <div className="flex flex-col gap-1 min-w-[100px]">
                              <div className="flex items-center gap-1.5 text-white font-medium text-xs whitespace-nowrap">
                                <Calendar size={12} className="text-primary shrink-0" />
                                <span>{dateFormatted}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] whitespace-nowrap">
                                <Clock size={12} className="shrink-0" />
                                <span>{timeFormatted}</span>
                              </div>
                            </div>
                          </td>

                          {/* Address */}
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-start gap-1.5 max-w-[200px] md:max-w-[250px] lg:max-w-[300px]" title={meeting.location || 'N/A'}>
                              <MapPin size={12} className="text-neutral-400 shrink-0 mt-0.5" />
                              <span className="text-xs text-neutral-300 truncate leading-snug whitespace-normal line-clamp-2 md:line-clamp-1 md:truncate">
                                {meeting.location || 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 align-middle">
                            <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap", mStatus.color)}>
                              {mStatus.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 align-middle">
                            {canUpdate ? (
                              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMeeting(meeting);
                                    const normalizedAttendance = {};
                                    if (meeting.attendance) {
                                      Object.entries(meeting.attendance).forEach(([uid, val]) => {
                                        const v = String(val);
                                        if (v === 'PRESENT' || v === 'YES' || v === 'Yes') normalizedAttendance[uid] = 'Present';
                                        else if (v === 'ABSENT' || v === 'NO' || v === 'No') normalizedAttendance[uid] = 'Absent';
                                        else if (v === 'SUBSTITUTE' || v === 'Substitute') normalizedAttendance[uid] = 'Substitute';
                                        else if (v === 'MEDICAL' || v === 'Medical') normalizedAttendance[uid] = 'Medical';
                                        else normalizedAttendance[uid] = val;
                                      });
                                    }
                                    setTempAttendance(normalizedAttendance);
                                    setTempAmount(meeting.amountCollected || {});
                                    setTempMemberNotes(meeting.memberNotes || {});
                                    setIsUpdateModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-[#151C2E] hover:bg-emerald-600/20 text-emerald-400 border border-white/5 hover:border-emerald-500/30 rounded-[6px] text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap"
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
                                  className="px-2.5 py-1.5 bg-[#151C2E] hover:bg-red-500/20 text-red-400 border border-white/5 hover:border-red-500/30 rounded-[6px] text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-neutral-500 italic whitespace-nowrap">No actions</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalUpcomingPages > 1 && (
                <div className="border-t border-white/5 px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-[#151C2E]/30">
                  <span className="text-[11px] text-neutral-400">
                    Showing {(upcomingPage - 1) * upcomingPerPage + 1} to {Math.min(upcomingPage * upcomingPerPage, upcomingTableMeetings.length)} of {upcomingTableMeetings.length} meetings
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setUpcomingPage(p => Math.max(1, p - 1))}
                      disabled={upcomingPage === 1}
                      className="px-2 py-1 text-[11px] font-medium text-white bg-[#151C2E] border border-white/10 rounded-[6px] hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    
                    <span className="px-2 py-1 text-[11px] font-bold text-white bg-primary/20 border border-primary/30 rounded-[6px]">
                      {upcomingPage}
                    </span>

                    <button
                      onClick={() => setUpcomingPage(p => Math.min(totalUpcomingPages, p + 1))}
                      disabled={upcomingPage === totalUpcomingPages}
                      className="px-2 py-1 text-[11px] font-medium text-white bg-[#151C2E] border border-white/10 rounded-[6px] hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
`;
  const newContent = content.substring(0, startIdx) + replaceStr + content.substring(endIdx);
  fs.writeFileSync('src/pages/Meetings.tsx', newContent, 'utf-8');
  console.log("SUCCESS");
} else {
  console.log("INDEX NOT FOUND", {startIdx, endIdx});
}
