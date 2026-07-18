const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < 20; i++) {
  console.log(lines[i]);
}
