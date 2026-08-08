const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regexToReplace = /<div className="flex flex-col gap-3 sm:gap-4 w-full">/;
content = content.replace(regexToReplace, '<>\n            <div className="flex flex-col gap-3 sm:gap-4 w-full">');

// We need to find the end of pagination and add </>.
// It goes:
//                   </button>
//                 </div>
//               </div>
//             )}
//           ) : (
const endRegex = /<\/div>\s*<\/div>\s*\)\}\s*\)\s*:\s*\(/;
const match = content.match(/(\s*)\)\}\s*\)\s*:\s*\(/);
if(match) {
  content = content.replace(/(\s*)\)\}\s*\)\s*:\s*\(/, '\n            </>$1)} ) : (');
  fs.writeFileSync('src/pages/Meetings.tsx', content);
  console.log("Fixed!");
} else {
  console.log("Not found.");
}
