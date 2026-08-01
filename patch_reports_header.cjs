const fs = require('fs');
let code = fs.readFileSync('src/pages/Reports.tsx', 'utf-8');

const headerHTML = `      {/* HEADER SECTION */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/5 pb-5"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div>
            <span className="text-[11px] font-extrabold text-[#9CA3AF] uppercase tracking-[3px]">
              Enterprise Analytics Suite
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Activity className="text-[#E53935] h-7 w-7" />
              {currentChapterName} Report
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-bold uppercase tracking-wider">
              {profile?.role === 'MASTER_ADMIN' 
                ? \`Super Admin dashboard monitoring: \${currentChapterName}\` 
                : \`Roster performance audits and metrics overview for \${currentChapterName}\`}
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-[#111827]/80 border border-white/10 px-5 py-3 rounded-2xl">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#9CA3AF] font-bold uppercase">Growth Score</span>
              <span className="text-2xl font-black text-white leading-none">{chapterGrowthScoreData.score}%</span>
            </div>
            <div className="w-px h-8 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-[#9CA3AF] font-bold uppercase">Status</span>
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border mt-1", chapterGrowthScoreData.statusColor)}>
                {chapterGrowthScoreData.status}
              </span>
            </div>
          </div>
        </div>`;

code = code.replace(/\{\/\* HEADER SECTION \*\/\}[\s\S]*?<p className="text-xs text-\[#9CA3AF\] mt-1 font-bold uppercase tracking-wider">[\s\S]*?<\/p>\s*<\/div>/, headerHTML);
fs.writeFileSync('src/pages/Reports.tsx', code);
