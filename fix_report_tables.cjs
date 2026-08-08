const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexMemberRoster = /<div className="overflow-x-auto border border-white\/5 rounded-\[12px\] bg-\[#151C2E\]">\s*<table className="w-full text-left border-collapse min-w-\[600px\]">[\s\S]*?<\/table>\s*<\/div>/;

const listMemberRoster = `<div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-[12px] bg-[#151C2E] overflow-hidden">
                {(() => {
                  const meetingChapId = reportMeeting.chapter_id || (reportMeeting as any).chapterId || (reportMeeting.adminId ? usersMap[reportMeeting.adminId]?.chapter_id : null);
                  const members = allUsers.filter(u => u.role !== 'MASTER_ADMIN' && meetingChapId && u.chapter_id === meetingChapId);
                  
                  if (members.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs text-neutral-400 font-medium">
                        No member records found for this chapter.
                      </div>
                    );
                  }
                  
                  return members.map(m => {
                    const rawStatus = reportMeeting.attendance?.[m.uid];
                    const displayStatus = getAttendanceDisplay(rawStatus);
                    const fee = reportMeeting.amountCollected?.[m.uid] || 0;
                    const note = reportMeeting.memberNotes?.[m.uid] || '-';
                    
                    return (
                      <div key={m.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                            {m.name || m.displayName || 'Unnamed Member'}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-neutral-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                            {getMemberPositionLabel(m)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border inline-flex shrink-0", displayStatus.color)}>
                            {displayStatus.label}
                          </span>
                          <span className="text-[13px] font-bold text-white whitespace-nowrap">
                            ₹{Number(fee).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>`;

if(content.match(regexMemberRoster)) {
  content = content.replace(regexMemberRoster, listMemberRoster);
  console.log("Replaced Member Roster");
} else {
  console.log("Not found regexMemberRoster");
}


const regexGuestRoster = /<div className="overflow-x-auto border border-white\/5 rounded-\[12px\] bg-\[#151C2E\]">\s*<table className="w-full text-left border-collapse min-w-\[600px\]">\s*<thead>\s*<tr className="border-b border-white\/5 bg-\[#111827\]">\s*<th className="py-3 px-4 text-\[10px\] font-bold text-neutral-400 uppercase tracking-wider">Guest Name<\/th>[\s\S]*?<\/table>\s*<\/div>/;

const listGuestRoster = `<div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-[12px] bg-[#151C2E] overflow-hidden">
                  {reportGuests.map(g => (
                    <div key={g.id || g.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-secondary transition-colors">
                          {g.name || 'Guest'}
                        </h4>
                        <p className="text-[10px] sm:text-[11px] text-neutral-400 font-semibold mt-0.5 truncate uppercase tracking-wider">
                          {g.businessCategory || g.category || 'N/A'} • Inv: {g.invitedBy || 'Member'}
                        </p>
                      </div>
                      <div className="flex items-center justify-start sm:justify-end gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                        <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">
                          {g.mobile || g.phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>`;
                
if(content.match(regexGuestRoster)) {
  content = content.replace(regexGuestRoster, listGuestRoster);
  console.log("Replaced Guest Roster");
} else {
  console.log("Not found regexGuestRoster");
}

fs.writeFileSync('src/pages/Meetings.tsx', content);

