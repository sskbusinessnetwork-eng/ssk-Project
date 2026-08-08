const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const regexSent = /const totalBusinessSent = isMasterAdmin[\s\S]*?slips\.reduce\(\(acc, slip\) => \{[\s\S]*?return acc \+ val;\n      \}, 0\);/m;
const regexReceived = /const totalBusinessReceived = isMasterAdmin[\s\S]*?receivedSlips\.reduce\(\(acc, slip\) => \{[\s\S]*?return acc \+ val;\n      \}, 0\);/m;

let sentMatch = content.match(regexSent);
let receivedMatch = content.match(regexReceived);

if (sentMatch && receivedMatch) {
  content = content.replace(regexSent, sentMatch[0].replace('slips.reduce', 'receivedSlips.reduce'));
  content = content.replace(regexReceived, receivedMatch[0].replace('receivedSlips.reduce', 'slips.reduce'));
  fs.writeFileSync('src/pages/ThankYouSlips.tsx', content);
  console.log("Replaced successfully!");
} else {
  console.log("Could not match.");
}
