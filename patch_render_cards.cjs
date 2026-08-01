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
            <div key={i} className="p-4 bg-[#151C2E] rounded-[16px] border border-white/5 shadow-md flex flex-col gap-3 animate-pulse">
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                  <div className="w-32 h-4 bg-white/10 rounded-md" />
                </div>
                <div className="w-16 h-5 bg-white/10 rounded-md shrink-0" />
              </div>
              <div className="w-48 h-3 bg-white/5 rounded-md mt-1" />
              <div className="w-32 h-3 bg-white/5 rounded-md" />
            </div>
          ))}
        </div>
      );
    }

    if (analyticsError) {
      return (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-[20px] flex items-center justify-center mb-5 border border-red-500/20">
            <AlertTriangle className="text-red-400 w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Failed to load records</h3>
          <p className="text-neutral-400 text-sm max-w-xs mb-6">
            There was an error while preparing the data. Please try again.
          </p>
          <button 
            onClick={() => {
              setAnalyticsLoading(true);
              setAnalyticsError(false);
              setTimeout(() => setAnalyticsLoading(false), 600);
            }}
            className="px-5 py-2.5 bg-[#1E293B] hover:bg-white/10 border border-white/5 text-white rounded-[10px] font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2"
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

    const formatDate = (dateString: string) => {
      if (!dateString) return null;
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return null;
        return originalFormat(d, 'dd MMM yyyy');
      } catch (e) {
        return null;
      }
    };

    const formatTimeStr = (timeString: string, dateString: string) => {
      if (!timeString && !dateString) return null;
      try {
        if (timeString) {
          // If it's just a time like "15:00" or "15:00:00"
          if (timeString.includes(':') && !timeString.includes('T')) {
             const parts = timeString.split(':');
             const d = new Date();
             d.setHours(parseInt(parts[0], 10) || 0);
             d.setMinutes(parseInt(parts[1], 10) || 0);
             return originalFormat(d, 'h:mm a');
          }
        }
        if (dateString) {
          const d = new Date(dateString);
          if (isNaN(d.getTime())) return null;
          // check if time is explicitly set and not 00:00:00 (unless actually midnight)
          // Simplified: just return time from the Date object
          if (dateString.includes('T')) {
            return originalFormat(d, 'h:mm a');
          }
        }
        return null;
      } catch (e) {
        return null;
      }
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
          subtitle: formatRole(m.role, m.position),
          icon: <User size={20} className="text-white/70" />,
          badgeText: isSubActive ? 'Active' : 'Inactive',
          badgeColor: isSubActive ? 'emerald' : 'red',
          date: m.createdAt ? formatDate(m.createdAt) : null,
          time: null,
          notes: \`Business: \${m.businessName || m.company || '-'}\`
        };
      });
    } else if (norm.includes('chapter') && !norm.includes('meeting')) {
      records = allChapters.map(c => ({
        id: c.id,
        title: c.chapterName || c.chapter_name || c.name || 'N/A',
        subtitle: c.region || 'Region',
        icon: <Building2 size={20} className="text-white/70" />,
        badgeText: 'Active',
        badgeColor: 'blue',
        date: null,
        time: c.meetingTime || null,
        notes: \`Meeting Day: \${c.meetingDay || '-'}\`
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
          title: slip.customerName || 'Business Given',
          subtitle: norm.includes('sent') ? \`To: \${recipient?.name || slip.toUserName || 'N/A'}\` : \`From: \${giver?.name || slip.fromUserName || 'N/A'}\`,
          icon: <Briefcase size={20} className="text-white/70" />,
          badgeText: \`₹\${Number(slip.amount || 0).toLocaleString()}\`,
          badgeColor: 'emerald',
          date: slip.createdAt ? formatDate(slip.createdAt) : null,
          time: slip.createdAt ? formatTimeStr('', slip.createdAt) : null,
          notes: slip.notes || '-'
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
          title: norm.includes('sent') ? \`To: \${recipient?.name || ref.toUserName || 'N/A'}\` : \`From: \${giver?.name || ref.fromUserName || 'N/A'}\`,
          subtitle: ref.customerName || 'Referral',
          icon: <Share2 size={20} className="text-white/70" />,
          badgeText: ref.status || 'Pending',
          badgeColor: bColor,
          date: ref.createdAt ? formatDate(ref.createdAt) : null,
          time: ref.createdAt ? formatTimeStr('', ref.createdAt) : null,
          notes: ref.notes || ref.requirement || '-'
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
          icon: <Handshake size={20} className="text-white/70" />,
          badgeText: m.status || 'Scheduled',
          badgeColor: bColor,
          date: m.date || m.scheduledDate ? formatDate(m.date || m.scheduledDate) : null,
          time: formatTimeStr(m.time || m.meetingTime, m.date || m.scheduledDate),
          notes: m.notes || '-'
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
          subtitle: \`Invited By: \${inviter?.name || g.inviterName || 'N/A'}\`,
          icon: <UserPlus size={20} className="text-white/70" />,
          badgeText: g.status || 'Expected',
          badgeColor: bColor,
          date: g.visitDate ? formatDate(g.visitDate) : null,
          time: null,
          notes: g.profession ? \`Profession: \${g.profession}\` : '-'
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
        let text = t.testimonial || '';
        if (text.includes('|||')) {
          const parts = text.split('|||');
          text = parts[0];
        }
        return {
          id: t.id,
          title: norm.includes('given') ? \`To: \${receiver?.name || 'N/A'}\` : \`From: \${giver?.name || 'N/A'}\`,
          subtitle: 'Testimonial',
          icon: <Star size={20} className="text-white/70" />,
          badgeText: 'Published',
          badgeColor: 'blue',
          date: t.createdAt ? formatDate(t.createdAt) : null,
          time: t.createdAt ? formatTimeStr('', t.createdAt) : null,
          notes: text || '-'
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
          icon: <Calendar size={20} className="text-white/70" />,
          badgeText: m.status || 'Scheduled',
          badgeColor: (m.status || '').toLowerCase() === 'completed' ? 'emerald' : 'amber',
          date: m.date ? formatDate(m.date) : null,
          time: m.startTime ? \`\${m.startTime} - \${m.endTime || 'End'}\` : null,
          notes: m.location || '-'
        };
      });
    }

    if (records.length === 0) {
      return (
        <div className="py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-[#151C2E] rounded-full flex items-center justify-center mb-5 border border-white/5 shadow-inner">
            <FileText className="text-neutral-500 w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Records Found</h3>
          <p className="text-neutral-400 text-sm max-w-xs leading-relaxed">
            There are currently no activity records available for this category.
          </p>
        </div>
      );
    }

    return (
      <div className="w-full">
        {/* Desktop 2-columns, Mobile 1-column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 pb-4">
          {records.map((r: any, idx) => (
            <div 
              key={r.id || idx} 
              className="bg-[#151C2E] hover:bg-[#1A233A] rounded-[16px] border border-white/5 p-4 flex flex-col gap-4 transition-colors"
            >
              {/* Top Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center shrink-0">
                    {r.icon || <User size={20} className="text-white/70" />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-[15px] font-bold text-white truncate" title={r.title}>{r.title || 'Unknown'}</h4>
                    <span className="text-[12px] font-medium text-neutral-400 truncate" title={r.subtitle}>{r.subtitle || ''}</span>
                  </div>
                </div>
                {r.badgeText && (
                  <span className={\`px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider shrink-0 whitespace-nowrap \${
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

              {/* Date & Time Row */}
              {(r.date || r.time) && (
                <div className="flex items-center gap-4 text-[13px] text-neutral-300">
                  {r.date && (
                    <div className="flex items-center gap-1.5 bg-[#0F172A] px-2.5 py-1 rounded-md border border-white/5">
                      <span>📅</span>
                      <span className="font-medium">{r.date}</span>
                    </div>
                  )}
                  {r.time && (
                    <div className="flex items-center gap-1.5 bg-[#0F172A] px-2.5 py-1 rounded-md border border-white/5">
                      <span>🕒</span>
                      <span className="font-medium">{r.time}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Notes Row */}
              <div className="pt-3 border-t border-white/5">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1 block">Notes / Details</span>
                <p className="text-[13px] text-neutral-300 font-medium line-clamp-2 break-words leading-relaxed" title={r.notes}>
                  {r.notes || '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
`;
  
  const newCode = code.slice(0, startIdx) + replacement + code.slice(endIdx);
  fs.writeFileSync(file, newCode);
  console.log("Patched render function with cards!");
} else {
  console.log("Failed to patch.");
}
