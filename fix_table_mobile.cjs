const fs = require('fs');

const content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

let newContent = content.replace(
  '<table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">',
  '<table className="w-full text-left border-collapse">'
);

// Reduce padding on mobile
newContent = newContent.replace(
  '<th className="px-4 py-3 font-bold whitespace-nowrap">Date & Time</th>',
  '<th className="px-2 sm:px-4 py-2 sm:py-3 font-bold whitespace-nowrap">Date & Time</th>'
).replace(
  '<th className="px-4 py-3 font-bold">Address</th>',
  '<th className="px-2 sm:px-4 py-2 sm:py-3 font-bold">Address</th>'
).replace(
  '<th className="px-4 py-3 font-bold whitespace-nowrap">Status</th>',
  '<th className="px-2 sm:px-4 py-2 sm:py-3 font-bold whitespace-nowrap">Status</th>'
).replace(
  '<th className="px-4 py-3 font-bold whitespace-nowrap">Actions</th>',
  '<th className="px-2 sm:px-4 py-2 sm:py-3 font-bold whitespace-nowrap text-right sm:text-left">Actions</th>'
);

newContent = newContent.replaceAll(
  '<td className="px-4 py-3 align-middle">',
  '<td className="px-2 sm:px-4 py-2 sm:py-3 align-middle">'
);

newContent = newContent.replace(
  'max-w-[200px] md:max-w-[250px]',
  'max-w-[120px] sm:max-w-[200px] md:max-w-[250px]'
);

newContent = newContent.replace(
  '<div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">',
  '<div className="flex flex-col sm:flex-row items-end sm:items-center gap-1.5 sm:gap-2">'
);

fs.writeFileSync('src/pages/Meetings.tsx', newContent, 'utf-8');
console.log("SUCCESS");
