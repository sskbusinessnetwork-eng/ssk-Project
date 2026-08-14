const fs = require('fs');
let code = fs.readFileSync('src/utils/growthScore.ts', 'utf8');

const target = `    // 7. Referral Conversion & Thank You Slip Workflow
    const receivedReferrals = allReferrals.filter(r => {
      const receiver = r.toUserId || r.receiver_id || r.to_user_id || r.receiverMemberId;
      return String(receiver || '') === String(userId) && isDateInRange(r.updated_at || r.updatedAt || r.created_at || r.createdAt || r.date);
    });

    receivedReferrals.forEach(ref => {
      const statusNorm = String(ref.status || '').toUpperCase();
      const isConverted = statusNorm === 'CONVERTED' || statusNorm === 'COMPLETED';

      // Find referring member (sender) name
      const senderId = ref.fromUserId || ref.sender_id || ref.from_user_id || ref.authorMemberId || ref.submitted_by;
      const referringMember = (allUsers || []).find((u: any) =>
        String(u.id || '').trim() === String(senderId || '').trim() ||
        String(u.uid || '').trim() === String(senderId || '').trim()
      );
      const senderName = referringMember?.name || (referringMember as any)?.full_name || referringMember?.displayName || ref.fromUserName || ref.from_user_name || 'Unknown Member';

      // Check if Thank You Slip exists for this referral
      const hasSlip = allSlips.some(s => {
        const refMatch = String(s.referralId || s.referral_id || '') === String(ref.id || '');
        const userMatch = String(s.fromUserId || s.sender_id || s.submitted_by || s.from_user_id || '') === String(userId || '');
        return refMatch || (userMatch && refMatch);
      });

      const contactOrCustomerName = ref.contactName || ref.contact_name || ref.customerName || ref.customer_name || 'Referral';

      if (!isConverted) {
        // Step 1 & Step 2: "Update Referral" task (Pending until referral status is updated to Converted)
        rawTasks.push({
          key: \`task_update_referral_\${ref.id}_\${dateStr}\`,
          label: 'Update Referral',
          desc: \`Update referral status for \${contactOrCustomerName} received from \${senderName}.\`,
          autoDone: false,
          link: '/referrals',
          linkText: 'UPDATE',
          iconColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10'
        });
      } else {
        // Step 3 & Step 4: Referral is Converted! Replace "Update Referral" with "Send Thank You Slip to <Referring Member Name>"
        rawTasks.push({
          key: \`task_thank_you_slip_\${ref.id}_\${dateStr}\`,
          label: \`Send Thank You Slip to \${senderName}\`,
          desc: \`Send a Thank You Slip to \${senderName} for converted referral (\${contactOrCustomerName}).\`,
          autoDone: hasSlip,
          link: hasSlip ? '/thank-you-slips' : \`/thank-you-slips?referralId=\${ref.id}&action=new\`,
          linkText: hasSlip ? 'VIEW' : 'SEND SLIP',
          iconColor: 'text-teal-400',
          bgColor: 'bg-teal-500/10'
        });
      }
    });

    const completedReceivedReferrals = receivedReferrals.filter(r => {
      const statusNorm = String(r.status || '').toUpperCase();
      return statusNorm === 'CONVERTED' || statusNorm === 'COMPLETED';
    });


    // 8. Give Testimony Task (Assigned ONLY to the PERSON WHO SENT THE REFERRAL after receiver submits Thank You Slip)
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
    });`;

