const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexContainer = /<div className="bg-\[#111827\] rounded-\[18px\] border border-white\/5 overflow-hidden shadow-sm flex flex-col">\s*<div className="flex flex-col gap-3 sm:gap-4 w-full">/;

if (content.match(regexContainer)) {
  content = content.replace(regexContainer, '<div className="flex flex-col gap-3 sm:gap-4 w-full">');
  // I need to remove one closing </div> right before {/* Pagination */}
  // The structure is: 
  //   })}
  // </div>
  // </div> // THIS ONE
  // {/* Pagination */}
  
  content = content.replace(/<\/div>\s*<\/div>\s*\{\/\* Pagination \*\/\}/, '</div>\n\n              {/* Pagination */}');
  
  fs.writeFileSync('src/pages/Meetings.tsx', content);
  console.log("Replaced wrapper");
} else {
  console.log("No match");
}
