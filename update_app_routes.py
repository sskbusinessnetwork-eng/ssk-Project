import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_statement = "import { ManageSubscriptions } from './pages/ManageSubscriptions';\n"
if 'ManageSubscriptions' not in content:
    content = content.replace("import { Reports } from './pages/Reports';", "import { Reports } from './pages/Reports';\n" + import_statement)
    route_statement = '              <Route path="/subscriptions" element={<ProtectedRoute allowedRoles={[\'MASTER_ADMIN\', \'CHAPTER_ADMIN\']}><ManageSubscriptions /></ProtectedRoute>} />\n'
    content = content.replace('              <Route path="/reports"', route_statement + '              <Route path="/reports"')

    with open('src/App.tsx', 'w') as f:
        f.write(content)
