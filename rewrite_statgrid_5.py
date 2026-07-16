with open('src/components/StatGrid.tsx', 'r') as f:
    content = f.read()

content = content.replace("export default function StatGrid({ activeMembers, referralsPassed, businessGenerated, upcomingMeetings }: StatGridProps) {", 
"""export default function StatGrid({ activeMembers, referralsPassed, businessGenerated, upcomingMeetings }: StatGridProps) {
  const stats = [
    {
      label: 'Active Partners',
      value: activeMembers || '142',
      trend: '+12%',
      trendLabel: 'vs last month',
      icon: Users,
      color: 'text-primary',
      bg: 'bg-primary/5',
      border: 'border-primary/10'
    },
    {
      label: 'Business Generated',
      value: businessGenerated || '₹4.2M+',
      trend: '+24%',
      trendLabel: 'vs last month',
      icon: IndianRupee,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/10'
    },
    {
      label: 'Referrals Passed',
      value: referralsPassed || '845',
      trend: '+8%',
      trendLabel: 'vs last month',
      icon: FileCheck,
      color: 'text-blue-600',
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/10'
    },
    {
      label: 'Upcoming Syncs',
      value: upcomingMeetings || '12',
      trend: 'Scheduled',
      trendLabel: 'next 14 days',
      icon: Calendar,
      color: 'text-amber-600',
      bg: 'bg-amber-500/5',
      border: 'border-amber-500/10'
    },
    {
      label: 'Completion Index',
      value: '94%',
      trend: '+2%',
      trendLabel: 'vs last week',
      icon: Calendar, 
      color: 'text-indigo-600',
      bg: 'bg-indigo-500/5',
      border: 'border-indigo-500/10'
    }
  ];""")

content = content.replace("const stats = [", "// replaced stats")
content = content.replace("className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full\"", "className=\"flex overflow-x-auto lg:grid lg:grid-cols-5 gap-6 w-full snap-x pb-4 lg:pb-0\"")
content = content.replace("className=\"bg-white rounded-[24px]", "className=\"min-w-[280px] lg:min-w-0 snap-start bg-white rounded-[24px]")

with open('src/components/StatGrid.tsx', 'w') as f:
    f.write(content)
