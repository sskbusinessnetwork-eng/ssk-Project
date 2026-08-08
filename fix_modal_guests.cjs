const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexGuests = /<div className="overflow-x-auto">\s*<div className="min-w-\[600px\] px-4 sm:px-0">\s*<table className="w-full text-left border-collapse">[\s\S]*?<\/table>\s*<\/div>\s*<\/div>/;

const newListGuests = `<div className="flex flex-col divide-y divide-white/5">
                {meetingGuests.map((guest) => {
                  const status = tempGuestAttendance[guest.id] || '';
                  const amount = tempAmount[guest.id] || 0;
                  const inviter = guestInviters[guest.invited_by];
                  
                  return (
                    <div key={guest.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-[#151C2E] transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] sm:text-sm font-bold text-white truncate group-hover:text-secondary transition-colors">
                          {guest.guest_name}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate mt-0.5 font-semibold uppercase tracking-wider">
                          Invited by {inviter?.name || guest.invited_by_name || 'Member'}{guest.invited_by_role ? \` (\${guest.invited_by_role})\` : inviter?.position ? \` (\${inviter.position})\` : ''} • {guest.business_category || 'Guest'}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 w-full sm:w-auto">
                        <select
                          value={status}
                          onChange={(e) => setTempGuestAttendance(prev => ({ ...prev, [guest.id]: e.target.value }))}
                          className={cn(
                            "flex-1 sm:flex-none px-2 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg border outline-none appearance-none cursor-pointer text-center",
                            status === 'Present' ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" :
                            status === 'Absent' ? "border-red-500/30 text-red-400 bg-red-500/10" :
                            "border-white/5 text-neutral-400 bg-[#151C2E]"
                          )}
                        >
                          <option value="" className="bg-[#111827] text-white">Select Status</option>
                          <option value="Present" className="bg-[#111827] text-white">Present</option>
                          <option value="Absent" className="bg-[#111827] text-white">Absent</option>
                        </select>
                        
                        {(status === 'Present' || status === 'Substitute') && (
                          <div className="relative flex-shrink-0 w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold text-[11px]">₹</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={amount}
                              onChange={(e) => setTempAmount(prev => ({ ...prev, [guest.id]: parseInt(e.target.value) || 0 }))}
                              className="w-full pl-6 pr-2 py-1.5 sm:py-2 bg-black/20 border border-white/5 rounded-lg text-[11px] sm:text-xs font-bold text-white placeholder-neutral-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>`;

if(content.match(regexGuests)) {
  content = content.replace(regexGuests, newListGuests);
  fs.writeFileSync('src/pages/Meetings.tsx', content);
  console.log("Replaced Update Modal Guests");
} else {
  console.log("Not found regexGuests");
}
