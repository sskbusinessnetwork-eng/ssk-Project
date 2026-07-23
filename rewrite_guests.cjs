const fs = require('fs');
let code = fs.readFileSync('src/pages/Guests.tsx', 'utf8');

const modalRegex = /\{\/\* Invite Modal \*\/\}([\s\S]*?)<\/Modal>/;
if (code.match(modalRegex)) {
  console.log("Found invite modal");
} else {
  console.log("Did not find invite modal");
}
