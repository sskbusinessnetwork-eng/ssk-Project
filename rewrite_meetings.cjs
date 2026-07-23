const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const fetchGuestsState = `
  const [meetingGuests, setMeetingGuests] = useState<any[]>([]);
  const [tempGuestAttendance, setTempGuestAttendance] = useState<Record<string, string>>({});
  const [guestInviters, setGuestInviters] = useState<Record<string, any>>({});
`;

code = code.replace(
  "  const [tempNotes, setTempNotes] = useState('');",
  "  const [tempNotes, setTempNotes] = useState('');" + fetchGuestsState
);

fs.writeFileSync('src/pages/Meetings.tsx', code);
