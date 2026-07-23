const fs = require('fs');
let code = fs.readFileSync('src/pages/Meetings.tsx', 'utf8');

const regex = /const handleSaveUpdate = async \(\) => \{([\s\S]*?)\} catch \(err: any\)/;
const match = code.match(regex);
if (match) {
  const originalBody = match[1];
  
  const newLogic = `
      // Guest Attendance Save Logic
      if (meetingGuests.length > 0) {
        for (const guest of meetingGuests) {
          const gStatus = tempGuestAttendance[guest.id];
          if (gStatus) {
            // Update guest invitation status
            const updatePayload = {
              status: gStatus,
              attendance_status: gStatus,
              attendance_updated_by: profile?.uid,
              attendance_updated_by_name: profile?.name || profile?.full_name,
              attendance_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await supabase
              .from('guest_invitations')
              .update(updatePayload)
              .eq('id', guest.id);
              
            // Update workspace checklist and score if Present
            if (gStatus === 'Present') {
               // Update member's growth score and checklist
               const inviterId = guest.invited_by;
               if (inviterId) {
                 try {
                   // Fetch current score
                   const { data: inviterData } = await supabase
                     .from('users')
                     .select('growth_score, workspace_checklist')
                     .eq('uid', inviterId)
                     .single();
                     
                   if (inviterData) {
                     const currentScore = inviterData.growth_score || 0;
                     const checklist = inviterData.workspace_checklist || {};
                     
                     await supabase
                       .from('users')
                       .update({
                         growth_score: currentScore + 10,
                         workspace_checklist: {
                           ...checklist,
                           'Invite a New Guest': true
                         }
                       })
                       .eq('uid', inviterId);
                   }
                 } catch (scoreErr) {
                   console.error("Failed to update growth score for guest:", scoreErr);
                 }
               }
            }
          }
        }
      }
      
      // Dispatch event to refresh analytics instantly
      window.dispatchEvent(new CustomEvent('dashboard-refresh'));
  `;
  
  const newBody = originalBody.replace(
    "await databaseService.update('meetings', selectedMeeting.id, {",
    newLogic + "\n      await databaseService.update('meetings', selectedMeeting.id, {"
  );
  
  code = code.replace(match[0], `const handleSaveUpdate = async () => {${newBody}} catch (err: any)`);
  fs.writeFileSync('src/pages/Meetings.tsx', code);
} else {
  console.log("Could not find handleSaveUpdate");
}
