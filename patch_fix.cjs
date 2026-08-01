const fs = require('fs');
const file = 'src/pages/OneToOneMeetings.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`          {/* Meeting Location */}
          <div className="space-y-2">`,
`          </div>
          {/* Meeting Location */}
          <div className="space-y-2">`
);

fs.writeFileSync(file, code);
