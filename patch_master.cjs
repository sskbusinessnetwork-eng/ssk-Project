const fs = require('fs');
let content = fs.readFileSync('src/components/MasterAdminCompanionView.tsx', 'utf8');

const old_task = `                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.isDone ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">✓</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-500/30">○</span>}
                      {task.label}
                      {task.pointsVal ? <span className="text-[11px] font-extrabold text-amber-400 tracking-tight whitespace-nowrap ml-1">(+{task.pointsVal} Points)</span> : null}
                    </h4>`;

const new_task = `                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.isDone ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">✓</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-500/30">○</span>}
                      {task.label}
                    </h4>
                    {task.isDone && task.pointsVal ? (
                       <span className="text-[11px] font-extrabold text-amber-400 tracking-tight block mt-0.5">+{task.pointsVal} Points Earned</span>
                    ) : null}`;

if (content.includes(old_task)) {
    content = content.replace(old_task, new_task);
    fs.writeFileSync('src/components/MasterAdminCompanionView.tsx', content);
    console.log("Patched MasterAdmin");
} else {
    console.log("Not found in MasterAdmin");
}
