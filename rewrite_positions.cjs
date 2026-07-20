const fs = require('fs');

const content = fs.readFileSync('src/pages/Positions.tsx', 'utf8');
const before = content.substring(0, content.indexOf('// Load chapters'));
const afterRaw = content.substring(content.indexOf('// Load members of selected chapter'));

const newLoadBlock = `  // Load chapters
  useEffect(() => {
    const fetchChapters = () => {
      if (isMasterAdmin) {
        const q = query(collection(db, 'chapters'));
        getDocs(q).then(snap => {
          setChapters(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter)));
        });
      } else if (profile?.uid) {
        // For Chapter Admin
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
    
    const handleRefresh = () => fetchChapters();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [isMasterAdmin, profile?.uid]);

  `;

fs.writeFileSync('src/pages/Positions.tsx', before + newLoadBlock + afterRaw);
