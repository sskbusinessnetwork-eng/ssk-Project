import re
with open('src/lib/database.ts', 'r') as f:
    content = f.read()

bad_logic = """export async function getDocs(queryRef: any) {
  const collectionPath = queryRef.path;
  
  let finalConstraints = [...(queryRef.constraints || [])];
  let meetingIdsFiltered: string[] | null = null;
  
  if (collectionPath === 'users') {
          const hasSingleIdFilter = finalConstraints.some(c => c.type === 'where' && (c.field === 'id' || c.field === 'uid' || c.field === 'phone'));
          if (!hasSingleIdFilter) {
            builder = builder.eq('chapter_id', userChapterId).neq('role', 'MASTER_ADMIN');
          }
        } else if (collectionPath === 'meetings') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'testimonials') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'guest_invitations') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'guest_registrations') {
          builder = builder.eq('chapter_id', userChapterId);
        } else if (collectionPath === 'users') {"""

good_logic = """export async function getDocs(queryRef: any) {
  const collectionPath = queryRef.path;
  let finalConstraints = [...(queryRef.constraints || [])];
  let meetingIdsFiltered: string[] | null = null;
  
  let builder = supabase.from(collectionPath).select('*');
  builder = applyQueryConstraints(builder, finalConstraints, meetingIdsFiltered);
  
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const { data: userProfile } = await supabase
      .from('users')
      .select('role, chapter_id')
      .eq('id', session.user.id)
      .single();
      
    if (userProfile && userProfile.role !== 'MASTER_ADMIN' && userProfile.chapter_id) {
      const userChapterId = userProfile.chapter_id;
      if (collectionPath === 'users') {
        const hasSingleIdFilter = finalConstraints.some(c => c.type === 'where' && (c.field === 'id' || c.field === 'uid' || c.field === 'phone'));
        if (!hasSingleIdFilter) {
          builder = builder.eq('chapter_id', userChapterId).neq('role', 'MASTER_ADMIN');
        }
      } else if (['meetings', 'testimonials', 'guest_invitations', 'guest_registrations'].includes(collectionPath)) {
        builder = builder.eq('chapter_id', userChapterId);
      }
    }
  }

  const { data, error } = await builder;
  if (error) {
    console.error("getDocs error for", collectionPath, ":", error);
    return [];
  }
  
  let rows = (data || []).map(row => keysToCamel(row));
  
  if (collectionPath === 'users') {"""

content = content.replace(bad_logic, good_logic)
with open('src/lib/database.ts', 'w') as f:
    f.write(content)
