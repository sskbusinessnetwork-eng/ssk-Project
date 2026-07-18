const fs = require('fs');

let content = fs.readFileSync('src/lib/supabaseClient.ts', 'utf8');

// Remove SEED_USERS definition
content = content.replace(/export const SEED_USERS = \[[\s\S]*?\];\n?/g, '');

// Remove SEED_CATEGORIES definition
content = content.replace(/export const SEED_CATEGORIES = \[[\s\S]*?\];\n?/g, '');

// Remove injection in getLocalDoc
content = content.replace(/const seedUser = SEED_USERS\.find[\s\S]*?return \{ id: seedUser\.uid, \.\.\.seedUser \};\n\s*\}/g, '');
content = content.replace(/const seedCat = SEED_CATEGORIES\.find[\s\S]*?return \{ id: seedCat\.id, \.\.\.seedCat \};\n\s*\}/g, '');

// Remove injection in initializeLocalStorage
content = content.replace(/\/\/ Seed admin users[\s\S]*?\}\);/g, '');
content = content.replace(/\/\/ Seed categories[\s\S]*?\}\);/g, '');

// Remove injection in getDocs
content = content.replace(/\/\/ Inject Seed data[\s\S]*?\}\);/g, '');
content = content.replace(/\} else if \(collectionPath === 'categories'[\s\S]*?\}\);/g, '');

// Also remove mock delay
content = content.replace(/await new Promise\(resolve => setTimeout\(resolve, 800\)\);/g, '');

fs.writeFileSync('src/lib/supabaseClient.ts', content);
console.log('Seeds removed.');
