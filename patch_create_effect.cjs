const fs = require('fs');
let code = fs.readFileSync('src/components/CreateChapter.tsx', 'utf8');

const effect = `
  useEffect(() => {
    if (editChapterId) {
      setLoading(true);
      const fetchChapter = async () => {
        try {
          const { data: chapterData } = await supabase
            .from('chapters')
            .select('*')
            .eq('id', editChapterId)
            .single();
          if (chapterData) {
            setFormData({
              chapter_name: chapterData.chapter_name || '',
              meeting_venue: chapterData.meeting_venue || '',
            });
          }
          const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .eq('chapter_id', editChapterId)
            .in('position', ['chapter_admin', 'president', 'vice_president', 'treasurer']);
          
          if (usersData) {
            setLeaders(prev => {
              const newLeaders = { ...prev };
              usersData.forEach(u => {
                const pos = u.position;
                if (newLeaders[pos]) {
                  newLeaders[pos] = {
                    ...newLeaders[pos],
                    fullName: u.name || u.displayName || '',
                    mobile: u.phone || '',
                    whatsapp: u.whatsapp || '',
                    email: u.email || '',
                    subscriptionStart: u.subscriptionStartDate || u.subscriptionStart || u.subscription_start_date || u.subscription_start || '',
                    subscriptionEnd: u.subscriptionEndDate || u.subscriptionEnd || u.subscription_end_date || u.subscription_end || '',
                  };
                }
              });
              return newLeaders;
            });
          }
        } catch (err) {
          console.error("Error fetching chapter:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchChapter();
    }
  }, [editChapterId]);
`;

code = code.replace(/const \[errors, setErrors\] \= useState\<Record\<string, string\>\>\(\{\}\);/, 
  `const [errors, setErrors] = useState<Record<string, string>>({});` + effect);

fs.writeFileSync('src/components/CreateChapter.tsx', code);
