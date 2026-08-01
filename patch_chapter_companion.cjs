const fs = require('fs');
let content = fs.readFileSync('src/components/ChapterAdminCompanionView.tsx', 'utf8');

const old_desc = `                  {task.desc && (
                    <p className={cn("text-[10px] sm:text-[11px] leading-snug mt-0.5 opacity-75 hidden sm:line-clamp-1", task.isDone ? "text-gray-500" : "text-[#9CA3AF]")}>
                      {task.desc}
                    </p>
                  )}`;

const new_desc = ``;

content = content.replace(old_desc, new_desc);
fs.writeFileSync('src/components/ChapterAdminCompanionView.tsx', content);
