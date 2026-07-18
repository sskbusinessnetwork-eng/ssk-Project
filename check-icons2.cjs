const lucide = require('lucide-react');
const icons = ['Users', 'Calendar', 'Target', 'TrendingUp', 'Share2', 'Briefcase', 'Handshake', 'UserCheck', 'Star', 'Activity', 'Plus'];
for (const icon of icons) {
  if (!lucide[icon]) {
    console.log(`Missing icon: ${icon}`);
  }
}
console.log("Done checking StatGrid.");
