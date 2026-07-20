const fs = require('fs');

// update ManageChapter.tsx
let mc = fs.readFileSync('src/pages/ManageChapter.tsx', 'utf8');
mc = mc.replace(/<CreateChapter \/>/, "<CreateChapter onSuccess={() => setActiveTab('positions')} />");
fs.writeFileSync('src/pages/ManageChapter.tsx', mc);

// update CreateChapter.tsx
let cc = fs.readFileSync('src/components/CreateChapter.tsx', 'utf8');
cc = cc.replace(/export function CreateChapter\(\) \{/, "export function CreateChapter({ onSuccess }: { onSuccess?: () => void }) {");
cc = cc.replace(/const closeForm = \(\) => \{[\s\S]*?setSuccessPopup\(false\);\n  \};/m,
`  const closeForm = () => {
    setFormData({ chapter_name: '', meeting_venue: '' });
    setLeaders({
      chapter_admin: { fullName: '', mobile: '', whatsapp: '', email: '' },
      president: { fullName: '', mobile: '', whatsapp: '', email: '' },
      vice_president: { fullName: '', mobile: '', whatsapp: '', email: '' },
      treasurer: { fullName: '', mobile: '', whatsapp: '', email: '' },
    });
    setSuccessPopup(false);
    if (onSuccess) onSuccess();
  };`);
fs.writeFileSync('src/components/CreateChapter.tsx', cc);

