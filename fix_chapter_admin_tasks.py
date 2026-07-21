import re

with open('src/components/ChapterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

# Make the task div flexible in height
content = content.replace('h-[84px] min-h-[84px] overflow-hidden', 'min-h-[84px] py-4')

# Add custom details rendering below the label
details_jsx = """
                  <div className="flex flex-col">
                    <span className={`text-[13px] sm:text-[14px] font-bold truncate tracking-wide transition-colors ${task.isDone ? 'text-neutral-400 line-through' : 'text-white group-hover:text-red-400'}`}>
                      {task.label}
                    </span>
                    {task.details && (
                      <div className="mt-1.5 space-y-0.5 text-[11px] text-neutral-400">
                        {task.details.phone && <div>Phone: {task.details.phone}</div>}
                        {task.details.position && <div>Position: {task.details.position}</div>}
                        {task.details.chapterName && <div>Chapter: {task.details.chapterName}</div>}
                        {task.details.endDate && <div>Current End Date: {task.details.endDate}</div>}
                        {task.details.requestDate && <div>Request Date: {task.details.requestDate}</div>}
                        {task.details.status && <div>Status: {task.details.status}</div>}
                      </div>
                    )}
                  </div>
"""

content = re.sub(
    r'<span className=\{`text-\[13px\] sm:text-\[14px\] font-bold truncate tracking-wide transition-colors \$\{task\.isDone \? \'text-neutral-400 line-through\' : \'text-white group-hover:text-red-400\'\}`\}>\s*\{task\.label\}\s*</span>',
    details_jsx,
    content,
    flags=re.DOTALL
)

# Render buttons for actions
buttons_jsx = """
              {task.customActions ? (
                <div className="shrink-0 flex items-center gap-2">
                  {task.customActions.map((act: any, i: number) => (
                    <button
                      key={i}
                      onClick={act.onClick}
                      className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border ${act.className}`}
                    >
                      {act.label}
                    </button>
                  ))}
                </div>
              ) : (
                <Link
                  to={task.link}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-[10px] text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all border ${
"""

content = re.sub(
    r'<Link\s+to=\{task\.link\}\s+className=\{`shrink-0 flex items-center gap-1\.5 px-3 py-1\.5 sm:px-4 sm:py-2 rounded-\[10px\] text-\[10px\] sm:text-\[11px\] font-black uppercase tracking-wider transition-all border \$\{',
    buttons_jsx,
    content,
    flags=re.DOTALL
)

# And add the closing brace for the conditional Link
content = re.sub(
    r'\{task\.linkText\}\s+</Link>',
    '{task.linkText}\n                </Link>\n              )}',
    content,
    flags=re.DOTALL
)


with open('src/components/ChapterAdminCompanionView.tsx', 'w') as f:
    f.write(content)
