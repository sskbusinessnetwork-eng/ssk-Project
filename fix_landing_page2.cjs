const fs = require('fs');
const file = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 7. Introducing SSK Business Network
content = content.replace(
  'className="py-24 md:py-40 px-6 bg-[#0F2040] text-center relative overflow-hidden"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#0F2040] text-center relative overflow-hidden"'
);
content = content.replace(
  'className="text-[20px] md:text-[22px] font-black text-white/50 mb-12 md:mb-16 uppercase tracking-[3px]"',
  'className="text-[16px] md:text-[18px] lg:text-[22px] font-black text-white/50 mb-10 md:mb-16 uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="w-48 h-48 md:w-64 md:h-64 mx-auto bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center mb-12 md:mb-16 border border-white/10 relative"',
  'className="w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 mx-auto bg-white/5 backdrop-blur-xl rounded-full flex items-center justify-center mb-10 md:mb-16 border border-white/10 relative"'
);

// 8. How This Movement Works
content = content.replace(
  'className="py-20 md:py-32 px-6 bg-[#FDF8F0] relative overflow-hidden"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#FDF8F0] relative overflow-hidden"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] mb-6 uppercase tracking-tight"',
  'className="text-[22px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] mb-6 uppercase tracking-tight"'
);
content = content.replace(
  'className="text-lg md:text-2xl font-extrabold text-[#F97316] bg-white inline-block px-6 md:px-6 py-3 rounded-full shadow-sm border border-[#F3F4F6] uppercase tracking-[3px]"',
  'className="text-[14px] sm:text-[16px] md:text-[20px] lg:text-[24px] font-extrabold text-[#F97316] bg-white inline-block px-4 sm:px-6 py-2 sm:py-3 rounded-full shadow-sm border border-[#F3F4F6] uppercase tracking-[2px] md:tracking-[3px] text-center"'
);
content = content.replace(
  'className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[1.5rem] md:rounded-[2rem]',
  'className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-[1.25rem] sm:rounded-[1.5rem] md:rounded-[2rem]'
);
content = content.replace(
  'className="font-extrabold text-[#0F2040] text-lg md:text-xl uppercase tracking-[3px]"',
  'className="font-extrabold text-[#0F2040] text-[12px] sm:text-[14px] md:text-[16px] lg:text-[18px] uppercase tracking-[2px] md:tracking-[3px] text-center"'
);

fs.writeFileSync(file, content);
console.log("Applied Phase 2 fixes");
