const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.VITE_SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4');

async function test() {
  const chapterId = crypto.randomUUID();
  const leaderUIDs = {
    chapter_admin: crypto.randomUUID(),
    president: crypto.randomUUID(),
    vice_president: crypto.randomUUID(),
    treasurer: crypto.randomUUID(),
  };

  const chapterData = {
    id: chapterId,
    chapter_name: "test chapter 2",
    meeting_venue: "test venue 2",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error: chapterError } = await supabase.from('chapters').insert(chapterData);
  console.log("chapterError:", chapterError);
  
  if (chapterError) return;

  const positions = ['chapter_admin', 'president', 'vice_president', 'treasurer'];
  const usersToInsert = positions.map((pos, i) => {
    const uid = leaderUIDs[pos];
    const phone = "+91999999990" + i;
    return {
      id: uid,
      name: "test " + pos,
      phone: phone,
      whatsapp_number: phone,
      email: pos + "@example.com",
      password: "password123",
      role: pos === 'chapter_admin' ? 'CHAPTER_ADMIN' : 'MEMBER',
      status: 'ACTIVE',
      chapter_id: chapterId,
      position: pos,
      must_change_password: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
  
  const { error: usersError } = await supabase.from('users').insert(usersToInsert);
  console.log("usersError:", usersError);

  const { error: chapterUpdateError } = await supabase.from('chapters').update({
    chapter_admin_id: leaderUIDs.chapter_admin,
    president_id: leaderUIDs.president,
    vice_president_id: leaderUIDs.vice_president,
    treasurer_id: leaderUIDs.treasurer,
  }).eq('id', chapterId);
  console.log("chapterUpdateError:", chapterUpdateError);
}
test();
