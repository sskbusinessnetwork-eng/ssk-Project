const fs = require('fs');
const file = 'src/components/MemberCompanionView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldIndicator = `<div 
                    className="shrink-0 cursor-pointer"
                    title={task.isDone ? "Mark incomplete" : "Mark complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task.key);
                    }}
                  >
                    {task.isDone ? (
                      <div className={cn("w-6 h-6 rounded-full flex items-center justify-center border shadow-[0_0_8px_rgba(52,211,153,0.15)] hover:scale-110 transition-transform", task.isFailed ? "bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30")}>
                        <CheckSquare size={14} />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-neutral-500/10 text-neutral-400 hover:text-emerald-400 flex items-center justify-center border border-neutral-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:scale-110 transition-all">
                        <Clock size={14} />
                      </div>
                    )}
                  </div>`;

const newIndicator = `<div 
                    className="shrink-0 cursor-pointer w-6 h-6"
                    title={task.isDone ? "Mark incomplete" : "Mark complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task.key);
                    }}
                  >
                  </div>`;

content = content.replace(oldIndicator, newIndicator);

const oldTitle = `<h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.isDone ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">✓</span> : <span className="text-[10px] bg-neutral-500/20 text-neutral-400 px-1.5 py-0.5 rounded border border-neutral-500/30">○</span>}
                      {task.label}
                    </h4>`;

const newTitle = `<h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.label}
                    </h4>`;

content = content.replace(oldTitle, newTitle);

fs.writeFileSync(file, content);
