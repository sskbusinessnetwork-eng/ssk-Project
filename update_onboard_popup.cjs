const fs = require('fs');
const file = 'src/pages/OnboardMember.tsx';
let content = fs.readFileSync(file, 'utf8');

// Import popup
content = content.replace(/import \{ Modal \} from '\.\.\/components\/Modal';/, "import { Modal } from '../components/Modal';\nimport { MemberSuccessPopup } from '../components/members/MemberSuccessPopup';");

// Add state
content = content.replace(/const \[isModalOpen, setIsModalOpen\] = useState\(false\);/, "const [isModalOpen, setIsModalOpen] = useState(false);\n  const [createdMemberData, setCreatedMemberData] = useState<any>(null);");

// Update handleSubmit
content = content.replace(/await setDoc\(doc\(db, 'auth_data', uid\), \{\n\s+password: 'Welcometosskbusiness',\n\s+phone: formData\.phone\n\s+\}\);\n\s+\}/,
`await setDoc(doc(db, 'auth_data', uid), {
          password: 'Welcometosskbusiness',
          phone: formData.phone
        });
        
        setCreatedMemberData({
          name: formData.fullName,
          userId: memberId,
          phone: formData.phone,
          password: 'Welcometosskbusiness'
        });
      }`);

// Add popup component to the render
content = content.replace(/\{isModalOpen && \(/, 
`<MemberSuccessPopup 
        isOpen={!!createdMemberData} 
        onClose={() => setCreatedMemberData(null)} 
        memberData={createdMemberData} 
      />
      {isModalOpen && (`);

fs.writeFileSync(file, content);
