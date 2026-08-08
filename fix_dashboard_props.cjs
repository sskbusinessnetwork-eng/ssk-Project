const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf-8');

code = code.replace(
  'thankYouSlipsSentCount={businessSentCount}',
  'thankYouSlipsSentCount={businessReceivedCount}'
);

code = code.replace(
  'thankYouSlipsReceivedCount={businessReceivedCount}',
  'thankYouSlipsReceivedCount={businessSentCount}'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
console.log('SUCCESS');
