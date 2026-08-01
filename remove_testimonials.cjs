const fs = require('fs');
const file = 'src/components/StatGrid.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `        {
          label: 'TESTIMONIALS',
          isMerged: true,
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-950/80 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
          rows: [
            { label: 'Sent', value: String(testimonialsGivenCount ?? testimonialsCount ?? 0) },
            { label: 'Received', value: String(testimonialsReceivedCount ?? 0) },
          ]
        }`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, `        /* {
          label: 'TESTIMONIALS',
          isMerged: true,
          icon: Star,
          color: 'text-amber-400',
          bg: 'bg-amber-950/80 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]',
          rows: [
            { label: 'Sent', value: String(testimonialsGivenCount ?? testimonialsCount ?? 0) },
            { label: 'Received', value: String(testimonialsReceivedCount ?? 0) },
          ]
        } */`);
  fs.writeFileSync(file, content);
  console.log("Successfully commented out TESTIMONIALS card for MEMBER");
} else {
  console.log("TESTIMONIALS card not found, probably already commented out or the structure is different");
}
