const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');
code = code.replace(
  'setError(resData?.message || resData?.error || "Failed to update meeting.");',
  'setError(`API Error: ${JSON.stringify(resData)}`);'
);
code = code.replace(
  'setError(apiErr.message || "Failed to update meeting.");',
  'setError(`Fetch Exception: ${apiErr.message}`);'
);
fs.writeFileSync('src/pages/Meetings.tsx', code);
