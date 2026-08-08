const fs = require('fs');

const content = fs.readFileSync('src/utils/growthScore.ts', 'utf-8');

const targetStart = "    const hasScheduleMeetingAuto = oneToOnes.some(m => {";
const targetEnd = "    // 6. Attend Chapter Meeting";

const startIdx = content.indexOf(targetStart);
const endIdx = content.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newStr = `    const hasScheduleMeetingAuto = oneToOnes.some(m => {
      const isCreator = m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || m.created_by === userId || m.createdBy === userId;
      return isCreator && isDateInRange(m.created_at || m.createdAt || m.meeting_date || m.date);
    });

    const has121Auto = oneToOnes.some(m => {
      const isParticipant = (
        m.organizer_id === userId || m.creatorId === userId || m.sender_id === userId || 
        m.member_id === userId || m.receiver_id === userId || (m.participantIds || []).includes(userId)
      );
      if (!isParticipant) return false;
      const o2oUserAtt = (m.attendance || {})[userId];
      const isCompleted = m.status === 'COMPLETED' || o2oUserAtt === 'PRESENT' || o2oUserAtt === 'Present' || Boolean(m.completed_at);
      return isCompleted && (isDateInRange(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt) || (!isNaN(new Date(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt).getTime()) && Math.abs(new Date().getTime() - new Date(m.completed_at || m.meeting_date || m.date || m.created_at || m.createdAt).getTime()) < 30 * 24 * 60 * 60 * 1000));
    });

    const isO2ODone = hasScheduleMeetingAuto || has121Auto;

    rawTasks.push({
      key: \`task_schedule_meeting_\${dateStr}\`,
      label: 'Schedule 1-to-1 Meeting',
      desc: 'Schedule or complete a 1-to-1 meeting.',
      autoDone: isO2ODone,
      link: isO2ODone ? '/one-to-one' : '/one-to-one?action=new',
      linkText: isO2ODone ? 'VIEW' : 'SCHEDULE',
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10'
    });
    
`;
  const newContent = content.substring(0, startIdx) + newStr + content.substring(endIdx);
  fs.writeFileSync('src/utils/growthScore.ts', newContent, 'utf-8');
  console.log('SUCCESS');
} else {
  console.log('TARGET NOT FOUND', {startIdx, endIdx});
}
