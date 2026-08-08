const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

const regexGen = /Business Generated<\/span>\s*<div[^>]*>\s*₹\{businessSentTotal\.toLocaleString\(\)\}\s*<\/div>\s*<div[^>]*>\s*<span[^>]*>\s*\{businessSentSlips\.length\} slips submitted\s*<\/span>\s*<\/div>/m;
const regexRec = /Business Received<\/span>\s*<div[^>]*>\s*₹\{businessReceivedTotal\.toLocaleString\(\)\}\s*<\/div>\s*<div[^>]*>\s*<span[^>]*>\s*\{businessReceivedSlips\.length\} slips received\s*<\/span>\s*<\/div>/m;

const newGen = `Business Generated</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{businessSentTotal.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  {businessSentSlips.length} slips received
                </span>
              </div>`;

const newRec = `Business Received</span>
              <div className="text-[15px] sm:text-[22px] font-black text-white leading-none tracking-tight truncate w-full mt-0.5">
                ₹{businessReceivedTotal.toLocaleString()}
              </div>
              <div className="flex flex-col items-center justify-center gap-0.5 w-full mt-0.5">
                <span className="text-[7.5px] sm:text-[9px] font-bold text-[#9CA3AF] leading-none uppercase truncate w-full">
                  {businessReceivedSlips.length} slips submitted
                </span>
              </div>`;

let found = false;
if (regexGen.test(content)) {
  content = content.replace(regexGen, newGen);
  found = true;
} else {
  console.log('regexGen failed');
}

if (regexRec.test(content)) {
  content = content.replace(regexRec, newRec);
  found = true;
} else {
  console.log('regexRec failed');
}

if (found) {
  fs.writeFileSync('src/pages/Dashboard.tsx', content);
  console.log('Successfully swapped labels Dashboard!');
}
