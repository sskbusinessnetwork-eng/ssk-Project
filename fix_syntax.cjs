const fs = require('fs');
let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');
code = code.replace(
  `        )}
        <WriteTestimonialModal`,
  `        {testimonialReceiver && (
        <WriteTestimonialModal`
);

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('SUCCESS');
