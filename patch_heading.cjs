const fs = require('fs');
const file = 'src/pages/MyReport.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldHeading = `<h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-3">
          <Activity className="text-[#E53935] h-7 w-7 sm:h-9 sm:w-9 shrink-0" />
          {formattedChapterTitle}
        </h1>`;

const newHeading = `<h1 className="text-lg sm:text-2xl md:text-3xl font-black text-white tracking-tight uppercase flex items-center justify-center gap-2 sm:gap-3 flex-wrap text-center leading-tight">
          <Activity className="text-[#E53935] h-6 w-6 sm:h-7 sm:w-7 shrink-0" />
          <span className="max-w-full break-words">{formattedChapterTitle}</span>
        </h1>`;

if (content.includes(oldHeading)) {
  content = content.replace(oldHeading, newHeading);
  fs.writeFileSync(file, content);
  console.log("Successfully patched heading");
} else {
  console.log("Heading not found");
}
