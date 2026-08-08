const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf-8');

const targetStart = "    // 8. Give Testimony Task (Assigned ONLY to the PERSON WHO SENT THE REFERRAL after the referral is updated/processed)";
const targetEnd = "    // Deduplicate rawTasks by key and label";

const startIdx = code.indexOf(targetStart);
const endIdx = code.indexOf(targetEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const newCode = `    // 8. Give Testimony Task (Assigned ONLY to the PERSON WHO SENT THE REFERRAL after receiver submits Thank You Slip)
    const sentReferrals = allReferrals.filter(r => {
      const sender = r.fromUserId || r.sender_id || r.from_user_id || r.authorMemberId || r.submitted_by;
      return String(sender || '').trim() === String(userId || '').trim();
    });

    sentReferrals.forEach(ref => {
      const receiverId = ref.toUserId || ref.receiver_id || ref.to_user_id || ref.receiverMemberId;
      
      // Check if Thank You Slip exists for this referral (meaning receiver submitted it)
      const hasThankYouSlip = allSlips.some(s => {
        const sRefId = s.referralId || s.referral_id;
        return String(sRefId || '') === String(ref.id || '');
      });

      if (hasThankYouSlip && receiverId) {
        const receiverMember = (allUsers || []).find((u: any) =>
          String(u.id || '').trim() === String(receiverId || '').trim() ||
          String(u.uid || '').trim() === String(receiverId || '').trim()
        );
        const receiverName = receiverMember?.name || (receiverMember as any)?.full_name || receiverMember?.displayName || ref.toUserName || ref.to_user_name || 'the member you referred';

        // Check if referral sender (Member A) has submitted a testimonial for this referral
        const hasSubmittedTestimonialForRef = testimonials.some(t => {
          const author = t.authorMemberId || t.author_id || t.fromUserId || t.authorId || t.from_user_id;
          if (String(author || '').trim() !== String(userId || '').trim()) return false;

          const tRefId = t.referral_id || t.referralId;
          const tReceiverId = t.receiverMemberId || t.receiver_id || t.toUserId || t.to_user_id;

          const matchRef = tRefId && String(tRefId).trim() === String(ref.id).trim();
          const matchReceiver = tReceiverId && String(tReceiverId).trim() === String(receiverId).trim();

          return Boolean(matchRef || (matchReceiver && (tRefId === String(ref.id) || !tRefId)));
        });

        rawTasks.push({
          key: \`task_give_testimonial_ref_\${ref.id}_\${dateStr}\`,
          label: \`Give Testimonial to \${receiverName}\`,
          desc: \`Give a testimonial to \${receiverName}\`,
          autoDone: hasSubmittedTestimonialForRef,
          link: hasSubmittedTestimonialForRef ? '/testimonials' : \`/testimonials?referralId=\${ref.id}&recipientId=\${receiverId}&action=new\`,
          linkText: hasSubmittedTestimonialForRef ? 'VIEW' : 'GIVE TESTIMONY',
          iconColor: 'text-indigo-400',
          bgColor: 'bg-indigo-500/10'
        });
      }
    });

`;

  const newStr = code.substring(0, startIdx) + newCode + code.substring(endIdx);
  fs.writeFileSync('src/utils/growthScore.ts', newStr);
  console.log('SUCCESS');
} else {
  console.log('TARGET NOT FOUND', {startIdx, endIdx});
}
