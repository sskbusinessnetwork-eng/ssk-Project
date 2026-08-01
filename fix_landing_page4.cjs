const fs = require('fs');
const file = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 11. A Vision For The Future
content = content.replace(
  'className="py-24 md:py-40 px-6 bg-[#0F2040] text-center relative overflow-hidden"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#0F2040] text-center relative overflow-hidden"'
);
content = content.replace(
  'className="text-[20px] md:text-[22px] font-black text-white/50 mb-12 md:mb-20 uppercase tracking-[3px]"',
  'className="text-[16px] sm:text-[18px] md:text-[22px] font-black text-white/50 mb-10 md:mb-16 uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 md:p-16 rounded-[2rem] md:rounded-[3rem] mb-12 md:mb-20 shadow-2xl"',
  'className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 sm:p-10 md:p-16 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] mb-10 md:mb-16 shadow-2xl mx-2 sm:mx-0"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-[#FB923C] drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]"',
  'className="text-[20px] sm:text-[26px] md:text-[30px] lg:text-[36px] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#F97316] to-[#FB923C] drop-shadow-[0_0_30px_rgba(249,115,22,0.3)]"'
);

// 12. This Is Your Invitation
content = content.replace(
  'className="py-20 md:py-32 px-6 bg-white text-center"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-white text-center"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] mb-16 md:mb-24 uppercase tracking-tight"',
  'className="text-[22px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] mb-12 md:mb-16 uppercase tracking-tight"'
);
content = content.replace(
  'className="w-24 h-24 md:w-32 md:h-32 bg-[#FDF8F0] rounded-full',
  'className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-[#FDF8F0] rounded-full'
);
content = content.replace(
  'className="font-extrabold text-[#0F2040] text-[12px] md:text-[14px] whitespace-pre-line uppercase tracking-[3px]"',
  'className="font-extrabold text-[#0F2040] text-[10px] sm:text-[11px] md:text-[12px] whitespace-pre-line uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="text-[12px] md:text-[14px] font-extrabold text-[#6B7280] uppercase tracking-[3px] px-4"',
  'className="text-[11px] sm:text-[12px] md:text-[14px] font-extrabold text-[#6B7280] uppercase tracking-[2px] md:tracking-[3px] px-4"'
);

// 13. Call To Action
content = content.replace(
  'className="py-24 md:py-32 px-6 bg-gradient-to-br from-[#0F2040] to-[#1a365d] text-center text-white relative overflow-hidden"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-gradient-to-br from-[#0F2040] to-[#1a365d] text-center text-white relative overflow-hidden"'
);
content = content.replace(
  'className="text-[12px] md:text-[14px] font-extrabold text-[#F97316] uppercase tracking-[3px] mb-6 md:mb-8"',
  'className="text-[10px] sm:text-[11px] md:text-[12px] font-extrabold text-[#F97316] uppercase tracking-[2px] md:tracking-[3px] mb-4 md:mb-6"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black mb-6 md:mb-8 leading-tight"',
  'className="text-[22px] sm:text-[26px] md:text-[32px] font-black mb-4 md:mb-6 leading-tight"'
);
content = content.replace(
  'className="text-[14px] md:text-[16px] lg:text-[18px] text-white/80 mb-12 md:mb-16 font-medium leading-relaxed"',
  'className="text-[14px] sm:text-[15px] md:text-[16px] text-white/80 mb-10 md:mb-12 font-medium leading-relaxed"'
);
// CTA Buttons
content = content.replace(
  'className="w-full sm:w-auto px-10 py-5 bg-white text-[#0F2040] rounded-full font-extrabold uppercase tracking-[3px] text-[13px] transition-all"',
  'className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-white text-[#0F2040] rounded-full font-extrabold uppercase tracking-[2px] md:tracking-[3px] text-[11px] sm:text-[12px] md:text-[13px] transition-all"'
);
content = content.replace(
  'className="w-full sm:w-auto px-10 py-5 bg-transparent border-2 border-white/50 text-white rounded-full font-extrabold uppercase tracking-[3px] text-[13px] transition-all"',
  'className="w-full sm:w-auto px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-transparent border-2 border-white/50 text-white rounded-full font-extrabold uppercase tracking-[2px] md:tracking-[3px] text-[11px] sm:text-[12px] md:text-[13px] transition-all"'
);

// 14. Sign-Up Section
content = content.replace(
  'id="guest-form" className="py-20 md:py-32 px-6 bg-[#FDF8F0] relative"',
  'id="guest-form" className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#FDF8F0] relative"'
);

fs.writeFileSync(file, content);
console.log("Applied Phase 4 fixes");
