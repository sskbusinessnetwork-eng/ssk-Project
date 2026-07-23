const fs = require('fs');
let code = fs.readFileSync('src/pages/OneToOneMeetings.tsx', 'utf8');

const hookInsert = `
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const updateId = params.get('update');
    if (updateId && meetings.length > 0) {
      const meetingToUpdate = meetings.find(m => m.id === updateId);
      if (meetingToUpdate && !isAttendanceModalOpen) {
        handleOpenAttendanceModal(meetingToUpdate);
        // Clear param so it doesn't reopen
        window.history.replaceState({}, '', '/one-to-one');
      }
    }
  }, [meetings]);
`;

code = code.replace(
  "  const fetchMeetingsAndUsers = async () => {",
  hookInsert + "\n  const fetchMeetingsAndUsers = async () => {"
);

fs.writeFileSync('src/pages/OneToOneMeetings.tsx', code);
