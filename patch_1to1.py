import re
with open('src/pages/OneToOneMeetings.tsx', 'r') as f:
    content = f.read()

# 1. Update form state and initialization
old_form = """  const [formData, setFormData] = useState({
    participantId: '',
    date: '',
    time: '',
    venue: '',
    notes: ''
  });"""

new_form = """  const [formData, setFormData] = useState({
    title: '',
    participantId: '',
    date: '',
    time: '',
    venue: '',
    notes: ''
  });"""

content = content.replace(old_form, new_form)

# 2. Update meeting constraints to use organizer_id or member_id
old_constraints = """    const meetingsConstraints = (isAdmin || isChapterAdmin)
      ? [orderBy('date', 'desc')]
      : [
          or(
            where('creatorId', '==', profile.uid),
            where('participantIds', 'array-contains', profile.uid)
          ),
          orderBy('date', 'desc')
        ];"""

new_constraints = """    const meetingsConstraints = (isAdmin || isChapterAdmin)
      ? [orderBy('scheduled_date', 'desc')]
      : [
          or(
            where('organizer_id', '==', profile.uid),
            where('member_id', '==', profile.uid)
          ),
          orderBy('scheduled_date', 'desc')
        ];"""

content = content.replace(old_constraints, new_constraints)

# 3. Update meeting creation object
old_create = """      const newMeeting: Omit<OneToOneMeeting, 'id'> = {
        creatorId: profile.uid,
        participantIds: [formData.participantId],
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        notes: formData.notes,
        status: 'UPCOMING',
        createdAt: new Date().toISOString()
      };

      await databaseService.create('one_to_one_meetings', newMeeting);"""

new_create = """      // Combine date and time for scheduled_date
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);
      
      const newMeeting = {
        title: formData.title || `1-to-1 with ${members.find(m => m.uid === formData.participantId)?.name || 'Member'}`,
        organizer_id: profile.uid,
        member_id: formData.participantId,
        chapter_id: profile.chapter_id,
        scheduled_date: scheduledDateTime.toISOString(),
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Fallback for types if needed
        type: 'IN_PERSON',
        date: formData.date,
        time: formData.time,
        duration: 60,
        description: formData.notes
      };

      await databaseService.create('one_to_one_meetings', newMeeting);"""

content = content.replace(old_create, new_create)

# 4. Update the history modal constraints
old_history = """    let constraints = [];
    if (historyType === 'scheduled') {
      constraints.push(where('creatorId', '==', selectedMemberId));
    } else if (historyType === 'attended') {
      constraints.push(where('participantIds', 'array-contains', selectedMemberId));
    } else {
      constraints.push(or(
        where('creatorId', '==', selectedMemberId),
        where('participantIds', 'array-contains', selectedMemberId)
      ));
    }"""

new_history = """    let constraints = [];
    if (historyType === 'scheduled') {
      constraints.push(where('organizer_id', '==', selectedMemberId));
    } else if (historyType === 'attended') {
      constraints.push(where('member_id', '==', selectedMemberId));
    } else {
      constraints.push(or(
        where('organizer_id', '==', selectedMemberId),
        where('member_id', '==', selectedMemberId)
      ));
    }
    constraints.push(orderBy('scheduled_date', 'desc'));"""

content = content.replace(old_history, new_history)

# 5. Handle errors precisely
old_catch = """    } catch (error) {
      console.error("Error creating meeting:", error);
      alert("Failed to schedule meeting. Please try again.");
    }"""

new_catch = """    } catch (error: any) {
      console.error("Error creating meeting:", error);
      alert(`Database Error: ${error.message || 'Failed to schedule meeting'}`);
    }"""

content = content.replace(old_catch, new_catch)

# Write it out
with open('src/pages/OneToOneMeetings.tsx', 'w') as f:
    f.write(content)

