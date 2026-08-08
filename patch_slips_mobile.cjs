const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regex1 = /className="sm:hidden flex items-center justify-between p-3\.5 cursor-pointer"/;
content = content.replace(regex1, 'className="sm:hidden flex items-center justify-between py-3 px-2 cursor-pointer"');

const regex2 = /<div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-8">/;
content = content.replace(regex2, '<div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-6 py-2 sm:py-6 md:py-8 space-y-3 sm:space-y-8 overflow-x-hidden">');

// ensure space-y-4 sm:space-y-6 on Slips List is replaced
const regex3 = /<!-- Slips List -->\s*<div className="space-y-4 sm:space-y-6">/;
// Wait, it might be `{/* Slips List */}`
const regex3b = /\{\/\* Slips List \*\/\}\s*<div className="space-y-4 sm:space-y-6">/;
content = content.replace(regex3b, '{/* Slips List */}\n      <div className="space-y-2 sm:space-y-6 w-full">');

// replace flex flex-col sm:grid sm:grid-cols-1 ...
const regex4 = /<div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 gap-0 sm:gap-6 divide-y divide-white\/5 sm:divide-y-0">/;
content = content.replace(regex4, '<div className="flex flex-col sm:grid sm:grid-cols-1 md:grid-cols-2 gap-0 sm:gap-6 divide-y divide-white/10 sm:divide-y-0 w-full">');

fs.writeFileSync('src/pages/ThankYouSlips.tsx', content);

