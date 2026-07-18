const fs = require('fs');

let content = fs.readFileSync('src/lib/database.ts', 'utf8');

content = content.replace(/export const doc = \(db: any, path: string, id: string\) => \(\{ type: 'doc', path, id \}\);/, `
export const doc = (dbOrCollection: any, pathOrId?: string, optionalId?: string) => {
  if (dbOrCollection?.type === 'collection') {
    const collPath = dbOrCollection.path;
    const docId = pathOrId || Math.random().toString(36).substring(2, 15);
    return { type: 'doc', path: collPath, id: docId };
  }
  return { type: 'doc', path: pathOrId, id: optionalId };
};
`);

content = content.replace(/export function writeBatch\(\) \{/, 'export function writeBatch(db?: any) {');

fs.writeFileSync('src/lib/database.ts', content);
console.log('database.ts patched.');
