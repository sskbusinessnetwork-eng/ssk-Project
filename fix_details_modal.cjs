const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexDetailsTable = /<div className="bg-\[#111827\] rounded-\[16px\] border border-white\/5 overflow-x-auto">\s*<table className="w-full text-left border-collapse min-w-\[600px\]">[\s\S]*?<\/table>\s*<\/div>/;

const newListDetails = `<div className="flex flex-col divide-y divide-white/5 bg-[#111827] rounded-[16px] border border-white/5 overflow-hidden">
            {members.filter(m => m.adminId === detailsMeeting?.adminId || m.uid === detailsMeeting?.adminId).map((member) => {
              const status = detailsMeeting?.attendance?.[member.uid];
              const amount = detailsMeeting?.amountCollected?.[member.uid] || 0;
              const displayObj = getAttendanceDisplay(status);
              
              return (
                <div key={member.uid} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3 hover:bg-[#1C2538] transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={member.photoURL} name={member.name || member.displayName || 'Member'} size="w-8 h-8" className="rounded-xl" fallbackClassName="rounded-xl text-xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-sm font-bold text-white truncate">{member.name || member.displayName || 'Unnamed Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 w-full sm:w-auto ml-11 sm:ml-0">
                    <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border shrink-0", displayObj.color)}>
                      {displayObj.label}
                    </span>
                    <p className="text-xs font-bold text-white whitespace-nowrap">₹{amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>`;

if(content.match(regexDetailsTable)) {
  content = content.replace(regexDetailsTable, newListDetails);
  console.log("Replaced Details Modal Table");
} else {
  console.log("Not found regexDetailsTable");
}
fs.writeFileSync('src/pages/Meetings.tsx', content);

