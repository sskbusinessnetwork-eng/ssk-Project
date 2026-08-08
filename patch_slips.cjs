const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regexMap = /(<motion\.div\s+layout\s+initial=\{\{ opacity: 0, y: 10 \}\}\s+animate=\{\{ opacity: 1, y: 0 \}\}\s+key=\{slip\.id\}\s+className="group bg-\[#111827\]) p-3\.5 sm:p-6 (rounded-xl sm:rounded-\[16px\] border border-white\/5 shadow-sm hover:border-white\/10 transition-all duration-300) space-y-3 sm:space-y-4(">\s+)\{\/\* Top Bar: Slip Number, Status Badge & Date\/Time \*\/\}/m;

const match = content.match(regexMap);
if (match) {
  const newMotionDivStart = `${match[1]} ${match[2]}${match[3]}
                  {/* MOBILE COMPACT LIST (visible only on mobile) */}
                  <div 
                    className="sm:hidden flex items-center justify-between p-3.5 cursor-pointer"
                    onClick={() => setSelectedSlipForDetails(slip)}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <span className="text-[14px] sm:text-[15px] font-bold text-white truncate leading-tight">
                        {activeTab === 'sent' ? getUserName(slip.toUserId) : activeTab === 'received' ? getUserName(slip.fromUserId) : \`\${getUserName(slip.fromUserId)} → \${getUserName(slip.toUserId)}\`}
                      </span>
                      <span className="text-[10px] text-neutral-400 mt-0.5 font-medium">
                        {format(new Date(slip.createdAt), 'dd MMM yyyy')}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[14px] sm:text-[15px] font-bold text-emerald-400">
                        ₹{Number(slip.businessValue || slip.business_value || slip.amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* DESKTOP CARD (hidden on mobile, visible on sm and up) */}
                  <div className="hidden sm:block p-6 space-y-4">
                  {/* Top Bar: Slip Number, Status Badge & Date/Time */}`;
                  
  content = content.replace(regexMap, newMotionDivStart);
  
  // also close the desktop card container at the end
  const regexClose = /(<\/div>\s+)(<\/motion\.div>)/m;
  const matchClose = content.substring(content.indexOf('View Details Footer')).match(regexClose);
  if (matchClose) {
     // Wait, it might match the wrong one. Let's do it safer.
  }
}

console.log("Done check");
