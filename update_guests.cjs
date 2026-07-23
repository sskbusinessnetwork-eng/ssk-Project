const fs = require('fs');
let code = fs.readFileSync('src/pages/Guests.tsx', 'utf8');

// Add upcomingMeetings state
code = code.replace(
  "  const [categories, setCategories] = useState<Category[]>([]);",
  "  const [categories, setCategories] = useState<Category[]>([]);\n  const [upcomingMeetings, setUpcomingMeetings] = useState<any[]>([]);"
);

// Add fetching of upcoming meetings
const fetchMeetingsCode = `
      // Fetch upcoming meetings
      if (profile.chapter_id) {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
          const fetchedMeetings = await databaseService.list<any>('meetings', [
            where('chapter_id', '==', profile.chapter_id),
            where('date', '>=', todayStr)
          ]);
          // Sort by date
          const sorted = fetchedMeetings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setUpcomingMeetings(sorted);
        } catch (error) {
          console.error("Error fetching meetings:", error);
        }
      }
`;

code = code.replace(
  "      setAllUsers(users);",
  "      setAllUsers(users);\n" + fetchMeetingsCode
);

// Modify formData
const newFormDataCode = `
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestWhatsapp: '',
    guestBusiness: '',
    meetingId: ''
  });
`;

code = code.replace(
  /const \[formData, setFormData\] = useState\(\{[\s\S]*?\}\);/,
  newFormDataCode
);

// Modify handleSubmit
const newHandleSubmit = `
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    // Validation
    if (!formData.guestName || !formData.guestPhone || !formData.guestWhatsapp || !formData.guestBusiness || !formData.meetingId) {
      setError("Please fill all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const selectedMeeting = upcomingMeetings.find(m => m.id === formData.meetingId);
      if (!selectedMeeting) throw new Error("Please select a valid meeting.");

      const newInvitation = {
        invited_by: profile.uid,
        invited_by_name: profile.name || profile.full_name || 'Member',
        invited_by_chapter: profile.chapter_id || 'Unknown',
        guest_name: formData.guestName,
        guest_phone: formData.guestPhone,
        guest_whatsapp: formData.guestWhatsapp,
        business_category: formData.guestBusiness,
        meeting_id: formData.meetingId,
        meeting_title: selectedMeeting.title || 'Weekly Chapter Meeting',
        meeting_date: selectedMeeting.date,
        meeting_time: selectedMeeting.time || '10:00 AM',
        venue: selectedMeeting.venue || selectedMeeting.location || 'SSK Business Hall',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error: insertError } = await db.from('guest_invitations').insert([newInvitation]).select();
      if (insertError) throw insertError;
      
      const savedInvitation = data ? data[0] : newInvitation;
      
      await fetchInvitations();
      
      // WhatsApp sharing logic
      const message = \`Hello *\${formData.guestName}*,

You are warmly invited to attend the SSK Business Network Chapter Meeting.

📅 Date: \${selectedMeeting.date}
🕙 Time: \${selectedMeeting.time || '10:00 AM'}
📍 Venue: \${selectedMeeting.venue || selectedMeeting.location || 'SSK Business Hall'}

We would be delighted to have you join us to connect with local business professionals, build relationships, and explore new business opportunities.

Looking forward to seeing you.

Regards,
\${profile.name || profile.full_name || 'Member'}
SSK Business Network\`;
      
      const waUrl = \`https://wa.me/\${normalizePhoneNumber(formData.guestWhatsapp)}?text=\${encodeURIComponent(message)}\`;
      window.open(waUrl, '_blank');
      
      setLastCreatedInvitation(savedInvitation);
      setShowSuccess(true);
      setFormData({
        guestName: '',
        guestPhone: '',
        guestWhatsapp: '',
        guestBusiness: '',
        meetingId: ''
      });
      
      // Update workspace checklist automatically
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
    } catch (error: any) {
      console.error("Error sending invitation:", error);
      setError(error.message || "Failed to send invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
`;

code = code.replace(
  /const handleSubmit = async \(e: React.FormEvent\) => \{[\s\S]*? \};/,
  newHandleSubmit
);

fs.writeFileSync('src/pages/Guests.tsx', code);
