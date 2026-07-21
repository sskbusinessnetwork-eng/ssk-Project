import re

with open('src/components/ChapterAdminCompanionView.tsx', 'r') as f:
    content = f.read()

# Fix the stray `)}`
content = content.replace('              )}\n              </motion.div>', '              </motion.div>')

# We need to replace the h4 Title with custom details
title_pattern = r'                <h4 className=\{cn\([\s\S]*?\}>(.*?)</h4>'

details_jsx = """                <div className={cn(
                  "flex flex-col min-w-0 flex-1 break-words pr-2",
                  task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                )}>
                  <h4 className="text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2">
                    {task.label}
                  </h4>
                  {task.details && (
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-neutral-400 font-medium">
                      {task.details.phone && <div>Phone: {task.details.phone}</div>}
                      {task.details.position && <div>Position: {task.details.position}</div>}
                      {task.details.chapterName && <div>Chapter: {task.details.chapterName}</div>}
                      {task.details.endDate && <div>End Date: {task.details.endDate}</div>}
                      {task.details.requestDate && <div>Request Date: {task.details.requestDate}</div>}
                      {task.details.status && <div>Status: {task.details.status}</div>}
                    </div>
                  )}
                </div>"""

content = re.sub(title_pattern, details_jsx, content)


# Now replace the Link block with the task.customActions logic
link_pattern = r'              <motion.div\s+whileHover=\{\{ y: -2, scale: 1\.02 \}\}\s+whileTap=\{\{ scale: 0\.95 \}\}\s+className="shrink-0 w-\[95px\] sm:w-\[105px\]"\s*>\s*<Link \s*to=\{task\.link\}\s*className="h-9 sm:h-10 w-full flex items-center justify-center text-center bg-\[#DC143C\] hover:bg-\[#B22222\] text-white font-semibold text-\[11px\] sm:text-\[13px\] tracking-wider uppercase rounded-\[12px\] transition-all duration-250 shadow-\[0_8px_24px_rgba\(220,20,60,0\.35\)\] hover:shadow-\[0_12px_30px_rgba\(220,20,60,0\.5\)\] border border-transparent shrink-0"\s*>\s*\{task\.linkText\}\s*</Link>\s*</motion.div>'

custom_actions_jsx = """              <motion.div
                className="shrink-0 flex flex-col gap-1.5"
              >
                {task.customActions ? (
                  task.customActions.map((act: any, i: number) => (
                    <button
                      key={i}
                      onClick={act.onClick}
                      className={cn(
                        "h-7 w-full px-3 flex items-center justify-center text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider rounded-[8px] transition-all border",
                        act.className
                      )}
                    >
                      {act.label}
                    </button>
                  ))
                ) : (
                  <Link 
                    to={task.link} 
                    className="h-9 sm:h-10 w-[95px] sm:w-[105px] flex items-center justify-center text-center bg-[#DC143C] hover:bg-[#B22222] text-white font-semibold text-[11px] sm:text-[13px] tracking-wider uppercase rounded-[12px] transition-all duration-250 shadow-[0_8px_24px_rgba(220,20,60,0.35)] hover:shadow-[0_12px_30px_rgba(220,20,60,0.5)] border border-transparent shrink-0"
                  >
                    {task.linkText}
                  </Link>
                )}
              </motion.div>"""

content = re.sub(link_pattern, custom_actions_jsx, content)

with open('src/components/ChapterAdminCompanionView.tsx', 'w') as f:
    f.write(content)
