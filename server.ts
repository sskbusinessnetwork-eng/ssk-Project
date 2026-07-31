import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import webpush from "web-push";

dotenv.config();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BC1b0zclASiN3KGw7H_kGEFcutEzj6IHL-26UPDEyuWrOAtS4vDvyzd1FXAktO7hISEV3EIFf9RP7u6U0L8NnbU";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "na13C1Sh44faY5Ogv-zXGwWN6yof1gnuWFPjt_tBOxw";

webpush.setVapidDetails(
  'mailto:sskbusinessnetwork@gmail.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);
  app.use(express.json());

  // Initialize Supabase Client
  const supabaseUrl = process.env.SUPABASE_URL || 'https://wfbkgfotpzscjyaanzpx.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYmtnZm90cHpzY2p5YWFuenB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5MzMzNjEsImV4cCI6MjA5OTUwOTM2MX0.Z_Is7xk8QdTWCTgj-L9X6Bm7s0-RTMBE9DW7o2qSHg4';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/vapidPublicKey", (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
  });

  app.post("/api/subscribe", async (req, res) => {
    try {
      const { subscription, uid } = req.body;
      if (!subscription || !uid) {
        return res.status(400).json({ error: "Missing subscription or uid" });
      }
      
      const { data: user } = await supabase.from('users').select('profile_photo').eq('id', uid).single();
      let photo = user?.profile_photo || '';
      let extraData: any = {};
      if (photo.includes('|||')) {
        const parts = photo.split('|||');
        photo = parts[0];
        try {
          extraData = JSON.parse(parts[1] || '{}');
        } catch(e) {}
      }
      extraData.push_token = subscription;
      
      const newPhoto = `${photo}|||${JSON.stringify(extraData)}`;

      const { error } = await supabase
        .from("users")
        .update({ profile_photo: newPhoto })
        .eq("id", uid);
        
      if (error) {
        console.warn("Failed to store push_token:", error);
      }
      
      res.status(201).json({ success: true });
    } catch (e: any) {
      console.error("Subscribe error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/notify", async (req, res) => {
    try {
      const { uid, payload } = req.body;
      if (!uid || !payload) return res.status(400).json({ error: "Missing uid or payload" });

      const { data } = await supabase.from("users").select("profile_photo").eq("id", uid).single();
      let photo = data?.profile_photo || '';
      let extraData: any = {};
      if (photo.includes('|||')) {
        const parts = photo.split('|||');
        try {
          extraData = JSON.parse(parts[1] || '{}');
        } catch(e) {}
      }

      if (!extraData.push_token) {
        return res.status(404).json({ error: "No push token found" });
      }

      const sub = extraData.push_token;

      await webpush.sendNotification(sub, JSON.stringify(payload));
      res.json({ success: true });
    } catch (e: any) {
      console.error("Notify error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Create User endpoint
  app.post("/api/admin/create-user", async (req, res) => {
    const { phone, password, displayName, role, adminUid } = req.body;
    try {
      const uid = crypto.randomUUID();
      // We don't write to DB here because the client-side setDoc writes the member profile.
      // But if there is any other client profile creation need, we just return the UID.
      res.json({ uid });
    } catch (err: any) {
      console.error("Error creating user:", err);
      res.status(500).json({ error: err.message || "Failed to generate UID" });
    }
  });

  // Invite Guest endpoint (Only Chapter Admin for their own chapter meeting)
  app.post("/api/guests/invite", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { newInvitation, callerId } = req.body;
      if (!newInvitation || !callerId) {
        return res.status(400).json({ success: false, error: "Missing required invitation data or caller ID." });
      }

      // 1. Verify caller in users table
      const { data: caller, error: callerErr } = await adminSupabase
        .from('users')
        .select('id, role, position, chapter_id, status, name')
        .or(`id.eq.${callerId},uid.eq.${callerId}`)
        .maybeSingle();

      if (callerErr || !caller) {
        return res.status(403).json({ success: false, error: "Unauthorized user account." });
      }

      if (caller.status !== 'ACTIVE') {
        return res.status(403).json({ success: false, error: "Account is not active." });
      }

      const isChapterAdmin = caller.role === 'CHAPTER_ADMIN' || caller.position === 'chapter_admin';
      const isMasterAdmin = caller.role === 'MASTER_ADMIN';

      if (!isChapterAdmin && !isMasterAdmin) {
        return res.status(403).json({ success: false, error: "Only Chapter Admins can invite guests." });
      }

      // 2. Verify selected meeting belongs to caller's chapter
      const { data: meeting, error: meetingErr } = await adminSupabase
        .from('meetings')
        .select('id, chapter_id, date, time, venue, location')
        .eq('id', newInvitation.meeting_id)
        .maybeSingle();

      if (meetingErr || !meeting) {
        console.error("Error verifying meeting for guest invite:", meetingErr);
        return res.status(400).json({ success: false, error: "Invalid meeting selected." });
      }

      if (!isMasterAdmin && meeting.chapter_id && caller.chapter_id && String(meeting.chapter_id).trim() !== String(caller.chapter_id).trim()) {
        return res.status(403).json({ success: false, error: "Chapter Admin can only invite guests to meetings belonging to their own chapter." });
      }

      // 3. Prepare sanitised invitation payload
      const invitePayload = {
        invited_by: caller.id,
        created_by: caller.id,
        invited_by_name: caller.name || newInvitation.invited_by_name || 'Chapter Admin',
        invited_by_chapter: caller.chapter_id,
        guest_name: newInvitation.guest_name,
        guest_phone: newInvitation.guest_phone,
        guest_whatsapp: newInvitation.guest_whatsapp,
        business_category: newInvitation.business_category,
        meeting_id: meeting.id,
        meeting_title: newInvitation.meeting_title || 'Weekly Chapter Meeting',
        meeting_date: meeting.date || newInvitation.meeting_date,
        meeting_time: meeting.time || newInvitation.meeting_time || '10:00 AM',
        venue: meeting.venue || meeting.location || newInvitation.venue || 'SSK Business Hall',
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 4. Perform insert using adminSupabase
      const { data: inserted, error: insertErr } = await adminSupabase
        .from('guest_invitations')
        .insert([invitePayload])
        .select();

      if (insertErr) {
        console.warn("Guest invitation table insert failed (likely RLS), saving to user profile fallback:", insertErr);
        try {
          const { data: userRec } = await adminSupabase
            .from('users')
            .select('profile_photo')
            .eq('id', caller.id)
            .maybeSingle();

          let photoStr = userRec?.profile_photo || '';
          let parts = photoStr.split('|||');
          let currentExtra: any = {};
          if (parts.length > 1) {
            try { currentExtra = JSON.parse(parts[1]); } catch(e) {}
          }
          let currentInvs = currentExtra.guest_invitations || [];
          const newInvItem = { ...invitePayload, id: 'inv-' + Date.now() };
          currentInvs.unshift(newInvItem);
          currentExtra.guest_invitations = currentInvs;
          
          const newPhotoStr = (parts[0] || '') + '|||' + JSON.stringify(currentExtra);
          await adminSupabase.from('users').update({ profile_photo: newPhotoStr }).eq('id', caller.id);

          return res.json({ success: true, data: [newInvItem] });
        } catch (fallbackErr) {
          console.error("Fallback guest invitation error:", fallbackErr);
        }
        return res.status(400).json({ success: false, error: insertErr.message || "Failed to save guest invitation." });
      }

      return res.json({ success: true, data: inserted });
    } catch (err: any) {
      console.error("Invite guest API error:", err);
      return res.status(500).json({ success: false, error: err.message || "An unexpected error occurred." });
    }
  });

  // Position management endpoint (Master Admin only)
  app.post("/api/admin/update-position", async (req, res) => {
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
  });

  // Update User endpoint (e.g. password resets, display names)
  
  app.post("/api/users/update", async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: "Invalid token" });

      const { uid, updates } = req.body;
      
      if (user.id !== uid) {
        const personalFields = ['name', 'email', 'phone', 'whatsapp_number', 'profile_photo', 'business_name', 'businessName', 'address', 'bio', 'photoURL', 'category', 'state', 'city', 'area', 'pincode', 'website', 'professionDesignation', 'profession_designation'];
        const hasPersonalFields = Object.keys(updates).some(k => personalFields.includes(k));
        
        if (hasPersonalFields) {
          return res.status(403).json({ error: "You can only edit your own profile." });
        }
        
        const { data: caller } = await adminSupabase.from('users').select('role').eq('id', user.id).single();
        if (!caller || (caller.role !== 'MASTER_ADMIN' && caller.role !== 'CHAPTER_ADMIN')) {
          return res.status(403).json({ error: "Unauthorized to edit other users." });
        }
      }

      if (uid.startsWith('global_')) {
        const { error: updateError } = await adminSupabase.from('users').upsert({ id: uid, ...updates }, { onConflict: 'id' });
        if (updateError) throw updateError;
      } else {
        const { error: updateError } = await adminSupabase.from('users').update(updates).eq('id', uid);
        if (updateError) throw updateError;
      }
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/update-user", async (req, res) => {
    const { uid, password, displayName } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }
    try {
      const updates: any = {};
      if (password) {
        updates.password = bcrypt.hashSync(password, 10);
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await adminSupabase
          .from("users")
          .update(updates)
          .eq("id", uid);

        if (error) throw error;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  });

  // Delete User endpoint
  app.post("/api/auth/delete-user", async (req, res) => {
    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", uid);

      if (error) throw error;

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: err.message || "Failed to delete user" });
    }
  });

  // Thank You Slips creation endpoint
  app.post("/api/thank-you-slips/create", async (req, res) => {
    try {
      const slipData = req.body || {};
      const cleanDbPayload = {
        referral_id: slipData.referral_id || slipData.referralId || null,
        from_user_id: slipData.from_user_id || slipData.fromUserId || slipData.sender_id || slipData.senderId || null,
        to_user_id: slipData.to_user_id || slipData.toUserId || slipData.receiver_id || slipData.receiverId || null,
        customer_name: slipData.customer_name || slipData.customerName || '',
        business_value: Number(slipData.business_value || slipData.businessValue || slipData.businessAmount || 0),
        notes: slipData.notes || slipData.thankYouMessage || slipData.businessDescription || '',
        created_at: slipData.created_at || slipData.createdAt || new Date().toISOString()
      };

      const { data: result, error } = await adminSupabase
        .from('thank_you_slips')
        .insert([cleanDbPayload])
        .select()
        .single();

      if (error) {
        const { data: result2, error: error2 } = await supabase
          .from('thank_you_slips')
          .insert([cleanDbPayload])
          .select()
          .single();

        if (error2) {
          console.warn("Backend insert to thank_you_slips warning:", error2);
          return res.status(200).json({ success: true, warning: error2.message, data: cleanDbPayload });
        }
        return res.json({ success: true, data: result2 });
      }

      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("Error in /api/thank-you-slips/create:", err);
      res.status(500).json({ error: err.message || "Failed to create thank you slip" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production (Standard Node server)
    const distPath = path.join(process.cwd(), "dist");
    
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  return app;
}

startServer();
