const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target = `  if (input.activeDateRange) {
    startStr = getISTDateString(input.activeDateRange.start);
    endStr = getISTDateString(input.activeDateRange.end);
  } else if (subStartStr) {
    startStr = getISTDateString(subStartStr);
  }`;

const rep = `  if (input.activeDateRange) {
    startStr = getISTDateString(input.activeDateRange.start);
    endStr = getISTDateString(input.activeDateRange.end);
  }`;

if (code.includes(target)) {
  code = code.replace(target, rep);
  fs.writeFileSync('src/utils/growthScore.ts', code);
  console.log('patched');
} else {
  console.log('target not found');
}
