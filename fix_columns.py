import re

with open('src/pages/ManageSubscriptions.tsx', 'r') as f:
    content = f.read()

# Make sure we have a "Days Remaining" column header
content = content.replace(
    '<th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">End Date</th>',
    '<th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">End Date</th>\n              <th className="px-4 py-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider">Days Remaining</th>'
)

# And in the table body, inject Days Remaining
content = content.replace(
    '<td className="px-4 py-3 text-sm text-neutral-300 whitespace-nowrap">\n                      {subEndStr ? format(new Date(subEndStr), \'MMM d, yyyy\') : \'N/A\'}\n                    </td>',
    '<td className="px-4 py-3 text-sm text-neutral-300 whitespace-nowrap">\n                      {subEndStr ? format(new Date(subEndStr), \'MMM d, yyyy\') : \'N/A\'}\n                    </td>\n                    <td className="px-4 py-3 text-sm font-medium">\n                      <span className={daysLeft < 0 ? "text-red-400" : daysLeft <= 30 ? "text-amber-400" : "text-emerald-400"}>\n                        {subEndStr ? (daysLeft < 0 ? "Expired" : `${daysLeft} days`) : \'N/A\'}\n                      </span>\n                    </td>'
)

with open('src/pages/ManageSubscriptions.tsx', 'w') as f:
    f.write(content)

