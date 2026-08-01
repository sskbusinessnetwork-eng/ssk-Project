import sys

with open('src/components/MemberCompanionView.tsx', 'r') as f:
    content = f.read()

# 1. Add state
content = content.replace(
    "const [successMsg, setSuccessMsg] = useState('');",
    "const [successMsg, setSuccessMsg] = useState('');\n  const [showAllTasks, setShowAllTasks] = useState(false);"
)

# 2. Modify displayTasks to handle slice
replace_old_map = """          {displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0B1220]/40 border border-white/5 rounded-[20px] px-4">
              <CheckSquare size={28} className="text-emerald-500 mb-2 opacity-60" />
              <p className="text-white text-[13px] font-bold">All Caught Up!</p>
              <p className="text-[#9CA3AF] text-[11px] mt-1 leading-snug">No scheduled workspace tasks or meetings for today.</p>
            </div>
          ) : (
            displayTasks.map((task, index) => ("""

replace_new_map = """          {displayTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center bg-[#0B1220]/40 border border-white/5 rounded-[20px] px-4">
              <CheckSquare size={28} className="text-emerald-500 mb-2 opacity-60" />
              <p className="text-white text-[13px] font-bold">All Caught Up!</p>
              <p className="text-[#9CA3AF] text-[11px] mt-1 leading-snug">No scheduled workspace tasks or meetings for today.</p>
            </div>
          ) : (
            <>
            {(showAllTasks ? displayTasks : displayTasks.slice(0, 6)).map((task: any, index: number) => ("""

content = content.replace(replace_old_map, replace_new_map)

# 3. Modify task rendering to include status and points
replace_old_task_content = """                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.label}
                    </h4>
                    {task.desc && (
                      <p className={cn("text-[10px] sm:text-[11px] leading-snug mt-0.5 opacity-75 line-clamp-2", task.isDone ? "text-gray-500" : "text-[#9CA3AF]")}>
                        {task.desc}
                      </p>
                    )}"""

replace_new_task_content = """                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.isDone ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">✓</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-500/30">○</span>}
                      {task.label}
                      {task.pointsVal ? <span className="text-[11px] font-extrabold text-amber-400 tracking-tight whitespace-nowrap ml-1">(+{task.pointsVal} Points)</span> : null}
                    </h4>
                    {task.date && (
                       <span className="text-[10px] font-bold text-purple-400/80 mb-0.5 block">{task.date}</span>
                    )}
                    {task.desc && (
                      <p className={cn("text-[10px] sm:text-[11px] leading-snug mt-0.5 opacity-75 line-clamp-2", task.isDone ? "text-gray-500" : "text-[#9CA3AF]")}>
                        {task.desc}
                      </p>
                    )}"""

content = content.replace(replace_old_task_content, replace_new_task_content)

# 4. Add "View All" button after mapping
replace_old_end = """            ))
          )}
        </div>
        <div className="mt-5 pt-4 border-t border-white/5">"""

replace_new_end = """            ))
            }
            {displayTasks.length > 6 && (
               <button onClick={() => setShowAllTasks(!showAllTasks)} className="w-full mt-2 py-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-bold text-xs uppercase tracking-wider border border-purple-500/20 transition-colors">
                  {showAllTasks ? "Show Less" : "View All"}
               </button>
            )}
            </>
          )}
        </div>
        <div className="mt-5 pt-4 border-t border-white/5">"""

content = content.replace(replace_old_end, replace_new_end)

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(content)
