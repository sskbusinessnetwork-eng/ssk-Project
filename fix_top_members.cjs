const fs = require('fs');
const file = 'src/components/TopPerformingMembersSection.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'className="py-20 md:py-28 bg-[#0B1220] text-white relative overflow-hidden border-y border-white/10"',
  'className="py-16 md:py-24 bg-[#0B1220] text-white relative overflow-hidden border-y border-white/10"'
);
content = content.replace(
  'className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight uppercase"',
  'className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase px-4"'
);
content = content.replace(
  'className="text-neutral-400 text-sm md:text-base font-medium max-w-xl mx-auto mt-3"',
  'className="text-neutral-400 text-xs sm:text-sm md:text-base font-medium max-w-xl mx-auto mt-3 px-4"'
);
content = content.replace(
  '<Trophy size={16} />',
  '<Trophy className="w-4 h-4 md:w-5 md:h-5" />'
);

fs.writeFileSync(file, content);
console.log("Fixed TopPerformingMembersSection styles");
