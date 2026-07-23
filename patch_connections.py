import re

with open('src/pages/Connections.tsx', 'r') as f:
    content = f.read()

# 1. Remove the queryBuilder constraint
constraint_pattern = r"if \(profile\?\.role !== 'MASTER_ADMIN' && currentChapterId\) \{\s*queryBuilder = queryBuilder\.eq\('chapter_id', currentChapterId\);\s*\}"
content = re.sub(constraint_pattern, "", content)

# 2. Add realtime subscription
subscription_code = """
    fetchData();

    const channel = supabase
      .channel('connections_users_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    // Listen for manual re-fetch events
    const handleRefresh = () => fetchData();
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
      supabase.removeChannel(channel);
    };
"""

cleanup_pattern = r"fetchData\(\);\s*// Listen for manual re-fetch events\s*const handleRefresh = \(\) => fetchData\(\);\s*window\.addEventListener\('dashboard-refresh', handleRefresh\);\s*return \(\) => \{\s*window\.removeEventListener\('dashboard-refresh', handleRefresh\);\s*\};\s*"
content = re.sub(cleanup_pattern, subscription_code, content)

with open('src/pages/Connections.tsx', 'w') as f:
    f.write(content)
