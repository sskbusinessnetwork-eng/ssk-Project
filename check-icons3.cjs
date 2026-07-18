const lucide = require('lucide-react');
const icons = ['Share2', 'Award', 'Calendar', 'UserPlus', 'ChevronRight', 'Users', 'Handshake', 'BookOpen', 'Eye', 'Plus', 'Filter', 'TrendingUp', 'CheckCircle2', 'Clock', 'Sparkles', 'Target', 'Compass', 'HelpCircle', 'Activity', 'Briefcase', 'ArrowRight', 'Trophy', 'Flame', 'Star', 'Zap', 'Shield', 'Rocket', 'Crown', 'CheckSquare'];
for (const icon of icons) {
  if (!lucide[icon]) {
    console.log(`Missing icon: ${icon}`);
  }
}
console.log("Done checking Dashboard.");
