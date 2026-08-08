const fs = require('fs');
let code = fs.readFileSync('src/pages/MyReport.tsx', 'utf-8');

const target1 = "const thankYouSlipsSentCount = businessSentCount;";
const target2 = "const thankYouSlipsReceivedCount = businessReceivedCount;";

if (code.includes(target1)) {
  code = code.replace(target1, "const thankYouSlipsSentCount = businessReceivedCount;");
  code = code.replace(target2, "const thankYouSlipsReceivedCount = businessSentCount;");
  fs.writeFileSync('src/pages/MyReport.tsx', code);
  console.log('SUCCESS');
} else {
  console.log('TARGET NOT FOUND');
}
