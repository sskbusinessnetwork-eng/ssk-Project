const fs = require('fs');
let content = fs.readFileSync('src/pages/Meetings.tsx', 'utf-8');

const regex1 = /<div className="flex flex-col gap-3 sm:gap-4 w-full">/;
content = content.replace(regex1, '<div className="w-full space-y-4">\n              <div className="flex flex-col gap-3 sm:gap-4 w-full">');

// Then we don't need to add a closing tag, because there is already an extra </div> after pagination!
// Let's verify.
fs.writeFileSync('src/pages/Meetings.tsx', content);
console.log("Wrapper added!");
