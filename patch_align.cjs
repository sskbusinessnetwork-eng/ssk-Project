const fs = require('fs');
const file = 'src/components/MemberCompanionView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStructure = `                  {/* Left Column: Icon Indicator & Title */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Interactive check/clock indicator */}
                  <div 
                    className="shrink-0 cursor-pointer w-6 h-6"
                    title={task.isDone ? "Mark incomplete" : "Mark complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task.key);
                    }}
                  >
                  </div>
                  
                  {/* Title */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2">
                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.label}
                    </h4>
                    {task.isDone && task.pointsVal ? (
                       <span className="text-[11px] font-extrabold text-amber-400 tracking-tight block mt-0.5">+{task.pointsVal} Points Earned</span>
                    ) : null}
                  </div>
                </div>`;

const newStructure = `                  {/* Left Column: Title only */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2 cursor-pointer"
                       title={task.isDone ? "Mark incomplete" : "Mark complete"}
                       onClick={(e) => {
                         e.stopPropagation();
                         handleToggleTask(task.key);
                       }}
                  >
                    <h4 className={cn(
                      "text-[12px] sm:text-[14px] font-bold tracking-tight leading-snug transition-all duration-300 line-clamp-2 break-words flex items-center gap-1.5 flex-wrap",
                      task.isDone ? "text-gray-500 line-through opacity-70" : "text-white"
                    )}>
                      {task.label}
                    </h4>
                    {task.isDone && task.pointsVal ? (
                       <span className="text-[11px] font-extrabold text-amber-400 tracking-tight block mt-0.5">+{task.pointsVal} Points Earned</span>
                    ) : null}
                  </div>`;

// Since indentation might differ, let's just use replace with regex or simpler string replacement.

const oldExact = `                {/* Left Column: Icon Indicator & Title */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Interactive check/clock indicator */}
                  <div 
                    className="shrink-0 cursor-pointer w-6 h-6"
                    title={task.isDone ? "Mark incomplete" : "Mark complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTask(task.key);
                    }}
                  >
                  </div>
                  
                  {/* Title */}
                  <div className="flex flex-col flex-1 min-w-0 pr-2">`;

const newExact = `                {/* Left Column: Title only */}
                <div className="flex flex-col flex-1 min-w-0 pr-2 cursor-pointer"
                     title={task.isDone ? "Mark incomplete" : "Mark complete"}
                     onClick={(e) => {
                       e.stopPropagation();
                       handleToggleTask(task.key);
                     }}
                >`;

if (content.includes(oldExact)) {
    content = content.replace(oldExact, newExact);
    // Need to remove the extra closing div
    content = content.replace(
      `                  </div>
                </div>

                {/* Right Column: CTA Button */}`,
      `                </div>

                {/* Right Column: CTA Button */}`
    );
    fs.writeFileSync(file, content);
    console.log("Patched left column spacing");
} else {
    console.log("Could not find the exact string to replace.");
}

