import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

new_block = """  const todayTasks = useMemo(() => {
    if (!profile) return [];
    const role = (profile.role || '').toUpperCase();
    if (role === 'MASTER_ADMIN') return [];

    const tasks: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = (dateString: any) => {
      if (!dateString) return false;
      try {
        return new Date(dateString).toISOString().split('T')[0] === todayStr;
      } catch (e) {
        return false;
      }
    };

    const userGivenRefs = allReferrals.filter(r => (r.fromUserId === profile.uid || r.sender_id === profile.uid || r.authorMemberId === profile.uid));
    const userReceivedRefs = allReferrals.filter(r => (r.toUserId === profile.uid || r.receiver_id === profile.uid || r.receiverMemberId === profile.uid));
    const userGuests = guestInvitations.filter(g => (g.createdBy === profile.uid || g.member_id === profile.uid || g.invited_by === profile.uid));
    const userOneToOnes = oneToOnes.filter(m => {
      const orgId = m.organizer_id || m.creatorId || m.sender_id;
      const recId = m.member_id || m.receiver_id;
      const pIds = m.participantIds || [];
      return (orgId === profile.uid || recId === profile.uid || pIds.includes(profile.uid));
    });
    const userChapterMeetings = meetings.filter(m => String(m.chapter_id || m.chapterId) === String(profile.chapter_id));

    // Helper: is past time
    const isPastTime = (timeStr: string) => {
      try {
        const meetingTime = timeStr || '10:00 AM';
        const [timePart, ampm] = meetingTime.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        const meetingDateObj = new Date();
        meetingDateObj.setHours(hours, minutes || 0, 0, 0);
        return new Date() >= meetingDateObj;
      } catch(e) {
        return true;
      }
    };

    // 1. Invite a New Guest (20 pts)
    const hasInvitedToday = userGuests.some(g => isToday(g.createdAt || g.created_at || g.date));
    tasks.push({
      key: 'task_invite_visitor',
      label: 'Invite a New Guest',
      desc: 'Invite a visitor to earn 20 points.',
      isHidden: hasInvitedToday,
      isDone: hasInvitedToday,
      link: '/guests',
      linkText: 'INVITE',
      iconColor: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      icon: UserPlus,
      pointsVal: hasInvitedToday ? 20 : 0
    });

    // 2. Pass Referral (20 pts)
    const hasPassedToday = userGivenRefs.some(r => isToday(r.createdAt || r.created_at || r.date));
    tasks.push({
      key: 'task_pass_referral',
      label: 'Pass Referral',
      desc: 'Pass a referral to earn 20 points.',
      isHidden: hasPassedToday,
      isDone: hasPassedToday,
      link: '/refer',
      linkText: 'PASS REFERRAL',
      iconColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      icon: Share2,
      pointsVal: hasPassedToday ? 20 : 0
    });

    // 3. Complete Profile (10 pts)
    const isProfileComplete = Boolean(
      profile.profile_photo && profile.name && profile.phone && profile.email && 
      (profile.business_name || profile.businessName) && (profile.category || profile.business_category) && 
      (profile.chapter_id || profile.chapterId) && profile.position && profile.address && profile.bio
    );
    tasks.push({
      key: 'task_complete_profile',
      label: 'Complete Your Profile',
      desc: 'Complete your profile to earn 10 points.',
      isHidden: isProfileComplete,
      isDone: isProfileComplete,
      link: '/profile',
      linkText: 'COMPLETE',
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      icon: UserPlus,
      pointsVal: isProfileComplete ? 10 : 0
    });

    // 4. One-to-One Meeting (20 pts)
    const today121 = userOneToOnes.filter(m => isToday(m.date));
    const has121Today = today121.length > 0;
    
    if (!has121Today) {
      tasks.push({
        key: 'task_one_to_one',
        label: 'One-to-One Meeting',
        desc: 'Schedule a 1-to-1 meeting.',
        isHidden: false,
        isDone: false,
        link: '/one-to-one',
        linkText: 'SCHEDULE',
        iconColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        icon: Handshake,
        pointsVal: 0
      });
    } else {
      const m121 = today121[0];
      const pastTime = isPastTime(m121.time || m121.meeting_time);
      const isCompleted = m121.status === 'COMPLETED';
      const isNotCompleted = m121.status === 'NOT_COMPLETED';
      const userAtt = (m121.attendance || {})[profile.uid];
      const isPresent = userAtt === 'PRESENT' || (isCompleted && !userAtt); // Default to present if marked completed and no specific status
      const isAbsent = userAtt === 'ABSENT' || isNotCompleted;
      
      if (!pastTime) {
        tasks.push({
          key: 'task_one_to_one',
          label: 'One-to-One Meeting',
          isHidden: true,
          isDone: false,
          pointsVal: 0
        });
      } else {
        if (!isCompleted && !isNotCompleted && !userAtt) {
          tasks.push({
            key: 'task_one_to_one',
            label: 'Update Meeting Attendance',
            desc: 'Mark attendance for your 1-to-1 meeting.',
            isHidden: false,
            isDone: false,
            link: `/one-to-one?update=${m121.id}`,
            linkText: 'UPDATE ATTENDANCE',
            iconColor: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            icon: Handshake,
            pointsVal: 0
          });
        } else {
          tasks.push({
            key: 'task_one_to_one',
            label: 'One-to-One Meeting',
            desc: isPresent ? 'Attendance updated.' : 'Marked as absent.',
            isHidden: false,
            isDone: true,
            isFailed: isAbsent,
            link: '/one-to-one',
            linkText: 'VIEW',
            iconColor: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            icon: Handshake,
            pointsVal: isPresent ? 20 : 0
          });
        }
      }
    }

    // 5. Referral Received (10 pts)
    const pendingReferrals = userReceivedRefs.filter(r => r.status === 'Pending' || r.status === 'New');
    const updatedToday = userReceivedRefs.some(r => isToday(r.updated_at) && r.updated_at !== r.created_at);
    
    if (pendingReferrals.length > 0) {
      tasks.push({
        key: 'task_update_referral',
        label: 'Referral Received',
        desc: `You have ${pendingReferrals.length} pending referral(s) to update.`,
        isHidden: false,
        isDone: false,
        link: `/refer?tab=received&update=${pendingReferrals[0].id}`,
        linkText: 'UPDATE REFERRAL',
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        icon: Share2,
        pointsVal: 0
      });
    } else {
      tasks.push({
        key: 'task_update_referral',
        label: 'Referral Received',
        desc: 'You updated a referral today.',
        isHidden: !updatedToday,
        isDone: true,
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        icon: Share2,
        pointsVal: updatedToday ? 10 : 0
      });
    }

    // 6. Attend Chapter Meeting (20 pts)
    const todayChapter = userChapterMeetings.filter(m => isToday(m.date));
    const hasChapterToday = todayChapter.length > 0;
    
    if (hasChapterToday) {
      const mChap = todayChapter[0];
      const pastChapTime = isPastTime(mChap.time || mChap.meeting_time);
      const isChapCompleted = mChap.isCompleted || mChap.status === 'COMPLETED';
      const chapAtt = (mChap.attendance || {})[profile.uid];
      const isChapPresent = chapAtt === 'Present' || chapAtt === 'PRESENT' || chapAtt === 'Yes' || chapAtt === 'YES' || chapAtt === 'Substitute' || chapAtt === 'SUBSTITUTE';
      const isChapAbsent = chapAtt === 'Absent' || chapAtt === 'ABSENT' || chapAtt === 'No' || chapAtt === 'NO';
      
      if (!pastChapTime) {
        tasks.push({
          key: 'task_chapter_meeting',
          label: 'Attend Chapter Meeting',
          desc: 'Upcoming Meeting',
          isHidden: false,
          isDone: false,
          link: '/meetings',
          linkText: 'VIEW',
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          icon: Calendar,
          pointsVal: 0
        });
      } else if (!isChapCompleted && !isChapPresent && !isChapAbsent) {
        tasks.push({
          key: 'task_chapter_meeting',
          label: 'Attend Chapter Meeting',
          desc: 'Waiting for Attendance',
          isHidden: false,
          isDone: false,
          link: '/meetings',
          linkText: 'VIEW',
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          icon: Calendar,
          pointsVal: 0
        });
      } else {
        tasks.push({
          key: 'task_chapter_meeting',
          label: 'Attend Chapter Meeting',
          desc: isChapPresent ? 'Attendance marked Present.' : 'Attendance marked Absent.',
          isHidden: false,
          isDone: true,
          isFailed: isChapAbsent,
          link: '/meetings',
          linkText: 'VIEW',
          iconColor: 'text-purple-400',
          bgColor: 'bg-purple-500/10',
          icon: Calendar,
          pointsVal: isChapPresent ? 20 : 0
        });
      }
    }

    return tasks;
  }, [profile, meetings, oneToOnes, allReferrals, allSlips, guestInvitations]);"""

content = re.sub(r'  const todayTasks = useMemo\(\(\) => \{.*?\n  \}, \[profile, meetings, oneToOnes, allReferrals, allSlips, guestInvitations\]\);', new_block, content, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)
