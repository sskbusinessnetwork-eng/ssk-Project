const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(/<Route path="\/reports" element=\{<ProtectedRoute allowedRoles=\{\['MASTER_ADMIN', 'CHAPTER_ADMIN'\]\}><Reports \/><\/ProtectedRoute>\} \/>/, 
  '<Route path="/reports" element={<ProtectedRoute allowedRoles={[\'MASTER_ADMIN\', \'CHAPTER_ADMIN\', \'MEMBER\']}><Reports /></ProtectedRoute>} />');
fs.writeFileSync('src/App.tsx', code);
