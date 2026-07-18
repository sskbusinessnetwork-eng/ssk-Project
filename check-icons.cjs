const lucide = require('lucide-react');
const icons = ['Calendar', 'CheckCircle2', 'UserPlus', 'Users', 'Sparkles', 'Clock', 'Handshake', 'ArrowRight', 'TrendingUp', 'Award', 'Flame', 'Target', 'Shield', 'Zap', 'TrendingDown', 'Activity', 'Globe', 'Trophy'];
for (const icon of icons) {
  if (!lucide[icon]) {
    console.log(`Missing icon: ${icon}`);
  }
}
console.log("Done checking.");
