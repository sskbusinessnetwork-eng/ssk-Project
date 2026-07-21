import re

with open('src/components/MemberCompanionView.tsx', 'r') as f:
    content = f.read()

new_handle = """  const handleRequestRenewal = async () => {
    if (!profile) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const chapterId = (profile as any).chapterId || (profile as any).chapter_id;
      
      let chapterAdminId = null;
      if (chapterId) {
        const { data: admins } = await supabase
          .from('users')
          .select('id, uid')
          .eq('chapter_id', chapterId)
          .in('role', ['CHAPTER_ADMIN']);
        
        if (admins && admins.length > 0) {
          chapterAdminId = admins[0].id || admins[0].uid;
        }
      }

      // Insert into subscription_requests
      const endDate = profile.subscriptionEndDate || profile.subscriptionEnd;
      
      await supabase.from('subscription_requests').insert({
        member_id: profile.id || profile.uid,
        chapter_id: chapterId,
        chapter_admin_id: chapterAdminId,
        current_subscription_end_date: endDate,
        status: 'PENDING'
      });

      // Update user flag as well for backward compatibility in UI
      await databaseService.update('users', profile.uid || profile.id, {
        renewalRequested: true,
        renewalRequestedAt: new Date().toISOString()
      });

      setSuccessMsg('Request Sent');
    } catch (err: any) {
      console.error('Error submitting renewal request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
"""

content = re.sub(r'  const handleRequestRenewal = async \(\) => \{.*?finally \{\n      setIsSubmitting\(false\);\n    \}\n  \};\n', new_handle, content, flags=re.DOTALL)

with open('src/components/MemberCompanionView.tsx', 'w') as f:
    f.write(content)
