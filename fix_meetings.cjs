const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const hookInsert = `
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const updateId = params.get('update');
    if (updateId && meetings.length > 0) {
      const meetingToUpdate = meetings.find(m => m.id === updateId);
      if (meetingToUpdate && !isUpdateModalOpen && !isMeetingDetailsModalOpen) {
        if (isAdmin) {
          setSelectedMeeting(meetingToUpdate);
          const normalizedAttendance: Record<string, string> = {};
          if (meetingToUpdate.attendance) {
            Object.entries(meetingToUpdate.attendance).forEach(([uid, status]) => {
              normalizedAttendance[uid] = typeof status === 'string' ? status : (status as any).status || 'ABSENT';
            });
          }
          setTempAttendance(normalizedAttendance);
          setTempAmount(meetingToUpdate.amountCollected || {});
          setTempMemberNotes(meetingToUpdate.memberNotes || {});
          setIsUpdateModalOpen(true);
        } else {
          setDetailsMeeting(meetingToUpdate);
          setIsMeetingDetailsModalOpen(true);
        }
        window.history.replaceState({}, '', '/meetings');
      }
    }
  }, [meetings]);
`;

code = code.replace(
  "  const fetchMeetings = async () => {",
  hookInsert + "\n  const fetchMeetings = async () => {"
);

fs.writeFileSync('src/pages/Meetings.tsx', code);
