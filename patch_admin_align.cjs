const fs = require('fs');
const file = 'src/components/ChapterAdminCompanionView.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldExact = `              {/* Left Column: Icon Indicator & Title */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Non-interactive check/clock indicator */}
                <div className="shrink-0">
                  {task.isDone ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                      <CheckSquare size={12} />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-neutral-500/10 text-neutral-500 flex items-center justify-center border border-neutral-500/20">
                      <Clock size={12} />
                    </div>
                  )}
                </div>
                
                {/* Title */}
                <div className="flex flex-col flex-1 min-w-0 pr-2">`;

const newExact = `              {/* Left Column: Title only */}
              <div className="flex flex-col flex-1 min-w-0 pr-2">`;

if (content.includes(oldExact)) {
    content = content.replace(oldExact, newExact);
    // Need to remove the extra closing div
    content = content.replace(
      `                  </h4>

                </div>
              </div>

              {/* Right Column: CTA Button */}`,
      `                  </h4>

              </div>

              {/* Right Column: CTA Button */}`
    );
    fs.writeFileSync(file, content);
    console.log("Patched left column spacing in admin view");
} else {
    console.log("Could not find the exact string to replace in admin view.");
}

