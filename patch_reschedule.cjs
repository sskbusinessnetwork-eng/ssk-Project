const fs = require('fs');
const file = 'src/pages/OneToOneMeetings.tsx';
let code = fs.readFileSync(file, 'utf8');

// The reschedule date/time block
const target = `          {/* Meeting Date */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Date</label>
            <input
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium bg-[#151C2E] text-white"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Meeting Time */}
          <div className="space-y-2">`;

const replacement = `          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Meeting Date */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em]">Meeting Date</label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium bg-[#151C2E] text-white"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Meeting Time */}
            <div className="space-y-2">`;

if(code.includes(target)) {
  code = code.replace(target, replacement);
  // Also need to add the closing div for the grid
  
  const targetEnd = `                  </div>
                </div>
              );
            })()}
          </div>`;
          
  const replacementEnd = `                  </div>
                </div>
              );
            })()}
          </div>
          </div>`;
          
  code = code.replace(targetEnd, replacementEnd);
  fs.writeFileSync(file, code);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
