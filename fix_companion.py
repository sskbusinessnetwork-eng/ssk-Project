import re

with open('src/components/MemberCompanionView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r'\s*</motion\.div>\s*</motion\.div>\s*\)\)\s*\)\}\s*</div>\s*<div className="mt-5 pt-4 border-t border-white/5">',
    """
                </motion.div>
              </motion.div>
            ))}
            {displayTasks.length > 6 && (
               <button onClick={() => setShowAllTasks(!showAllTasks)} className="w-full mt-2 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs uppercase tracking-wider border border-purple-500/20 transition-colors">
                  {showAllTasks ? "Show Less" : "View All"}
               </button>
            )}
            </>
          )}
        </div>
        <div className="mt-5 pt-4 border-t border-white/5">""",
    content
)

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(content)
