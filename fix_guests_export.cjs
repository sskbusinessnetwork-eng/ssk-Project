const fs = require('fs');
let code = fs.readFileSync('src/pages/Guests.tsx', 'utf8');

code = code.replace(
  "export default function Guests() {",
  "export function Guests() {"
);

fs.writeFileSync('src/pages/Guests.tsx', code);
