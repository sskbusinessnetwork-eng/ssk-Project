const fs = require('fs');
const file = 'src/pages/LandingPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Hero Section height and image
content = content.replace(
  'className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#0F2040]"',
  'className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0F2040]"'
);
content = content.replace(
  '<motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute inset-0 z-0">',
  '<motion.div style={{ y: heroY, opacity: heroOpacity }} className="absolute -inset-x-0 -top-[20%] h-[140%] z-0">'
);

// 2. Hero typography
content = content.replace(
  'className="text-[28px] sm:text-[34px] md:text-[42px] lg:text-[52px] font-black tracking-tight text-white mb-6 leading-[1.1]"',
  'className="text-[24px] sm:text-[32px] md:text-[40px] lg:text-[48px] font-black tracking-tight text-white mb-6 leading-[1.2] px-2"'
);
content = content.replace(
  'className="text-[14px] md:text-[16px] lg:text-[18px] text-white/90 mb-4 font-medium max-w-3xl mx-auto leading-relaxed"',
  'className="text-[14px] sm:text-[15px] md:text-[16px] text-white/90 mb-4 font-medium max-w-2xl mx-auto leading-relaxed px-4"'
);
content = content.replace(
  'className="text-xl sm:text-2xl font-black text-white mb-12 tracking-tight"',
  'className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] font-black text-white mb-8 md:mb-12 tracking-tight"'
);

// Hero button
content = content.replace(
  'className="px-6 md:px-10 py-4 md:py-5 bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white rounded-full font-extrabold uppercase tracking-[3px] text-[13px] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] shadow-[#F97316]/20"',
  'className="px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 bg-gradient-to-r from-[#F97316] to-[#FB923C] text-white rounded-full font-extrabold uppercase tracking-[2px] md:tracking-[3px] text-[11px] sm:text-[12px] md:text-[13px] transition-all shadow-[0_4px_20px_rgba(0,0,0,0.03)] shadow-[#F97316]/20 w-full sm:w-auto"'
);

// 3. Fix sizes of icons globally by removing `md:size={...}` and similar invalid props.
// Instead of replacing every single size={}, we can replace md:size={xx} and just use responsive classes.
// Actually, let's fix all lucide-react sizes
content = content.replace(/size=\{32\} md:size=\{40\}/g, 'className="w-8 h-8 md:w-10 md:h-10"');
content = content.replace(/size=\{24\} md:size=\{32\}/g, 'className="w-6 h-6 md:w-8 md:h-8"');
content = content.replace(/size=\{36\} md:size=\{48\}/g, 'className="w-9 h-9 md:w-12 md:h-12"');
content = content.replace(/size=\{14\} md:size=\{18\}/g, 'className="w-3.5 h-3.5 md:w-4.5 md:h-4.5"'); // w-4.5 doesn't exist, use w-4 md:w-5
content = content.replace(/<X size=\{14\} md:size=\{18\} className="text-red-500" \/>/g, '<X className="w-4 h-4 md:w-5 md:h-5 text-red-500" />');
content = content.replace(/<CheckCircle2 size=\{14\} md:size=\{18\} className="text-green-500" \/>/g, '<CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-green-500" />');
content = content.replace(/size=\{48\} md:size=\{64\}/g, 'className="w-12 h-12 md:w-16 md:h-16"');

// 4. Section: The Story Begins
content = content.replace(
  'className="py-20 md:py-32 px-6 bg-[#FDF8F0] text-center relative"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#FDF8F0] text-center relative overflow-hidden"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] mb-12 md:mb-20 uppercase tracking-tight"',
  'className="text-[22px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] mb-10 md:mb-16 uppercase tracking-tight px-4"'
);
content = content.replace(
  'className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[24px]',
  'className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white rounded-[20px] md:rounded-[24px]'
);
content = content.replace(
  'className="text-[12px] md:text-[14px] font-extrabold text-[#0F2040] whitespace-pre-line uppercase tracking-[3px]"',
  'className="text-[10px] sm:text-[11px] md:text-[12px] font-extrabold text-[#0F2040] whitespace-pre-line uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] relative z-10 px-4"',
  'className="text-[18px] sm:text-[22px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] relative z-10 px-4 max-w-3xl mx-auto"'
);

// 5. Section: The Reality
content = content.replace(
  'className="py-20 md:py-32 px-6 bg-white relative overflow-hidden"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-white relative overflow-hidden"'
);
content = content.replace(
  'className="text-[24px] md:text-[30px] lg:text-[36px] font-black text-[#0F2040] mb-12 md:mb-20 uppercase tracking-tight text-center"',
  'className="text-[22px] md:text-[28px] lg:text-[32px] font-black text-[#0F2040] mb-10 md:mb-16 uppercase tracking-tight text-center px-4"'
);
content = content.replace(
  'className="text-[34px] md:text-[42px] lg:text-[52px] font-black text-[#0F2040] mb-4 tracking-tight"',
  'className="text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px] font-black text-[#0F2040] mb-2 md:mb-4 tracking-tight"'
);
content = content.replace(
  'className="text-[12px] md:text-[14px] font-extrabold text-[#6B7280] uppercase tracking-[3px]"',
  'className="text-[10px] sm:text-[11px] md:text-[12px] font-extrabold text-[#6B7280] uppercase tracking-[2px] md:tracking-[3px]"'
);
content = content.replace(
  'className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] md:rounded-[2.5rem]',
  'className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem]'
);

// 6. Section: A Simple Thought
content = content.replace(
  'className="py-20 md:py-32 px-6 bg-[#FDF8F0] text-center relative overflow-hidden"',
  'className="py-16 md:py-24 lg:py-32 px-4 sm:px-6 bg-[#FDF8F0] text-center relative overflow-hidden"'
);
content = content.replace(
  'className="w-24 h-24 md:w-32 md:h-32 bg-[#FDF8F0]',
  'className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-[#FDF8F0]'
);
content = content.replace(
  'className="text-[14px] md:text-[16px] lg:text-[18px] font-extrabold text-[#0F2040] whitespace-pre-line leading-relaxed"',
  'className="text-[12px] sm:text-[14px] md:text-[16px] font-extrabold text-[#0F2040] whitespace-pre-line leading-relaxed"'
);

fs.writeFileSync(file, content);
console.log("Applied Phase 1 fixes");
