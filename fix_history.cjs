const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexHistory = /<div\s*key=\{meeting\.id\}[\s\S]*?onClick=\{\(\) => handleOpenAttendanceReport\(meeting\)\}[\s\S]*?<\/div>\s*<\/div>\s*\);/gm;

const newHistory = `<div
                    key={meeting.id}
                    onClick={() => handleOpenAttendanceReport(meeting)}
                    className="px-4 py-3.5 flex flex-col justify-between gap-1 hover:bg-[#151C2E] transition-colors cursor-pointer group"
                  >
                    <h4 className="text-[13px] sm:text-sm font-bold text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors leading-tight">
                      {meetingTitle}
                    </h4>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className="text-[11px] sm:text-xs text-neutral-400 font-medium truncate">
                        {dateTimeCombined}
                      </p>
                      <span className={cn("px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border shrink-0", badge.color)}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );`;
                
if(content.match(regexHistory)) {
   content = content.replace(regexHistory, newHistory);
   fs.writeFileSync('src/pages/Meetings.tsx', content);
   console.log("Fixed history format!");
} else {
   console.log("Not found regexHistory");
}
