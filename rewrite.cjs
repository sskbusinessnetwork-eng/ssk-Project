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
  
  // Replace firebase/firestore imports
  if (content.includes('firebase/firestore') || content.includes('firestoreService')) {
    content = content.replace(/import \{([^}]+)\} from ['"]firebase\/firestore['"];?/g, "import { $1 } from '../lib/database';");
    content = content.replace(/firestoreService/g, 'databaseService');
    content = content.replace(/import \{ databaseService \} from ['"]\.\.\/services\/firestoreService['"];?/g, "import { databaseService } from '../services/databaseService';");
    
    // Fix relative paths for the database lib
    const depth = file.split('/').length - 2;
    const relPath = depth === 0 ? './' : '../'.repeat(depth);
    content = content.replace(/from '\.\.\/lib\/database'/g, `from '${relPath}lib/database'`);
    content = content.replace(/from '\.\.\/services\/databaseService'/g, `from '${relPath}services/databaseService'`);
    
    fs.writeFileSync(file, content);
  }
});
console.log('Rewritten imports.');
