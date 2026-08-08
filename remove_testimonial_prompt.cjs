const fs = require('fs');
let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

// Remove the Testimonial Prompt Modal
const startModal = "{/* Testimonial Prompt Modal */}";
const endModal = "        <WriteTestimonialModal";

if (code.includes(startModal) && code.includes(endModal)) {
  const startIdx = code.indexOf(startModal);
  const endIdx = code.indexOf(endModal);
  
  code = code.substring(0, startIdx) + code.substring(endIdx);
}

// Remove setShowTestimonialPrompt(true)
code = code.replace(
  `        if (receiver) {
          setShowTestimonialPrompt(true);
        }`,
  `        // Removed testimonial prompt for receiver`
);

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('SUCCESS ThankYouSlips');
