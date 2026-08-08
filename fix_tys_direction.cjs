const fs = require('fs');
let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

code = code.replace(
  `  const totalBusinessSent = isMasterAdmin 
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : slips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0);`,
  `  const totalBusinessSent = isMasterAdmin 
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : receivedSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0);`
);

code = code.replace(
  `  const totalBusinessReceived = isMasterAdmin
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : receivedSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0);`,
  `  const totalBusinessReceived = isMasterAdmin
    ? filteredSlips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0)
    : slips.reduce((acc, slip) => acc + (Number(slip.businessValue) || 0), 0);`
);

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('SUCCESS');
