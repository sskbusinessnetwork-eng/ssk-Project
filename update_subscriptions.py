import re

with open('src/pages/ManageSubscriptions.tsx', 'r') as f:
    content = f.read()

# For users filtering: 
# If Master Admin -> Only Chapter Admins across all chapters
# If Chapter Admin -> Only their chapter members (except Master Admin, and except Chapter Admin themselves?) 
# Wait, Chapter Admins see their members. Do they see their own Chapter Admin subscription there? The prompt says "Chapter Admin reviews and renews the member's subscription."

# Let's update `fetchUsers` and `unsubUsers` logic.

new_fetch_users = """
    const fetchUsers = async () => {
      let query = supabase.from('users').select('*');
      if (profile.role === 'MASTER_ADMIN') {
        // Master admin only sees Chapter Admins
        query = query.in('role', ['CHAPTER_ADMIN']);
        // Note: Or position === 'chapter_admin', which we will filter in JS to be safe.
      } else {
        // Chapter Admin sees their chapter
        query = query.eq('chapter_id', profile.chapter_id);
      }
      
      const { data, error } = await query;
      if (!error && data) {
        setUsers(data as UserProfile[]);
      }
      setLoading(false);
    };
"""

content = re.sub(r'const fetchUsers = async \(\) => \{.*?\};\n', new_fetch_users, content, flags=re.DOTALL)

# Update constraints
new_constraints = """
    // Listen to changes
    let constraints = [];
    if (profile.role !== 'MASTER_ADMIN') {
      constraints = [{ type: 'where', field: 'chapter_id', operator: '==', value: profile.chapter_id }];
    }
"""

content = re.sub(r'let constraints = \[\];\n    if \(profile\.role !== \'MASTER_ADMIN\'\) \{.*?\}', new_constraints, content, flags=re.DOTALL)


# Update filteredUsers memo
filtered_users_logic = """
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Master Admin: Only show Chapter Admins
      if (profile?.role === 'MASTER_ADMIN') {
        if (u.role !== 'CHAPTER_ADMIN' && u.position !== 'chapter_admin') return false;
      } else {
        // Chapter Admin: Show normal members (excluding Master Admin and Chapter Admin)
        if (u.role === 'MASTER_ADMIN' || u.role === 'CHAPTER_ADMIN' || u.position === 'chapter_admin') return false;
      }
      
      const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || 
"""

content = re.sub(
    r'  const filteredUsers = useMemo\(\(\) => \{\n    return users\.filter\(u => \{\n      if \(u\.role === \'MASTER_ADMIN\'\) return false;\n      \n      const matchesSearch = u\.name\?\.toLowerCase\(\)\.includes\(search\.toLowerCase\(\)\) \|\|',
    filtered_users_logic,
    content,
    flags=re.DOTALL
)

with open('src/pages/ManageSubscriptions.tsx', 'w') as f:
    f.write(content)
