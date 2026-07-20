const fs = require('fs');
const file = 'src/pages/Positions.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/  \/\/ Load chapters\n  useEffect\(\(\) => \{/,
`  // Load chapters
  useEffect(() => {
    const fetchChapters = () => {
      if (isMasterAdmin) {
        const q = query(collection(db, 'chapters'));
        getDocs(q).then(snap => {
          setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
        });
      } else if (profile?.uid) {
        const q = query(collection(db, 'chapters'), where('chapter_admin_id', '==', profile.uid));
        getDocs(q).then(snap => {
          const found = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter));
          setChapters(found);
          if (found.length > 0 && !selectedChapterId) {
            setSelectedChapterId(found[0].id);
          }
        });
      }
    };
    fetchChapters();
    
    window.addEventListener('dashboard-refresh', fetchChapters);
    return () => window.removeEventListener('dashboard-refresh', fetchChapters);
  // eslint-disable-next-line
  }, [isMasterAdmin, profile?.uid]);
  
  // Dummy useEffect block to safely overwrite the old one below
  useEffect(() => { if (false) {`);

content = content.replace(/  \}, \[isMasterAdmin, profile\?\.uid\]\);/, `  } }, []);`);

fs.writeFileSync(file, content);
