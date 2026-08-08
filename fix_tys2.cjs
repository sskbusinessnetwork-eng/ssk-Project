const fs = require('fs');

let code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf-8');

const s1 = `return String(senderId) === String(currentUserId) ? acc + (Number(slip.businessValue || slip.business_value) || 0) : acc;`;
const r1 = `const val = ref && (ref as any).business_amount ? Number((ref as any).business_amount) : Number(slip.businessValue || slip.business_value) || 0;
        return String(senderId) === String(currentUserId) ? acc + val : acc;`;

const s2 = `return String(receiverId) === String(currentUserId) ? acc + (Number(slip.businessValue || slip.business_value) || 0) : acc;`;
const r2 = `const val = ref && (ref as any).business_amount ? Number((ref as any).business_amount) : Number(slip.businessValue || slip.business_value) || 0;
        return String(receiverId) === String(currentUserId) ? acc + val : acc;`;

code = code.replace(s1, r1);
code = code.replace(s2, r2);

fs.writeFileSync('src/pages/ThankYouSlips.tsx', code);
console.log('ThankYouSlips updated');
