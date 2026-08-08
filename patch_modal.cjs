const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regexModalContent = /<div className="p-5 bg-\[#151C2E\] rounded-\[20px\] border border-white\/10 space-y-3\.5 shadow-xl">([\s\S]*?)<\/div>\s*<div className="flex justify-end pt-1">/m;

const match = content.match(regexModalContent);
if (match) {
  let modalInner = match[1];
  
  // replace <span className="text-sm font-bold text-white"> with text-right text-balance or break-words
  modalInner = modalInner.replace(/<span className="text-sm font-bold text-white">/g, '<span className="text-sm font-bold text-white text-right max-w-[60%] break-words">');
  
  // same for formattedDate
  modalInner = modalInner.replace(/<span className="text-sm font-semibold text-white">/g, '<span className="text-sm font-semibold text-white text-right max-w-[60%] break-words">');
  
  // same for formattedAmount
  modalInner = modalInner.replace(/<span className="text-base font-extrabold text-emerald-400">/g, '<span className="text-base font-extrabold text-emerald-400 text-right max-w-[60%] truncate">');

  const newContent = `<div className="p-4 sm:p-5 bg-[#151C2E] rounded-[16px] sm:rounded-[20px] border border-white/10 space-y-3 shadow-xl w-full max-w-full overflow-hidden">` + modalInner + `</div>\n              <div className="flex justify-end pt-1">`;
  
  content = content.replace(regexModalContent, newContent);
  fs.writeFileSync('src/pages/ThankYouSlips.tsx', content);
  console.log("Replaced modal inner content");
} else {
  console.log("Could not find regexModalContent");
}

