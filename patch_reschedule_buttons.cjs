const fs = require('fs');
const file = 'src/pages/OneToOneMeetings.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-4">`,
`          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">`
);

fs.writeFileSync(file, code);
