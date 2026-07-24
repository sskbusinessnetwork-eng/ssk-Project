const fs = require('fs');
let text = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
text = text.replace(
  /if \(userDoc\.exists\(\)\) {[\s\S]*?localStorage\.setItem\('user', JSON\.stringify\({[\s\S]*?uid,[\s\S]*?phone: userData\.phone,[\s\S]*?profile: updatedProfile[\s\S]*?}\)\);[\s\S]*?}/g,
  (match) => match + " else { localStorage.removeItem('user'); setUser(null); setProfile(null); }"
);
fs.writeFileSync('src/contexts/AuthContext.tsx', text);
