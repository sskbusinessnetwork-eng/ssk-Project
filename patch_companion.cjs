const fs = require('fs');
let content = fs.readFileSync('src/components/MemberCompanionView.tsx', 'utf8');

const old_title = `                  {/* Title & Desc */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.isDone ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">✓</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-500/30">○</span>}
                      {task.label}
                    </h4>
                    {task.isDone && task.pointsVal ? (
                       <span className="text-[11px] font-extrabold text-amber-400 tracking-tight block mt-0.5">+{task.pointsVal} Points Earned</span>
                    ) : null}
                    {task.date && (
                       <span className="text-[10px] font-bold text-purple-400/80 mb-0.5 block mt-0.5">{task.date}</span>
                    )}
                    {task.desc && (
                      <p className={cn("text-[10px] sm:text-[11px] leading-snug mt-0.5 opacity-75 line-clamp-2", task.isDone ? "text-gray-500" : "text-[#9CA3AF]")}>
                        {task.desc}
                      </p>
                    )}
                  </div>`;

const new_title = `                  {/* Title */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.isDone ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">✓</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-500/30">○</span>}
                      {task.label}
                    </h4>
                    {task.isDone && task.pointsVal ? (
                       <span className="text-[11px] font-extrabold text-amber-400 tracking-tight block mt-0.5">+{task.pointsVal} Points Earned</span>
                    ) : null}
                  </div>`;

content = content.replace(old_title, new_title);
fs.writeFileSync('src/components/MemberCompanionView.tsx', content);
