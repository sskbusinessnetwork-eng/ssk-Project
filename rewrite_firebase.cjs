const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  if (content.match(/import .* from '.*?firebase'/)) {
    content = content.replace(/import \{.*db.*\} from '.*firebase';\n?/g, "import { db } from '../lib/database';\n");
    content = content.replace(/import \{.*checkDatabaseConnection.*\} from '.*firebase';\n?/g, "");
    content = content.replace(/import \{.*auth, db.*\} from '.*lib\/firebase';\n?/g, "import { db } from '../lib/database';\n");
    content = content.replace(/import \{.*handleFirestoreError.*\} from '.*utils\/firebaseUtils';\n?/g, "");
    changed = true;
  }
  
  // Also replace direct checkDatabaseConnection usage
  if (content.includes('checkDatabaseConnection()')) {
     content = content.replace(/checkDatabaseConnection\(\)/g, "Promise.resolve(true)");
     changed = true;
  }
  
  // remove auth references where it was imported from firebase
  if (content.match(/import \{.*auth.*\} from '.*firebase'/)) {
     content = content.replace(/import \{.*auth.*\} from '.*firebase';\n?/g, "");
     changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
console.log('Firebase imports rewritten.');
