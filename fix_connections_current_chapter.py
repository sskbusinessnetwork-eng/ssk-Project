import re

with open("src/pages/Connections.tsx", "r") as f:
    content = f.read()

old_logic = """        // Fetch fresh logged-in user's details directly from Supabase 'users' table
        const loggedInUserId = profile?.uid || profile?.id;
        if (loggedInUserId) {
          const { data: dbUser, error: dbUserErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', loggedInUserId)
            .single();

          if (!dbUserErr && dbUser) {
            setCurrentUserChapterId(dbUser.chapter_id || null);
            setCurrentUserChapterName(dbUser.chapter_name || null);
            console.log("Fresh logged-in user chapter details fetched:", {
              chapter_id: dbUser.chapter_id,
              chapter_name: dbUser.chapter_name
            });
          } else {
            console.warn("Could not fetch fresh logged-in user from users table. Fallback to profile:", dbUserErr);
            const fallbackId = profile.chapter_id || (profile as any).chapterId || null;
            const fallbackName = profile.chapterName || (profile as any).chapter_name || null;
            setCurrentUserChapterId(fallbackId);
            setCurrentUserChapterName(fallbackName);
          }
        }

        // Fetch All Active Members from Supabase 'users' table
        const fallbackId = profile.chapter_id || (profile as any).chapterId || null;
        const currentChapterId = currentUserChapterId || fallbackId;"""

new_logic = """        // Fetch fresh logged-in user's details directly from Supabase 'users' table
        const loggedInUserId = profile?.uid || profile?.id;
        let fetchedChapterId = null;
        let fetchedChapterName = null;
        if (loggedInUserId) {
          const { data: dbUser, error: dbUserErr } = await supabase
            .from('users')
            .select('*')
            .eq('id', loggedInUserId)
            .single();

          if (!dbUserErr && dbUser) {
            fetchedChapterId = dbUser.chapter_id || null;
            fetchedChapterName = dbUser.chapter_name || null;
            setCurrentUserChapterId(fetchedChapterId);
            setCurrentUserChapterName(fetchedChapterName);
            console.log("Fresh logged-in user chapter details fetched:", {
              chapter_id: fetchedChapterId,
              chapter_name: fetchedChapterName
            });
          } else {
            console.warn("Could not fetch fresh logged-in user from users table. Fallback to profile:", dbUserErr);
            fetchedChapterId = profile.chapter_id || (profile as any).chapterId || null;
            fetchedChapterName = profile.chapterName || (profile as any).chapter_name || null;
            setCurrentUserChapterId(fetchedChapterId);
            setCurrentUserChapterName(fetchedChapterName);
          }
        }

        // Fetch All Active Members from Supabase 'users' table
        const fallbackId = profile.chapter_id || (profile as any).chapterId || null;
        const currentChapterId = fetchedChapterId || fallbackId;"""

content = content.replace(old_logic, new_logic)

with open("src/pages/Connections.tsx", "w") as f:
    f.write(content)
