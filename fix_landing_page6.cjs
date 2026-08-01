const fs = require('fs');
const file = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Form Button
content = content.replace(
  'className="w-full h-14 md:h-16 mt-6 md:mt-8 bg-[#0F2040] text-white rounded-[12px] md:rounded-[16px] font-extrabold uppercase tracking-[3px] text-[13px] hover:bg-[#1a365d] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] shadow-[#0F2040]/20 disabled:opacity-50"',
  'className="w-full h-12 sm:h-14 md:h-16 mt-6 md:mt-8 bg-[#0F2040] text-white rounded-[12px] md:rounded-[16px] font-extrabold uppercase tracking-[2px] md:tracking-[3px] text-[11px] sm:text-[12px] md:text-[13px] hover:bg-[#1a365d] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] shadow-[#0F2040]/20 disabled:opacity-50"'
);

// Footer
content = content.replace(
  'className="py-10 md:py-24 bg-white text-center px-6 border-t border-[#F3F4F6]"',
  'className="py-16 md:py-24 bg-white text-center px-4 sm:px-6 border-t border-[#F3F4F6]"'
);
content = content.replace(
  'className="text-[34px] md:text-[42px] lg:text-[52px] font-black text-[#0F2040] leading-none tracking-tight"',
  'className="text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px] font-black text-[#0F2040] leading-tight md:leading-none tracking-tight"'
);
content = content.replace(
  'className="text-[12px] md:text-[14px] font-extrabold text-[#9CA3AF] uppercase tracking-[3px]"',
  'className="text-[10px] sm:text-[11px] md:text-[12px] font-extrabold text-[#9CA3AF] uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  '<Shield size={16} md:size={18} className="text-[#F97316]" />',
  '<Shield className="w-4 h-4 md:w-5 md:h-5 text-[#F97316]" />'
);
content = content.replace(
  'className="pt-12 md:pt-20 flex flex-col md:flex-row items-center justify-between border-t border-[#F3F4F6] mt-12 md:mt-20 text-[10px] md:text-[12px] font-extrabold uppercase tracking-[3px] text-[#9CA3AF]"',
  'className="pt-10 md:pt-20 flex flex-col md:flex-row items-center justify-between border-t border-[#F3F4F6] mt-10 md:mt-20 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[2px] md:tracking-[3px] text-[#9CA3AF]"'
);

fs.writeFileSync(file, content);
console.log("Applied Phase 6 fixes");
