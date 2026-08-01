const fs = require('fs');
const file = 'src/pages/OneToOneMeetings.tsx';
let code = fs.readFileSync(file, 'utf8');

// Fix 1: Make date/time row responsive
code = code.replace(
  '<div className="grid grid-cols-2 gap-4">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">'
);

// Fix 2: Schedule Modal Time selects
code = code.replace(
  /className="w-full px-3 py-3 rounded-\[12px\] border border-white\/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-\[#151C2E\] text-white text-sm"/g,
  'className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"'
);

// Fix 3: Reschedule Modal Time selects
code = code.replace(
  /className="w-full px-3 py-3 rounded-\[12px\] border border-white\/5 outline-none focus:ring-2 focus:ring-primary font-bold bg-\[#151C2E\] text-white text-sm cursor-pointer"/g,
  'className="w-full px-2 sm:px-4 py-4 rounded-[16px] border border-white/5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-bold text-sm bg-[#151C2E] text-white cursor-pointer"'
);

fs.writeFileSync(file, code);
