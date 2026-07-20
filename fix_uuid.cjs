const fs = require('fs');

const file = 'src/components/CreateChapter.tsx';
let content = fs.readFileSync(file, 'utf8');

const generateIdCode = `const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
`;

if (!content.includes('const generateId')) {
   content = content.replace(/export function CreateChapter/, generateIdCode + '\nexport function CreateChapter');
}

content = content.replace(/crypto\.randomUUID\(\)/g, "generateId()");

fs.writeFileSync(file, content);
