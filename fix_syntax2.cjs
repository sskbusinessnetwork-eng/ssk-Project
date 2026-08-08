const fs = require('fs');
let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');
code = code.replace(
  `        />
      )}

      {/* Thank You Slip Details Modal */}`,
  `        />

      {/* Thank You Slip Details Modal */}`
);

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('SUCCESS');
