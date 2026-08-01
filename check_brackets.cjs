const fs = require('fs');
const code = fs.readFileSync('src/pages/ThankYouSlips.tsx', 'utf8');

let stack = [];
for (let i = 0; i < code.length; i++) {
  const c = code[i];
  if (c === '{') stack.push({char: c, line: code.slice(0, i).split('\n').length});
  if (c === '}') {
    if (stack.length === 0 || stack[stack.length - 1].char !== '{') console.log('unmatched } at line ' + code.slice(0, i).split('\n').length);
    else stack.pop();
  }
}
console.log('Unmatched {', stack.map(s => s.line));
