const fs = require('fs');
const file = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 9. Fix icons with invalid props
content = content.replace(/<Users size=\{80\} md:size=\{100\} className="text-\[\#0F2040\]" \/>/g, '<Users className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 text-[#0F2040]" />');
content = content.replace(/className="w-10 h-10 md:w-12 md:h-12 rounded-full/g, 'className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full');

content = content.replace(
  'className="w-48 h-48 md:w-64 md:h-64 bg-white rounded-full',
  'className="w-40 h-40 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-white rounded-full'
);
content = content.replace(
  'className="font-extrabold text-[#0F2040] text-xl md:text-2xl mt-8 text-center uppercase tracking-[3px] relative z-10"',
  'className="font-extrabold text-[#0F2040] text-[16px] sm:text-[18px] md:text-[22px] mt-6 md:mt-8 text-center uppercase tracking-[2px] md:tracking-[3px] relative z-10"'
);
content = content.replace(
  'className="flex items-center gap-4 md:gap-6 text-xl md:text-3xl font-extrabold text-[#0F2040] uppercase tracking-[3px]"',
  'className="flex items-center gap-3 md:gap-4 lg:gap-6 text-[16px] sm:text-[20px] md:text-[24px] lg:text-[28px] font-extrabold text-[#0F2040] uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-white mt-16 md:mt-24 bg-[#0F2040] inline-block px-6 md:px-12 py-4 md:py-6 rounded-[16px] md:rounded-full shadow-2xl shadow-[#0F2040]/20"',
  'className="text-[18px] sm:text-[22px] md:text-[28px] lg:text-[32px] font-black text-white mt-12 md:mt-16 lg:mt-24 bg-[#0F2040] inline-block px-6 sm:px-8 md:px-12 py-4 md:py-6 rounded-[16px] md:rounded-full shadow-2xl shadow-[#0F2040]/20 max-w-4xl"'
);

// 10. More Than Networking
content = content.replace(
  'className="py-20 md:py-32 px-6 bg-white text-center relative"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-white text-center relative"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] mb-6 uppercase tracking-tight"',
  'className="text-[22px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] mb-4 md:mb-6 uppercase tracking-tight"'
);
content = content.replace(
  'className="text-lg md:text-2xl font-extrabold text-[#6B7280] mb-16 md:mb-20 uppercase tracking-[3px]"',
  'className="text-[14px] sm:text-[16px] md:text-[20px] lg:text-[24px] font-extrabold text-[#6B7280] mb-12 md:mb-20 uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem]',
  'className="bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem]'
);
content = content.replace(
  'className="w-20 h-20 md:w-24 md:h-24 bg-[#FDF8F0] rounded-[1.5rem] md:rounded-[2rem]',
  'className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-[#FDF8F0] rounded-[1.25rem] sm:rounded-[1.5rem] md:rounded-[2rem]'
);
content = content.replace(
  'className="font-extrabold text-[#0F2040] text-base md:text-lg whitespace-pre-line uppercase tracking-[3px] relative z-10"',
  'className="font-extrabold text-[#0F2040] text-[12px] sm:text-[14px] md:text-[16px] lg:text-[18px] whitespace-pre-line uppercase tracking-[2px] md:tracking-[3px] relative z-10"'
);

fs.writeFileSync(file, content);
console.log("Applied Phase 3 fixes");
