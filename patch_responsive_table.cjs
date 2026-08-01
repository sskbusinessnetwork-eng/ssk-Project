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
            <div key={i} className="p-5 bg-[#151C2E] rounded-[20px] border border-white/5 shadow-xl flex flex-col gap-4 animate-pulse">
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
    let columns: { key: string; label: string; isBadge?: boolean; isDate?: boolean; isAmount?: boolean }[] = [];
    let records: any[] = [];

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
      columns = [
        { key: 'name', label: 'Member Name' },
        { key: 'phone', label: 'Phone Number' },
        { key: 'role', label: 'Position' },
        { key: 'business', label: 'Business' },
        { key: 'status', label: 'Status', isBadge: true }
      ];
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
          name: m.name || 'N/A',
          phone: m.phone || 'N/A',
          role: formatRole(m.role, m.position),
          business: m.businessName || m.company || 'N/A',
          status: isSubActive ? 'Active' : 'Inactive / Expired',
          badgeColor: isSubActive ? 'emerald' : 'red'
        };
      });
    } else if (norm.includes('chapter') && !norm.includes('meeting')) {
      columns = [
        { key: 'name', label: 'Chapter Name' },
        { key: 'region', label: 'Region' },
        { key: 'meetingDay', label: 'Meeting Day' },
        { key: 'meetingTime', label: 'Meeting Time' },
        { key: 'status', label: 'Status', isBadge: true }
      ];
      records = allChapters.map(c => ({
        id: c.id,
        name: c.chapterName || c.chapter_name || c.name || 'N/A',
        region: c.region || 'N/A',
        meetingDay: c.meetingDay || 'N/A',
        meetingTime: c.meetingTime || 'N/A',
        status: 'Active',
        badgeColor: 'blue'
      }));
    } else if (norm.includes('business') || norm.includes('thank you')) {
      columns = [
        { key: 'giver', label: 'Giver' },
        { key: 'recipient', label: 'Recipient' },
        { key: 'amount', label: 'Amount', isAmount: true },
        { key: 'date', label: 'Date', isDate: true },
        { key: 'notes', label: 'Notes' }
      ];
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
          giver: giver?.name || slip.fromUserName || 'N/A',
          recipient: recipient?.name || slip.toUserName || 'N/A',
          amount: slip.amount || 0,
          date: slip.createdAt,
          notes: slip.notes || 'N/A'
        };
      });
    } else if (norm.includes('referral')) {
      columns = [
        { key: 'giver', label: 'Giver' },
        { key: 'recipient', label: 'Recipient' },
        { key: 'requirement', label: 'Requirement' },
        { key: 'date', label: 'Date', isDate: true },
        { key: 'status', label: 'Status', isBadge: true }
      ];
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
          giver: giver?.name || ref.fromUserName || 'N/A',
          recipient: recipient?.name || ref.toUserName || 'N/A',
          requirement: ref.requirement || 'N/A',
          date: ref.createdAt,
          status: ref.status || 'Pending',
          badgeColor: bColor
        };
      });
    } else if (norm.includes('one-to-one') || norm.includes('one to one')) {
      columns = [
        { key: 'sender', label: 'Initiator' },
        { key: 'receiver', label: 'Participant' },
        { key: 'location', label: 'Location' },
        { key: 'date', label: 'Date & Time' },
        { key: 'status', label: 'Status', isBadge: true }
      ];
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
          sender: sender?.name || 'Unknown',
          receiver: receiver?.name || 'Unknown',
          location: m.venue || m.meetingLocation || m.locationType || 'Online',
          date: \`\${m.date || m.scheduledDate || ''} \${m.time || m.meetingTime || ''}\`.trim() || 'N/A',
          status: m.status || 'Scheduled',
          badgeColor: bColor
        };
      });
    } else if (norm.includes('guest') || norm.includes('visitor')) {
      columns = [
        { key: 'guestName', label: 'Guest Name' },
        { key: 'profession', label: 'Profession' },
        { key: 'inviter', label: 'Invited By' },
        { key: 'date', label: 'Visit Date', isDate: true },
        { key: 'status', label: 'Status', isBadge: true }
      ];
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
          guestName: g.guestName || 'N/A',
          profession: g.profession || 'N/A',
          inviter: inviter?.name || g.inviterName || 'N/A',
          date: g.visitDate,
          status: g.status || 'Expected',
          badgeColor: bColor
        };
      });
    } else if (norm.includes('testimonial')) {
      columns = [
        { key: 'giver', label: 'Giver' },
        { key: 'recipient', label: 'Recipient' },
        { key: 'text', label: 'Testimonial' },
        { key: 'date', label: 'Date', isDate: true }
      ];
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
          giver: giver?.name || 'N/A',
          recipient: receiver?.name || 'N/A',
          text: text || 'N/A',
          date: t.createdAt
        };
      });
    } else if (norm.includes('attendance') || norm.includes('meeting') || norm === 'meetings') {
      columns = [
        { key: 'title', label: 'Meeting' },
        { key: 'type', label: 'Type' },
        { key: 'location', label: 'Location' },
        { key: 'date', label: 'Date', isDate: true },
        { key: 'status', label: 'Status', isBadge: true }
      ];
      let list = effectiveMeetings;
      const isGlobal = profile?.role === 'MASTER_ADMIN';
      
      if (!isGlobal) {
         list = list.filter(m => String(m.chapter_id) === String(profile?.chapter_id));
      }
      
      records = list.map(m => {
        return {
          id: m.id,
          title: m.title || 'Chapter Meeting',
          type: m.type || 'N/A',
          location: m.location || 'N/A',
          date: m.date,
          status: m.status || 'Scheduled',
          badgeColor: (m.status || '').toLowerCase() === 'completed' ? 'emerald' : 'amber'
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
        </div>
      );
    }

    const renderCellValue = (record: any, col: any) => {
      const val = record[col.key];
      if (col.isBadge) {
        const bColor = record.badgeColor || 'blue';
        return (
          <span className={\`px-2.5 py-1 rounded-[8px] text-[10px] font-black uppercase tracking-wider whitespace-nowrap \${
            bColor === 'emerald' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            bColor === 'red' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            bColor === 'amber' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            bColor === 'blue' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
            bColor === 'purple' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
            'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20'
          }\`}>
            {val}
          </span>
        );
      }
      if (col.isDate) {
        return <span className="whitespace-nowrap">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>;
      }
      if (col.isAmount) {
        return <span className="font-bold text-emerald-400 whitespace-nowrap">₹{Number(val || 0).toLocaleString()}</span>;
      }
      if (typeof val === 'string' && val.length > 50) {
        return <span className="line-clamp-2 max-w-xs" title={val}>{val}</span>;
      }
      return <span className="whitespace-nowrap">{val || 'N/A'}</span>;
    };

    return (
      <div className="flex flex-col w-full gap-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            {records.length} {records.length === 1 ? 'Record' : 'Records'} Found
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-[16px] border border-white/5 bg-[#0F172A] custom-scrollbar shadow-xl">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-10 bg-[#1E293B] shadow-sm">
              <tr className="border-b border-white/10">
                {columns.map(col => (
                  <th key={col.key} className="p-4 text-xs font-black text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {records.map((record, idx) => (
                <tr key={record.id || idx} className="hover:bg-white/[0.02] transition-colors duration-200">
                  {columns.map(col => (
                    <td key={col.key} className="p-4 text-sm text-white/90">
                      {renderCellValue(record, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden grid grid-cols-1 gap-4">
          {records.map((record, idx) => (
            <div key={record.id || idx} className="p-4 bg-gradient-to-br from-[#151C2E] to-[#111827] rounded-[16px] border border-white/5 shadow-lg flex flex-col gap-3">
              {columns.map(col => (
                <div key={col.key} className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-0.5 shrink-0">
                    {col.label}
                  </span>
                  <div className="text-sm text-white font-medium text-right break-words">
                    {renderCellValue(record, col)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
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
