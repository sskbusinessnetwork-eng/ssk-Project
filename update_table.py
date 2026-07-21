with open('src/pages/ManageSubscriptions.tsx', 'r') as f:
    content = f.read()

# Update Table Headers
content = content.replace('<th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Phone / Chapter</th>',
                          '<th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Phone Number</th>\n              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Chapter Name</th>')

content = content.replace('<th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Default Pwd</th>',
                          '<th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Default Pwd</th>\n              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Last Renewal</th>')

content = content.replace('colspan={8}', 'colSpan={10}')

# Update Table Rows
old_row = """                    <td className="px-4 py-3">
                      <div className="text-sm text-neutral-300">{user.phone}</div>
                      <div className="text-xs text-neutral-400">{chap?.chapter_name || 'N/A'}</div>
                    </td>"""

new_row = """                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {chap?.chapter_name || 'N/A'}
                    </td>"""

content = content.replace(old_row, new_row)

old_col = """                    <td className="px-4 py-3">
                      {user.must_change_password ? (
                        <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Not Changed</span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Changed</span>
                      )}
                    </td>"""

new_col = """                    <td className="px-4 py-3">
                      {user.must_change_password ? (
                        <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Not Changed</span>
                      ) : (
                        <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Changed</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-300">
                      {user.renewedAt || (user as any).renewed_at ? format(new Date(user.renewedAt || (user as any).renewed_at as string), 'MMM d, yyyy') : 'N/A'}
                    </td>"""

content = content.replace(old_col, new_col)

with open('src/pages/ManageSubscriptions.tsx', 'w') as f:
    f.write(content)
