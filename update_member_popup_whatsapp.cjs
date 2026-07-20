const fs = require('fs');

const file = 'src/components/members/MemberSuccessPopup.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const handleSendWelcomeMessage = \(\) => \{[\s\S]*?  \};/,
`const handleSendWelcomeMessage = () => {
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = \`https://wa.me/\${memberData.phone.replace(/\\D/g, '')}?text=\${encodedMessage}\`;
    
    // Try to open WhatsApp
    const win = window.open(whatsappUrl, '_blank');
    if (!win) {
       // Fallback to copy if popup blocked
       navigator.clipboard.writeText(message)
         .then(() => {
           setCopied(true);
           setTimeout(() => setCopied(false), 2000);
           alert("Message copied successfully.");
         })
         .catch(err => console.error("Failed to copy:", err));
    }
  };`);

fs.writeFileSync(file, content);
