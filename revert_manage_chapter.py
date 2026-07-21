import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "<Route path=\"/manage-chapter\" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN', 'CHAPTER_ADMIN']}><ManageChapter /></ProtectedRoute>} />",
    "<Route path=\"/manage-chapter\" element={<ProtectedRoute allowedRoles={['MASTER_ADMIN']}><ManageChapter /></ProtectedRoute>} />"
)

with open('src/App.tsx', 'w') as f:
    f.write(content)

with open('src/components/Sidebar.tsx', 'r') as f:
    sidebar_content = f.read()

sidebar_content = sidebar_content.replace(
    "{ icon: Crown, label: 'Manage Chapter', path: '/manage-chapter', roles: ['MASTER_ADMIN', 'CHAPTER_ADMIN'] },",
    "{ icon: Crown, label: 'Manage Chapter', path: '/manage-chapter', roles: ['MASTER_ADMIN'] },"
)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(sidebar_content)