const rep = `    // 7. Referral Conversion & Thank You Slip Workflow
    const userReceivedReferrals = allReferrals.filter(r => {
      const receiver = r.toUserId || r.receiver_id || r.to_user_id || r.receiverMemberId;
      return String(receiver || '') === String(userId);
    });

    userReceivedReferrals.forEach(ref => {
      const statusNorm = String(ref.status || '').toUpperCase();
      const isConverted = statusNorm === 'CONVERTED' || statusNorm === 'COMPLETED';
      
      const refCreatedToday = isDateInRange(ref.created_at || ref.createdAt || ref.date);
      const refConvertedToday = isConverted && isDateInRange(ref.updated_at || ref.updatedAt || ref.created_at || ref.createdAt || ref.date);

      const senderId = ref.fromUserId || ref.sender_id || ref.from_user_id || ref.authorMemberId || ref.submitted_by;
      const referringMember = (allUsers || []).find((u: any) =>
        String(u.id || '').trim() === String(senderId || '').trim() ||
        String(u.uid || '').trim() === String(senderId || '').trim()
      );
      const senderName = referringMember?.name || (referringMember as any)?.full_name || referringMember?.displayName || ref.fromUserName || ref.from_user_name || 'Unknown Member';
      const contactOrCustomerName = ref.contactName || ref.contact_name || ref.customerName || ref.customer_name || 'Referral';

      // Check if Thank You Slip exists
      const slipForRef = allSlips.find(s => {
        const refMatch = String(s.referralId || s.referral_id || '') === String(ref.id || '');
        const userMatch = String(s.fromUserId || s.sender_id || s.submitted_by || s.from_user_id || '') === String(userId || '');
        return refMatch || (userMatch && refMatch);
      });
      const slipSentToday = slipForRef && isDateInRange(slipForRef.created_at || slipForRef.createdAt || slipForRef.date);

      // Task: Update Referral
      if (refConvertedToday) {
        rawTasks.push({
          key: \`task_update_referral_\${ref.id}_\${dateStr}\`,
          label: 'Update Referral',
          desc: \`Update referral status for \${contactOrCustomerName} received from \${senderName}.\`,
          autoDone: true,
          link: '/referrals',
          linkText: 'VIEW',
          iconColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10'
        });
      } else if (refCreatedToday && !isConverted) {
        rawTasks.push({
          key: \`task_update_referral_\${ref.id}_\${dateStr}\`,
          label: 'Update Referral',
          desc: \`Update referral status for \${contactOrCustomerName} received from \${senderName}.\`,
          autoDone: false,
          link: '/referrals',
          linkText: 'UPDATE',
          iconColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10'
        });
      }

      // Task: Send Thank You Slip
      if (slipSentToday) {
        rawTasks.push({
          key: \`task_thank_you_slip_\${ref.id}_\${dateStr}\`,
          label: \`Send Thank You Slip to \${senderName}\`,
          desc: \`Send a Thank You Slip to \${senderName} for converted referral (\${contactOrCustomerName}).\`,
          autoDone: true,
          link: '/thank-you-slips',
          linkText: 'VIEW',
          iconColor: 'text-teal-400',
          bgColor: 'bg-teal-500/10'
        });
      } else if (refConvertedToday && !slipForRef) {
        rawTasks.push({
          key: \`task_thank_you_slip_\${ref.id}_\${dateStr}\`,
          label: \`Send Thank You Slip to \${senderName}\`,
          desc: \`Send a Thank You Slip to \${senderName} for converted referral (\${contactOrCustomerName}).\`,
          autoDone: false,
          link: \`/thank-you-slips?referralId=\${ref.id}&action=new\`,
          linkText: 'SEND SLIP',
          iconColor: 'text-teal-400',
          bgColor: 'bg-teal-500/10'
        });
      }
    });

    // 8. Give Testimony Task (Assigned ONLY to the PERSON WHO SENT THE REFERRAL after receiver submits Thank You Slip)
    const userSentReferrals = allReferrals.filter(r => {
      const sender = r.fromUserId || r.sender_id || r.from_user_id || r.authorMemberId || r.submitted_by;
      return String(sender || '').trim() === String(userId || '').trim();
    });

    userSentReferrals.forEach(ref => {
      const receiverId = ref.toUserId || ref.receiver_id || ref.to_user_id || ref.receiverMemberId;
      
      const slipForRef = allSlips.find(s => {
        const sRefId = s.referralId || s.referral_id;
        return String(sRefId || '') === String(ref.id || '');
      });

      if (slipForRef && receiverId) {
        const slipReceivedToday = isDateInRange(slipForRef.created_at || slipForRef.createdAt || slipForRef.date);

        const receiverMember = (allUsers || []).find((u: any) =>
          String(u.id || '').trim() === String(receiverId || '').trim() ||
          String(u.uid || '').trim() === String(receiverId || '').trim()
        );
        const receiverName = receiverMember?.name || (receiverMember as any)?.full_name || receiverMember?.displayName || ref.toUserName || ref.to_user_name || 'the member you referred';

        const testimonialForRef = testimonials.find(t => {
          const author = t.authorMemberId || t.author_id || t.fromUserId || t.authorId || t.from_user_id;
          if (String(author || '').trim() !== String(userId || '').trim()) return false;
          const tRefId = t.referral_id || t.referralId;
          const tReceiverId = t.receiverMemberId || t.receiver_id || t.toUserId || t.to_user_id;
          const matchRef = tRefId && String(tRefId).trim() === String(ref.id).trim();
          const matchReceiver = tReceiverId && String(tReceiverId).trim() === String(receiverId).trim();
          return Boolean(matchRef || (matchReceiver && (tRefId === String(ref.id) || !tRefId)));
        });

        const testimonialSentToday = testimonialForRef && isDateInRange(testimonialForRef.created_at || testimonialForRef.createdAt || testimonialForRef.date);

        if (testimonialSentToday) {
          rawTasks.push({
            key: \`task_give_testimonial_ref_\${ref.id}_\${dateStr}\`,
            label: \`Give Testimonial to \${receiverName}\`,
            desc: \`Give a testimonial to \${receiverName}\`,
            autoDone: true,
            link: '/testimonials',
            linkText: 'VIEW',
            iconColor: 'text-indigo-400',
            bgColor: 'bg-indigo-500/10'
          });
        } else if (slipReceivedToday && !testimonialForRef) {
          rawTasks.push({
            key: \`task_give_testimonial_ref_\${ref.id}_\${dateStr}\`,
            label: \`Give Testimonial to \${receiverName}\`,
            desc: \`Give a testimonial to \${receiverName}\`,
            autoDone: false,
            link: \`/testimonials?referralId=\${ref.id}&recipientId=\${receiverId}&action=new\`,
            linkText: 'GIVE TESTIMONY',
            iconColor: 'text-indigo-400',
            bgColor: 'bg-indigo-500/10'
          });
        }
      }
    });`;

if (code.includes('const receivedReferrals = allReferrals.filter(r => {')) {
  code = code.replace(target, rep);
  fs.writeFileSync('src/utils/growthScore.ts', code);
  console.log('patched');
} else {
  console.log('target not found');
}
