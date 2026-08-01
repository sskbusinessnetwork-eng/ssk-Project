const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'h4 className="text-[15px] font-bold text-white truncate"',
  'h4 className="text-[15px] font-bold text-white break-words"'
);
code = code.replace(
  'span className="text-[12px] font-medium text-neutral-400 truncate"',
  'span className="text-[12px] font-medium text-neutral-400 break-words"'
);

fs.writeFileSync(file, code);
