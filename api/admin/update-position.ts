import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BC1b0zclASiN3KGw7H_kGEFcutEzj6IHL-26UPDEyuWrOAtS4vDvyzd1FXAktO7hISEV3EIFf9RP7u6U0L8NnbU";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "na13C1Sh44faY5Ogv-zXGwWN6yof1gnuWFPjt_tBOxw";

webpush.setVapidDetails(
  'mailto:sskbusinessnetwork@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const supabaseUrl = process.env.SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey as string);
const supabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY as string);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', success: false });
  }

  
    res.setHeader('Content-Type', 'application/json');
    try {
      const token = req.headers.authorization?.split(" ")[1];
      const { targetUserId, newPosition, chapterId, callerId } = req.body;

      if (!targetUserId || !newPosition) {
        return res.status(400).json({ success: false, error: "Missing targetUserId or newPosition" });
      }

      let isMasterAdmin = false;
      let callerName = 'Master Admin';
      let authUserId = 'master_admin';

      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) {
          authUserId = user.id;
          const { data: caller } = await adminSupabase
            .from('users')
            .select('id, role, name')
            .eq('id', user.id)
            .maybeSingle();

          if (caller && caller.role === 'MASTER_ADMIN') {
            isMasterAdmin = true;
            callerName = caller.name || 'Master Admin';
          } else {
            const { data: ma } = await adminSupabase
              .from('master_admins')
              .select('id, role, name')
              .eq('id', user.id)
              .maybeSingle();
            if (ma) {
              isMasterAdmin = true;
              callerName = ma.name || 'Master Admin';
            }
          }
        }
      }

      if (!isMasterAdmin && callerId) {
        const { data: caller } = await adminSupabase
          .from('users')
          .select('id, role, name')
          .eq('id', callerId)
          .maybeSingle();

        if (caller && caller.role === 'MASTER_ADMIN') {
          isMasterAdmin = true;
          callerName = caller.name || 'Master Admin';
          authUserId = caller.id;
        } else {
          const { data: ma } = await adminSupabase
            .from('master_admins')
            .select('id, role, name')
            .eq('id', callerId)
            .maybeSingle();
          if (ma) {
            isMasterAdmin = true;
            callerName = ma.name || 'Master Admin';
            authUserId = ma.id;
          }
        }
      }

      // If token wasn't provided or didn't resolve, but caller header or general session exists, check if callerId or token exists
      if (!isMasterAdmin) {
        // Fallback: check if caller has MASTER_ADMIN role in database
        return res.status(403).json({ success: false, error: "Only the Master Admin can assign or change positions." });
      }

      const normalizedInput = String(newPosition).toLowerCase().trim().replace(/[\s-]/g, '_');

      let chapterPosVal = 'MEMBER';
      let posVal = 'member';
      let roleVal = 'MEMBER';

      if (normalizedInput === 'chapter_admin') {
        chapterPosVal = 'CHAPTER_ADMIN';
        posVal = 'chapter_admin';
        roleVal = 'CHAPTER_ADMIN';
      } else if (normalizedInput === 'president') {
        chapterPosVal = 'PRESIDENT';
        posVal = 'president';
        roleVal = 'MEMBER';
      } else if (normalizedInput === 'vice_president' || normalizedInput === 'vice-president') {
        chapterPosVal = 'VICE_PRESIDENT';
        posVal = 'vice_president';
        roleVal = 'MEMBER';
      } else if (normalizedInput === 'treasurer') {
        chapterPosVal = 'TREASURER';
        posVal = 'treasurer';
        roleVal = 'MEMBER';
      } else {
        chapterPosVal = 'MEMBER';
        posVal = 'member';
        roleVal = 'MEMBER';
      }

      // Helper function to resolve exact member position key
      const resolveMemberPosKey = (m: any): string => {
        if (!m) return 'member';
        const p = String(m.position || '').toLowerCase().trim().replace(/[\s-]/g, '_');
        const c = String(m.chapter_position || '').toLowerCase().trim().replace(/[\s-]/g, '_');
        const r = String(m.role || '').toLowerCase().trim().replace(/[\s-]/g, '_');

        if (p === 'chapter_admin' || c === 'chapter_admin' || r === 'chapter_admin') {
          return 'chapter_admin';
        }
        if (p === 'president' || c === 'president') {
          return 'president';
        }
        if (p === 'vice_president' || c === 'vice_president') {
          return 'vice_president';
        }
        if (p === 'treasurer' || c === 'treasurer') {
          return 'treasurer';
        }
        return 'member';
      };

      // 1. Fetch target user to verify and get chapter_id
      const { data: targetUser, error: targetErr } = await adminSupabase
        .from('users')
        .select('id, chapter_id, role, position, chapter_position, name')
        .eq('id', targetUserId)
        .single();

      if (targetErr || !targetUser) {
        return res.status(404).json({ success: false, error: "Target member not found" });
      }

      const targetChapterId = chapterId || targetUser.chapter_id;

      // Preserve MASTER_ADMIN system role if target is Master Admin
      if (targetUser.role === 'MASTER_ADMIN') {
        roleVal = 'MASTER_ADMIN';
      }

      // 2. ONE POSITION PER CHAPTER RULE
      // If assigning a leadership position (not regular 'member'), demote existing holders of this exact position in the SAME chapter.
      if (posVal !== 'member' && targetChapterId) {
        const { data: chapterMembers } = await adminSupabase
          .from('users')
          .select('id, role, position, chapter_position, name')
          .eq('chapter_id', targetChapterId);

        if (chapterMembers && chapterMembers.length > 0) {
          for (const member of chapterMembers) {
            if (member.id !== targetUserId) {
              const currentMemberPosKey = resolveMemberPosKey(member);

              if (currentMemberPosKey === posVal) {
                // Reassign existing holder of this position in this chapter to regular 'MEMBER'
                const demoteRole = member.role === 'MASTER_ADMIN' ? 'MASTER_ADMIN' : 'MEMBER';
                const { error: demoteErr } = await adminSupabase
                  .from('users')
                  .update({ 
                    role: demoteRole, 
                    chapter_position: 'MEMBER',
                    position: 'member'
                  })
                  .eq('id', member.id);

                if (demoteErr) {
                  console.error("Failed to demote existing position holder:", demoteErr);
                  return res.status(500).json({ success: false, error: "Failed to demote existing position holder in chapter: " + (demoteErr.message || '') });
                }

                // Log history for demoted user
                try {
                  await adminSupabase.from('position_history').insert({
                    date: new Date().toISOString(),
                    changed_by_id: authUserId,
                    changed_by_name: callerName,
                    member_id: member.id,
                    member_name: member.name || 'Member',
                    old_position: currentMemberPosKey,
                    new_position: 'member',
                    chapter_id: targetChapterId
                  });
                } catch (e) {
                  // Ignore optional history table errors
                }
              }
            }
          }
        }
      }

      // 3. Assign target user to selected position/role
      const { error: updateErr } = await adminSupabase
        .from('users')
        .update({ 
          role: roleVal, 
          chapter_position: chapterPosVal,
          position: posVal
        })
        .eq('id', targetUserId);

      if (updateErr) {
        console.error("SUPABASE UPDATE ERROR:", updateErr); console.error("SUPABASE UPDATE ERR:", updateErr);
        console.error("Failed to update target user position:", updateErr);
        return res.status(500).json({ success: false, error: updateErr.message || "Failed to update member position" });
      }

      // 3b. Update Chapter Admin reference for all members of the chapter
      if (chapterPosVal === 'CHAPTER_ADMIN' && targetChapterId) {
        const { error: chapterMembersUpdateErr } = await adminSupabase
          .from('users')
          .update({
            admin_id: targetUserId,
            created_by: targetUserId,
            created_by_name: targetUser.name || 'Chapter Admin'
          })
          .eq('chapter_id', targetChapterId);
          
        if (chapterMembersUpdateErr) {
          console.error("Failed to update chapter members with new chapter admin:", chapterMembersUpdateErr);
        }
      }

      // 4. Keep chapters table leadership IDs in sync for targetChapterId
      if (targetChapterId) {
        const { data: updatedChapterUsers } = await adminSupabase
          .from('users')
          .select('id, role, position, chapter_position')
          .eq('chapter_id', targetChapterId);

        if (updatedChapterUsers) {
          const findIdForPos = (targetKey: string) => {
            const u = updatedChapterUsers.find(m => resolveMemberPosKey(m) === targetKey);
            return u ? u.id : null;
          };

          await adminSupabase.from('chapters').update({
            chapter_admin_id: findIdForPos('chapter_admin'),
            president_id: findIdForPos('president'),
            vice_president_id: findIdForPos('vice_president'),
            treasurer_id: findIdForPos('treasurer')
          }).eq('id', targetChapterId);
        }
      }

      // 5. Log history for assigned user
      try {
        await adminSupabase.from('position_history').insert({
          date: new Date().toISOString(),
          changed_by_id: authUserId,
          changed_by_name: callerName,
          member_id: targetUserId,
          member_name: targetUser.name || 'Member',
          old_position: resolveMemberPosKey(targetUser),
          new_position: posVal,
          chapter_id: targetChapterId
        });
      } catch (e) {
        // Ignore optional history table errors
      }

      return res.json({ success: true, message: "Position updated successfully", targetUserId, newPosition: posVal, newRole: roleVal });
    } catch (e: any) {
      console.error("Error in update-position handler:", e);
      return res.status(500).json({ success: false, error: e.message || "Server error updating position" });
    }
  
}
