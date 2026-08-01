const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

const startTarget = 'const renderAnalyticsDetails = () => {';
const endTarget = 'const getGreeting = () => {';
const startIdx = code.indexOf(startTarget);
const endIdx = code.indexOf(endTarget);

if (startIdx !== -1 && endIdx !== -1) {
  const replacement = `  const renderAnalyticsDetails = () => {
    if (!analyticsModalCategory) return null;

    if (analyticsLoading) {
      return (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 bg-gradient-to-b from-[#151C2E] to-[#111827] rounded-[20px] border border-white/5 shadow-xl flex flex-col gap-4 animate-pulse">
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[12px] bg-white/5 shrink-0" />
                  <div className="flex flex-col gap-2">
                    <div className="w-32 h-4 bg-white/10 rounded-md" />
                    <div className="w-24 h-3 bg-white/5 rounded-md" />
                  </div>
                </div>
                <div className="w-16 h-6 bg-white/10 rounded-md shrink-0" />
              </div>
              <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                <div className="flex justify-between">
                  <div className="w-12 h-3 bg-white/5 rounded-md" />
                  <div className="w-20 h-3 bg-white/10 rounded-md" />
                </div>
                <div className="flex justify-between">
                  <div className="w-16 h-3 bg-white/5 rounded-md" />
                  <div className="w-24 h-3 bg-white/10 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (analyticsError) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-red-500/10 rounded-[24px] flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl">
            <AlertTriangle className="text-red-400 w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Failed to load records</h3>
          <p className="text-neutral-400 text-sm max-w-sm mb-8 leading-relaxed">
            There was an error while preparing the data. Please try again.
          </p>
          <button 
            onClick={() => {
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setTimeout(() => setAnalyticsLoading(false), 600);
            }}
            className="px-6 py-3 bg-[#151C2E] hover:bg-[#1E293B] border border-white/5 text-white rounded-[12px] font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
          >
            <RotateCcw size={14} /> Retry
          </button>
        </div>
      );
    }

    const norm = analyticsModalCategory.toLowerCase().trim();
    let records = [];

    // Helper to format role
    const formatRole = (role: string, position: string) => {
      if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
      if (role === 'PRESIDENT') return 'President';
      if (role === 'VICE_PRESIDENT') return 'Vice President';
      if (role === 'TREASURER') return 'Treasurer';
      if (position && position.toLowerCase() !== 'none') return position;
      return 'Member';
    };

    if (norm.includes('member')) {
      let list = chapterUsers.filter(u => u.role !== 'MASTER_ADMIN');
      if (norm.includes('active') && !norm.includes('inactive')) {
        list = list.filter(u => isMemberActive(u));
      } else if (norm.includes('inactive')) {
        list = list.filter(u => !isMemberActive(u));
      }
      
      records = list.map(m => {
        const isSubActive = isMemberActive(m);
        return {
          id: m.uid || m.id,
          title: m.name || 'N/A',
          subtitle: m.phone || 'N/A',
          icon: <User size={18} className="text-primary" />,
          badgeText: isSubActive ? 'Active' : 'Inactive / Expired',
          badgeColor: isSubActive ? 'emerald' : 'red',
          details: [
            { label: 'Role', value: formatRole(m.role, m.position) },
            { label: 'Business', value: m.businessName || m.company || 'N/A' }
          ]
        };
      });
    } else if (norm.includes('chapter') && !norm.includes('meeting')) {
      records = allChapters.map(c => ({
        id: c.id,
        title: c.chapterName || c.chapter_name || c.name || 'N/A',
        subtitle: c.region || 'N/A',
        icon: <Building2 size={18} className="text-primary" />,
        badgeText: 'Chapter',
        badgeColor: 'blue',
        details: [
          { label: 'Meeting Day', value: c.meetingDay || 'N/A' },
          { label: 'Time', value: c.meetingTime || 'N/A' }
        ]
      }));
    } else if (norm.includes('business') || norm.includes('thank you')) {
      let list = effectiveSlips;
      const uid = String(profile?.id || profile?.uid);
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
        list = list.filter(s => String(s.fromUserId) === uid || String(s.toUserId) === uid || String(s.chapter_id) === profile?.chapter_id);
      }

      if (norm.includes('sent')) {
        list = list.filter(s => String(s.fromUserId) === uid);
      } else if (norm.includes('received')) {
        list = list.filter(s => String(s.toUserId) === uid);
      }

      records = list.map(slip => {
        const giver = allUsersList.find(u => u.uid === slip.fromUserId) || chapterUsers.find(u => u.uid === slip.fromUserId);
        const recipient = allUsersList.find(u => u.uid === slip.toUserId) || chapterUsers.find(u => u.uid === slip.toUserId);
        return {
          id: slip.id,
          title: slip.customerName || 'N/A',
          subtitle: norm.includes('sent') ? \`To: \${recipient?.name || slip.toUserName || 'N/A'}\` : \`From: \${giver?.name || slip.fromUserName || 'N/A'}\`,
          icon: <Briefcase size={18} className="text-primary" />,
          badgeText: \`₹\${Number(slip.amount || 0).toLocaleString()}\`,
          badgeColor: 'emerald',
          date: slip.createdAt ? new Date(slip.createdAt).toLocaleDateString() : 'N/A',
          details: [
            { label: 'Giver', value: giver?.name || slip.fromUserName || 'N/A' },
            { label: 'Recipient', value: recipient?.name || slip.toUserName || 'N/A' },
            { label: 'Notes', value: slip.notes || 'N/A' }
          ]
        };
      });
    } else if (norm.includes('referral')) {
      let list = effectiveReferrals;
      const uid = String(profile?.id || profile?.uid);
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
        list = list.filter(s => String(s.fromUserId) === uid || String(s.toUserId) === uid || String(s.chapter_id) === profile?.chapter_id);
      }

      if (norm.includes('sent')) {
        list = list.filter(s => String(s.fromUserId) === uid);
      } else if (norm.includes('received')) {
        list = list.filter(s => String(s.toUserId) === uid);
      }

      records = list.map(ref => {
        const giver = allUsersList.find(u => u.uid === ref.fromUserId) || chapterUsers.find(u => u.uid === ref.fromUserId);
        const recipient = allUsersList.find(u => u.uid === ref.toUserId) || chapterUsers.find(u => u.uid === ref.toUserId);
        const st = (ref.status || '').toLowerCase();
        let bColor = 'amber';
        if (st === 'closed' || st === 'completed') bColor = 'emerald';
        if (st === 'cancelled') bColor = 'red';

        return {
          id: ref.id,
          title: ref.customerName || 'N/A',
          subtitle: ref.requirement || 'N/A',
          icon: <Share2 size={18} className="text-primary" />,
          badgeText: ref.status || 'Pending',
          badgeColor: bColor,
          date: ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : 'N/A',
          details: [
            { label: 'Giver', value: giver?.name || ref.fromUserName || 'N/A' },
            { label: 'Recipient', value: recipient?.name || ref.toUserName || 'N/A' },
            { label: 'Notes', value: ref.notes || 'N/A' }
          ]
        };
      });
    } else if (norm.includes('one-to-one') || norm.includes('one to one')) {
      let list = effectiveOneToOnes;
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
         list = list.filter(m => {
            const orgId = String(m.organizer_id || m.creatorId || '');
            const pIds = (m.participantIds || []).map((id: string) => String(id));
            if (usePersonalStats) {
                const uid = String(profile?.id || profile?.uid);
                return orgId === uid || pIds.includes(uid);
            }
            return String(m.chapter_id) === String(profile?.chapter_id);
         });
      }
      
      records = list.map(m => {
        const senderId = String(m.sender_id || m.organizer_id || m.creatorId || '');
        const receiverId = String(m.receiver_id || m.member_id || (m.participantIds && m.participantIds[0]) || '');
        const sender = allUsersList.find(u => String(u.uid) === senderId) || chapterUsers.find(u => String(u.uid) === senderId);
        const receiver = allUsersList.find(u => String(u.uid) === receiverId) || chapterUsers.find(u => String(u.uid) === receiverId);
        
        const st = (m.status || '').toLowerCase();
        let bColor = 'amber';
        if (st === 'completed') bColor = 'emerald';
        if (st === 'cancelled') bColor = 'red';

        return {
          id: m.id,
          title: \`\${sender?.name || 'Unknown'} & \${receiver?.name || 'Unknown'}\`,
          subtitle: m.venue || m.meetingLocation || m.locationType || 'Online',
          icon: <Handshake size={18} className="text-primary" />,
          badgeText: m.status || 'Scheduled',
          badgeColor: bColor,
          date: \`\${m.date || m.scheduledDate || ''} \${m.time || m.meetingTime || ''}\`.trim() || 'N/A',
          details: [
            { label: 'Notes', value: m.notes || 'N/A' }
          ]
        };
      });
    } else if (norm.includes('guest') || norm.includes('visitor')) {
      let list = effectiveGuestInvitations;
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
        list = list.filter(g => {
            if (usePersonalStats) {
               return String(g.inviterId) === String(profile?.id || profile?.uid);
            }
            return String(g.chapter_id) === String(profile?.chapter_id);
        });
      }
      
      records = list.map(g => {
        const inviter = allUsersList.find(u => String(u.uid) === String(g.inviterId)) || chapterUsers.find(u => String(u.uid) === String(g.inviterId));
        const st = (g.status || '').toLowerCase();
        let bColor = 'amber';
        if (st === 'attended') bColor = 'emerald';
        if (st === 'no-show') bColor = 'red';

        return {
          id: g.id,
          title: g.guestName || 'N/A',
          subtitle: g.profession || 'N/A',
          icon: <UserPlus size={18} className="text-primary" />,
          badgeText: g.status || 'Expected',
          badgeColor: bColor,
          date: g.visitDate ? new Date(g.visitDate).toLocaleDateString() : 'N/A',
          details: [
            { label: 'Inviter', value: inviter?.name || g.inviterName || 'N/A' }
          ]
        };
      });
    } else if (norm.includes('testimonial')) {
      let list = effectiveTestimonials;
      const isGlobal = profile?.role === 'MASTER_ADMIN';

      if (!isGlobal) {
         list = list.filter(t => String(t.chapter_id) === String(profile?.chapter_id));
      }

      if (norm.includes('given')) {
        list = list.filter(s => s.giverId === (profile?.uid || profile?.id));
      } else if (norm.includes('received')) {
        list = list.filter(s => s.receiverId === (profile?.uid || profile?.id));
      }

      records = list.map(t => {
        const giver = allUsersList.find(u => String(u.uid) === String(t.giverId)) || chapterUsers.find(u => String(u.uid) === String(t.giverId));
        const receiver = allUsersList.find(u => String(u.uid) === String(t.receiverId)) || chapterUsers.find(u => String(u.uid) === String(t.receiverId));
        let extraData: any = {};
        let text = t.testimonial || '';
        if (text.includes('|||')) {
          const parts = text.split('|||');
          text = parts[0];
          try { extraData = JSON.parse(parts[1] || '{}'); } catch (e) {}
        }
        return {
          id: t.id,
          title: (extraData && extraData.title) ? extraData.title : 'Testimonial',
          subtitle: norm.includes('given') ? \`To: \${receiver?.name || 'N/A'}\` : \`From: \${giver?.name || 'N/A'}\`,
          icon: <Star size={18} className="text-primary" />,
          badgeText: 'Published',
          badgeColor: 'blue',
          date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A',
          details: [
            { label: 'Giver', value: giver?.name || 'N/A' },
            { label: 'Recipient', value: receiver?.name || 'N/A' },
            { label: 'Text', value: text || 'N/A' }
          ]
        };
      });
    } else if (norm.includes('attendance') || norm.includes('meeting') || norm === 'meetings') {
      let list = effectiveMeetings;
      const isGlobal = profile?.role === 'MASTER_ADMIN';
      
      if (!isGlobal) {
         list = list.filter(m => String(m.chapter_id) === String(profile?.chapter_id));
      }
      
      records = list.map(m => {
        return {
          id: m.id,
          title: m.title || 'Chapter Meeting',
          subtitle: m.type || 'N/A',
          icon: <Calendar size={18} className="text-primary" />,
          badgeText: m.status || 'Scheduled',
          badgeColor: (m.status || '').toLowerCase() === 'completed' ? 'emerald' : 'amber',
          date: m.date ? new Date(m.date).toLocaleDateString() : 'N/A',
          details: [
            { label: 'Location', value: m.location || 'N/A' },
            { label: 'Time', value: \`\${m.startTime || ''} - \${m.endTime || ''}\`.trim() || 'N/A' }
          ]
        };
      });
    }

    if (records.length === 0) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 bg-[#151C2E] rounded-[24px] flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
            <Search className="text-primary w-10 h-10 opacity-50" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Records Found</h3>
          <p className="text-neutral-400 text-sm max-w-sm mb-8 leading-relaxed">
            There are currently no records available for this category. New activities will appear here automatically.
          </p>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('dashboard-refresh'))}
            className="px-6 py-3 bg-[#151C2E] hover:bg-[#1E293B] border border-white/5 text-white rounded-[12px] font-bold text-xs uppercase tracking-wider transition-all shadow-lg"
          >
            Refresh Dashboard
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {records.map((r: any, idx) => (
          <div key={r.id || idx} className="p-5 bg-gradient-to-b from-[#151C2E] to-[#111827] rounded-[20px] border border-white/5 shadow-xl hover:shadow-2xl hover:border-primary/20 transition-all flex flex-col gap-4 group">
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-[12px] bg-[#0F172A] border border-white/5 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                  {r.icon || <FileText size={18} className="text-primary" />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate" title={r.title}>{r.title || 'N/A'}</h4>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest truncate mt-0.5" title={r.subtitle}>{r.subtitle || 'N/A'}</p>
                </div>
              </div>
              {r.badgeText && (
                <span className={\`px-2.5 py-1 rounded-[8px] text-[10px] font-black uppercase tracking-wider shrink-0 \${
                  r.badgeColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  r.badgeColor === 'red' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  r.badgeColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  r.badgeColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
                }\`}>
                  {r.badgeText}
                </span>
              )}
            </div>
            
            {(r.date || (r.details && r.details.length > 0)) && (
              <div className="pt-4 border-t border-white/5 flex flex-col gap-2.5">
                {r.date && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px]">Date</span>
                    <span className="text-neutral-300 font-medium">{r.date}</span>
                  </div>
                )}
                {r.details && r.details.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-start gap-4 text-xs">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider text-[9px] mt-0.5 shrink-0">{d.label}</span>
                    <span className="text-neutral-300 font-medium text-right break-words line-clamp-2" title={d.value}>{d.value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };
`;
  
  const newCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  fs.writeFileSync(file, newCode);
  console.log("Patched render function!");
} else {
  console.log("Failed to patch.");
}
