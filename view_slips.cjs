const fs = require('fs');
let content = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');
const regex = /<motion\.div[\s\S]*?<\/motion\.div>/g;
const matches = content.match(regex);
if (matches && matches.length >= 2) {
   console.log(matches[1].substring(0, 2000));
} else {
   console.log("Not found");
}
