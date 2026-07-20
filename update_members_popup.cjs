const fs = require('fs');
const file = 'src/pages/Members.tsx';
let content = fs.readFileSync(file, 'utf8');

// Import the popup
content = content.replace(/import \{ SubscriptionModal \} from '\.\.\/components\/members\/SubscriptionModal';/, "import { SubscriptionModal } from '../components/members/SubscriptionModal';\nimport { MemberSuccessPopup } from '../components/members/MemberSuccessPopup';");

// Add state
content = content.replace(/const \[isAddModalOpen, setIsAddModalOpen\] = useState\(false\);/, "const [isAddModalOpen, setIsAddModalOpen] = useState(false);\n  const [createdMemberData, setCreatedMemberData] = useState<any>(null);");

// Update handleAddMember
content = content.replace(/setSuccessMessage\(\`Member \$\{newMemberData\.name\} added successfully\!\`\);\n\s+setTimeout\(\(\) => setSuccessMessage\(null\), 3000\);\n\s+setIsAddModalOpen\(false\);\n\s+setNewMemberData\(\{/,
`setCreatedMemberData({
        name: newMemberData.name,
        userId: uid,
        phone: normalizedPhone,
        password: newMemberData.password
      });
      setIsAddModalOpen(false);
      setNewMemberData({`);

// Add the popup to JSX
content = content.replace(/<AddMemberModal/, 
`<MemberSuccessPopup 
        isOpen={!!createdMemberData} 
        onClose={() => setCreatedMemberData(null)} 
        memberData={createdMemberData} 
      />
      <AddMemberModal`);

fs.writeFileSync(file, content);
