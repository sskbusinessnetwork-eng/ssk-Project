const fs = require('fs');
const file = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<CheckCircle2 size=\{32\} md:size=\{48\} \/>/g, '<CheckCircle2 className="w-8 h-8 md:w-12 md:h-12" />');
content = content.replace(
  'className="mt-6 md:mt-8 px-6 md:px-6 py-3 md:py-4 bg-[#0F2040] text-white rounded-full font-extrabold uppercase tracking-[3px] text-[13px] hover:bg-[#0F2040]/90 transition-all"',
  'className="mt-6 md:mt-8 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-[#0F2040] text-white rounded-full font-extrabold uppercase tracking-[2px] md:tracking-[3px] text-[11px] sm:text-[12px] md:text-[13px] hover:bg-[#0F2040]/90 transition-all"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] mb-8 md:mb-12 text-center tracking-tight"',
  'className="text-[20px] sm:text-[24px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] mb-6 md:mb-10 text-center tracking-tight"'
);
content = content.replace(
  'className="bg-white p-6 md:p-16 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-[#F3F4F6] relative overflow-hidden"',
  'className="bg-white p-6 sm:p-10 md:p-16 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-[#F3F4F6] relative overflow-hidden mx-2 sm:mx-0"'
);

fs.writeFileSync(file, content);
console.log("Applied Phase 5 fixes");
