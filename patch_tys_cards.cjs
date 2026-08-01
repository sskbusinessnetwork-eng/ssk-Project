const fs = require('fs');
const file = 'src/pages/ThankYouSlips.tsx';
let code = fs.readFileSync(file, 'utf8');

const startTarget = '{/* Summary Cards */}';
const endTarget = '{/* Tabs (Member/Chapter Admin view) */}';
const startIdx = code.indexOf(startTarget);
const endIdx = code.indexOf(endTarget);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `{/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {!isMasterAdmin ? (
          <>
            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-[14px] px-[12px] py-[10px] sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[110px] sm:h-[135px] transition-all duration-300 w-full gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <TrendingUp size={15} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-1">Business Generated</span>
              <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-1">
                ₹{totalBusinessSent.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  {slips.length} slips submitted
                </span>
              </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-[14px] px-[12px] py-[10px] sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[110px] sm:h-[135px] transition-all duration-300 w-full gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/30 bg-cyan-950/80 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Award size={15} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-1">Business Received</span>
              <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-1">
                ₹{totalBusinessReceived.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  {receivedSlips.length} slips received
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-[14px] px-[12px] py-[10px] sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[110px] sm:h-[135px] transition-all duration-300 w-full gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <TrendingUp size={15} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-1">Total Generated</span>
              <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-1">
                ₹{totalBusinessGenerated.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  Network-wide passed
                </span>
              </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-[14px] px-[12px] py-[10px] sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[110px] sm:h-[135px] transition-all duration-300 w-full gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/30 bg-cyan-950/80 text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <Award size={15} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-1">Total Received</span>
              <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-1">
                ₹{totalBusinessReceivedFiltered.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  Network-wide received
                </span>
              </div>
            </div>

            <div className="bg-[#0F172A]/80 backdrop-blur-md rounded-[14px] px-[12px] py-[10px] sm:p-3.5 shadow-[0_8px_25px_rgba(0,0,0,0.5)] border border-white/10 flex flex-col justify-center items-center text-center h-[110px] sm:h-[135px] transition-all duration-300 w-full gap-1 col-span-2 sm:col-span-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-amber-500/30 bg-amber-950/80 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                <TrendingUp size={15} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider leading-none truncate w-full mt-1">Network Volume</span>
              <div className="text-[18px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-1">
                ₹{totalNetworkBusiness.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-1">
                <span className="text-[8px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  Total transaction volume
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      `;
  
  const newCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  fs.writeFileSync(file, newCode);
  console.log("Patched TYS cards!");
} else {
  console.log("Failed to patch.");
}
