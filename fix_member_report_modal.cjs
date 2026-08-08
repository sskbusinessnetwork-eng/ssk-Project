const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexMemberReportTable = /<div className="overflow-x-auto -mx-6 px-6">\s*<table className="w-full text-left border-collapse min-w-\[700px\]">[\s\S]*?<\/table>\s*<\/div>/;

const listMemberReport = `<div className="flex flex-col divide-y divide-white/5 border border-white/5 rounded-[16px] bg-[#111827] overflow-hidden">
            {completedMeetings.length > 0 ? (
              completedMeetings.map((meeting) => {
                const status = meeting.attendance[profile?.uid || ''];
                const amount = meeting.amountCollected?.[profile?.uid || ''] || 0;
                const chapterName = adminAdmins.find(a => a.uid === meeting.adminId)?.name || 'Chapter';
                
                return (
                  <div key={meeting.id} className="flex flex-col p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-sm font-bold text-white truncate">
                          {format(new Date(meeting.date), 'dd MMM yyyy')} &middot; {formatTime12h(meeting.time || '07:30')}
                        </p>
                        <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 mt-0.5 truncate uppercase tracking-wider">
                          {chapterName}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {(() => {
                          const displayObj = getAttendanceDisplay(status);
                          return (
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                              displayObj.color
                            )}>
                              {displayObj.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] sm:text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-400 font-medium truncate max-w-[200px]" title={meeting.location}>
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{meeting.location || 'Meeting Venue'}</span>
                      </div>
                      <div className="font-bold text-white bg-white/5 px-2.5 py-1 rounded-lg">
                        ₹{amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <div className="w-12 h-12 bg-[#151C2E] rounded-full flex items-center justify-center text-neutral-400 border border-white/5 mx-auto mb-3">
                  <Calendar size={24} />
                </div>
                <p className="text-sm font-bold text-neutral-400">No records found</p>
              </div>
            )}
          </div>`;

if(content.match(regexMemberReportTable)) {
  content = content.replace(regexMemberReportTable, listMemberReport);
  console.log("Replaced Member Report Table");
} else {
  console.log("Not found regexMemberReportTable");
}

fs.writeFileSync('src/pages/Meetings.tsx', content);

