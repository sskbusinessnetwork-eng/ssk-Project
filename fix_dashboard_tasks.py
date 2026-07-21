import re

with open('src/pages/Dashboard.tsx', 'r') as f:
    content = f.read()

# I need to add import for addYears from date-fns
if 'addYears' not in content:
    content = content.replace("import { format } from 'date-fns';", "import { format, addYears } from 'date-fns';")

# I need to add functions
functions = """
  const handleApproveRenewal = async (requestId: string, memberId: string) => {
    try {
      const newStart = new Date().toISOString();
      const newEnd = addYears(new Date(), 1).toISOString();
      
      await supabase.from('users').update({
        subscriptionStart: newStart,
        subscriptionStartDate: newStart,
        subscriptionEnd: newEnd,
        subscriptionEndDate: newEnd,
        subscriptionStatus: 'Active',
        membershipStatus: 'ACTIVE',
        renewalRequested: false
      }).eq('id', memberId);

      await supabase.from('subscription_requests').update({
        status: 'APPROVED',
        processed_date: new Date().toISOString(),
        processed_by: profile?.uid
      }).eq('id', requestId);
    } catch (e) {
      console.error('Error approving', e);
    }
  };

  const handleRejectRenewal = async (requestId: string, memberId: string) => {
    try {
      await supabase.from('subscription_requests').update({
        status: 'REJECTED',
        processed_date: new Date().toISOString(),
        processed_by: profile?.uid
      }).eq('id', requestId);
      
      await supabase.from('users').update({
        renewalRequested: false
      }).eq('id', memberId);
    } catch (e) {
      console.error('Error rejecting', e);
    }
  };
"""

# Find place to insert functions, right after `const [isChecklistHighlighted...`
if 'handleApproveRenewal' not in content:
    content = content.replace('  const [isChecklistHighlighted, setIsChecklistHighlighted] = useState(false);',
                              '  const [isChecklistHighlighted, setIsChecklistHighlighted] = useState(false);\n' + functions)


# Update chapterAdminTasks useMemo
chapterAdminTasksCode = """
  const chapterAdminTasks = useMemo(() => {
    if (profile?.role !== 'CHAPTER_ADMIN' && profile?.position !== 'chapter_admin') return [];
    const tasks: any[] = [];
    
    // Normal Chapter Admin tasks first
    tasks.push({ key: 't1', label: "Schedule Chapter Sync Assemblies", isDone: true, link: "/meetings", linkText: "View", iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare, activeClass: 'bg-[#DC143C]' });
    tasks.push({ key: 't2', label: "Moderate Guest Onboarding Protocols", isDone: true, link: "/guests", linkText: "Guests", iconColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: CheckSquare, activeClass: 'bg-[#DC143C]' });
    
    const members = chapterUsers.filter(u => u.chapter_id === profile?.chapter_id && u.role !== 'MASTER_ADMIN' && u.role !== 'CHAPTER_ADMIN' && u.position !== 'chapter_admin');

    // Subscription requests from new table
    const pendingRequests = subscriptionRequests.filter(r => r.chapter_id === profile?.chapter_id && r.status === 'PENDING');
    pendingRequests.forEach(req => {
       const member = members.find(m => m.id === req.member_id || m.uid === req.member_id);
       if (!member) return;
       tasks.push({
         key: `req_${req.id}`,
         label: `Renewal Request: ${member.name}`,
         isDone: false,
         iconColor: 'text-amber-400',
         bgColor: 'bg-amber-500/10',
         icon: Shield,
         activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]',
         details: {
           phone: member.phone || 'N/A',
           position: member.position || member.role || 'Member',
           chapterName: resolvedChapterName || 'Chapter',
           endDate: req.current_subscription_end_date ? format(new Date(req.current_subscription_end_date), 'MMM d, yyyy') : 'N/A',
           requestDate: format(new Date(req.request_date), 'MMM d, yyyy h:mm a'),
           status: 'Pending'
         },
         customActions: [
           { label: 'View Member', className: 'text-neutral-400 border-neutral-600 hover:bg-neutral-800', onClick: () => window.location.href='/subscriptions' },
           { label: 'Approve & Renew', className: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20', onClick: () => handleApproveRenewal(req.id, member.uid || member.id) },
           { label: 'Reject', className: 'text-red-400 border-red-500/30 bg-red-500/10 hover:bg-red-500/20', onClick: () => handleRejectRenewal(req.id, member.uid || member.id) }
         ]
       });
    });

    const expiringMembers = members.filter(u => {
      const endStr = u.subscriptionEndDate || u.subscriptionEnd;
      if (!endStr) return false;
      const { daysRemaining } = calculateSubscriptionDetails(endStr);
      return daysRemaining >= 0 && daysRemaining <= 30;
    });
    if (expiringMembers.length > 0) {
      tasks.push({
        key: 'expiring_members',
        label: `${expiringMembers.length} Member(s) Expiring Soon`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'VIEW',
        iconColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        icon: Clock,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    const expiredMembers = members.filter(u => {
      const endStr = u.subscriptionEndDate || u.subscriptionEnd;
      if (!endStr) return true;
      const { daysRemaining } = calculateSubscriptionDetails(endStr);
      return daysRemaining < 0;
    });
    if (expiredMembers.length > 0) {
      tasks.push({
        key: 'expired_members',
        label: `${expiredMembers.length} Member(s) Expired/No Sub`,
        isDone: false,
        link: '/subscriptions',
        linkText: 'VIEW',
        iconColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        icon: AlertTriangle,
        activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
      });
    }

    const myEndStr = profile.subscriptionEndDate || profile.subscriptionEnd;
    if (myEndStr) {
      const { daysRemaining } = calculateSubscriptionDetails(myEndStr);
      if (daysRemaining <= 30) {
        tasks.push({
          key: 'my_renewal',
          label: '⚠ Renew Your Chapter Admin Subscription',
          isDone: !!profile.renewalRequested,
          link: '#subscription-card',
          linkText: profile.renewalRequested ? 'PENDING' : 'RENEW',
          iconColor: 'text-red-500',
          bgColor: 'bg-red-500/10',
          icon: Shield,
          activeClass: 'bg-[#DC143C] border-[#DC143C] shadow-[0_0_12px_rgba(220,20,60,0.6)]'
        });
      }
    }

    return tasks;
  }, [chapterUsers, profile, subscriptionRequests, resolvedChapterName]);
"""

# Replace the previous chapterAdminTasks
content = re.sub(r'  const chapterAdminTasks = useMemo\(\(\) => \{.*?\}, \[chapterUsers, profile\]\);\n', chapterAdminTasksCode + '\n', content, flags=re.DOTALL)

with open('src/pages/Dashboard.tsx', 'w') as f:
    f.write(content)

