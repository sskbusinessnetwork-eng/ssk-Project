const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const effectCode = `
  useEffect(() => {
    if (isUpdateModalOpen && selectedMeeting) {
      const fetchGuests = async () => {
        try {
          const { data: guests, error } = await supabase
            .from('guest_invitations')
            .select('*')
            .eq('meeting_id', selectedMeeting.id);
            
          if (guests) {
            setMeetingGuests(guests);
            
            // Extract unique inviter IDs
            const inviterIds = [...new Set(guests.map(g => g.invited_by).filter(Boolean))];
            
            if (inviterIds.length > 0) {
              const { data: users, error: usersError } = await supabase
                .from('users')
                .select('*')
                .in('uid', inviterIds);
                
              if (users) {
                const invitersMap = users.reduce((acc, user) => {
                  acc[user.uid] = user;
                  return acc;
                }, {} as Record<string, any>);
                setGuestInviters(invitersMap);
              }
            }
            
            // Initialize tempGuestAttendance
            const initialGuestAttendance: Record<string, string> = {};
            guests.forEach(g => {
              if (g.status === 'Present' || g.status === 'Absent') {
                initialGuestAttendance[g.id] = g.status;
              } else if (g.attendance_status) {
                initialGuestAttendance[g.id] = g.attendance_status;
              }
            });
            setTempGuestAttendance(initialGuestAttendance);
          }
        } catch (err) {
          console.error("Error fetching guests:", err);
        }
      };
      
      fetchGuests();
    }
  }, [isUpdateModalOpen, selectedMeeting]);
`;

code = code.replace(
  "  useEffect(() => {",
  effectCode + "\n  useEffect(() => {"
);

// We need to import supabase if not imported
if (!code.includes("import { supabase }")) {
  code = "import { supabase } from '../lib/supabaseClient';\n" + code;
}

fs.writeFileSync('src/pages/Meetings.tsx', code);
