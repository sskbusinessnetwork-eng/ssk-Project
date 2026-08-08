const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regexContainer = /<div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">/;
content = content.replace(regexContainer, '<div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 gap-0 sm:gap-6 divide-y divide-white/5 sm:divide-y-0">');

const regexMotion = /<motion\.div\n\s+layout\n\s+initial=\{\{ opacity: 0, y: 10 \}\}\n\s+animate=\{\{ opacity: 1, y: 0 \}\}\n\s+key=\{slip\.id\}\n\s+className="group bg-\[#111827\] rounded-xl sm:rounded-\[16px\] border border-white\/5 shadow-sm hover:border-white\/10 transition-all duration-300"\n\s+>/;

const newMotion = `<motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={slip.id}
                  className="group bg-transparent sm:bg-[#111827] rounded-none sm:rounded-[16px] border-none sm:border sm:border-white/5 shadow-none sm:shadow-sm sm:hover:border-white/10 transition-all duration-300"
                >`;

if (content.match(regexMotion)) {
  content = content.replace(regexMotion, newMotion);
  console.log("Replaced motion.div successfully");
} else {
  console.log("Could not find regexMotion");
}

fs.writeFileSync('src/pages/ThankYouSlips.tsx', content);

