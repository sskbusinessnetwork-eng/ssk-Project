import re

with open('src/components/MemberCompanionView.tsx', 'r') as f:
    content = f.read()

# 1. Add filtering for hidden tasks
content = content.replace("const displayTasks = todayTasks;", "const displayTasks = (todayTasks || []).filter((t: any) => !t.isHidden);")

# 2. Support red indicator
# We have:
# {task.isDone ? (
#   <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]">
#     <CheckSquare size={12} />
#   </div>
# ) : (

replacement = """{task.isDone ? (
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border shadow-[0_0_8px_rgba(52,211,153,0.15)]", task.isFailed ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30")}>
                        <CheckSquare size={12} />
                      </div>
                    ) : ("""

content = re.sub(r'\{task\.isDone \? \(\s*<div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-\[0_0_8px_rgba\(52,211,153,0\.15\)\]">\s*<CheckSquare size=\{12\} />\s*</div>\s*\) : \(', replacement, content)

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(content)
