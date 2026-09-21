import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import webpush from "web-push";

dotenv.config({ quiet: true });

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BC1b0zclASiN3KGw7H_kGEFcutEzj6IHL-26UPDEyuWrOAtS4vDvyzd1FXAktO7hISEV3EIFf9RP7u6U0L8NnbU";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "na13C1Sh44faY5Ogv-zXGwWN6yof1gnuWFPjt_tBOxw";

try {
  webpush.setVapidDetails(
    'mailto:sskbusinessnetwork@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (vapidErr) {
  console.warn("VAPID details setup notice:", vapidErr);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set('trust proxy', true);
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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

  // Invite Guest endpoint (Members, Chapter Admins, Position Holders)
  app.post("/api/guests/invite", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { newInvitation, callerId } = req.body || {};
      if (!newInvitation || !callerId) {
        return res.status(400).json({
          success: false,
          message: "Missing required invitation data or caller ID.",
          error: "Missing required invitation data or caller ID."
        });
      }

      // 1. Verify caller in users table
      let caller: any = null;
      try {
        const { data: c1 } = await adminSupabase
          .from('users')
          .select('*')
          .eq('id', callerId)
          .maybeSingle();
        if (c1) {
          caller = c1;
        } else {
          const { data: c2 } = await adminSupabase
            .from('users')
            .select('*')
            .eq('uid', callerId)
            .maybeSingle();
          if (c2) caller = c2;
        }
      } catch (cErr) {
        console.warn("User lookup in /api/guests/invite notice:", cErr);
      }

      // If caller found, verify active & non-master status
      if (caller) {
        const uStatus = caller.status ? String(caller.status).toUpperCase() : 'ACTIVE';
        if (uStatus !== 'ACTIVE' && uStatus !== 'APPROVED') {
          return res.status(403).json({
            success: false,
            message: "Account is not active.",
            error: "Account is not active."
          });
        }

        if (caller.role === 'MASTER_ADMIN') {
          return res.status(403).json({
            success: false,
            message: "Master Admin cannot invite guests.",
            error: "Master Admin cannot invite guests."
          });
        }
      } else {
        // Construct fallback caller info if user DB query had issue
        caller = {
          id: callerId,
          name: newInvitation.invited_by_name || 'Member',
          role: newInvitation.invited_by_role || 'Member',
          chapter_id: newInvitation.chapter_id || newInvitation.invited_by_chapter || ''
        };
      }

      const callerChapId = caller.chapter_id || caller.chapterId || caller.adminId || newInvitation.chapter_id || newInvitation.invited_by_chapter;

      // 2. Verify selected meeting
      let meeting: any = null;
      if (newInvitation.meeting_id) {
        try {
          const { data: mData } = await adminSupabase
            .from('meetings')
            .select('id, chapter_id, date, time, venue, location')
            .eq('id', newInvitation.meeting_id)
            .maybeSingle();
          if (mData) meeting = mData;
        } catch (mErr) {
          console.warn("Meeting lookup in /api/guests/invite notice:", mErr);
        }
      }

      if (meeting && meeting.chapter_id && callerChapId && String(meeting.chapter_id).trim() !== String(callerChapId).trim() && caller.role !== 'MASTER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: "You can only invite guests to meetings belonging to your own chapter.",
          error: "You can only invite guests to meetings belonging to your own chapter."
        });
      }

      const formatRole = (pos?: string, role?: string) => {
        if (pos && typeof pos === 'string' && pos.trim()) {
          const pLower = pos.trim().toLowerCase();
          if (pLower === 'president') return 'President';
          if (pLower === 'vice_president' || pLower === 'vice president') return 'Vice President';
          if (pLower === 'treasurer') return 'Treasurer';
          if (pLower === 'secretary') return 'Secretary';
          if (pLower === 'chapter_admin' || pLower === 'chapter admin') return 'Chapter Admin';
          if (pLower === 'member') return 'Member';
          return pos.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
        return 'Member';
      };

      const callerRole = formatRole(caller.position, caller.role);

      // Phone Normalization and Member Verification
      const normalizeDigits = (p?: string | null) => {
        if (!p) return '';
        const str = String(p).replace(/\D/g, '');
        return str.length >= 10 ? str.slice(-10) : str;
      };

      const isSamePhoneServer = (p1?: string | null, p2?: string | null) => {
        const d1 = normalizeDigits(p1);
        const d2 = normalizeDigits(p2);
        return Boolean(d1 && d2 && d1.length >= 10 && d2.length >= 10 && d1 === d2);
      };

      const rawGuestPhone = newInvitation.guest_phone || newInvitation.phone || newInvitation.mobile;
      const guestDigits = normalizeDigits(rawGuestPhone);

      if (!guestDigits || guestDigits.length < 10) {
        return res.status(400).json({
          success: false,
          error: "INVALID_PHONE_NUMBER",
          message: "Please provide a valid 10-digit phone number for the guest."
        });
      }

      // 1. Check all member types (Regular Member, Chapter Admin, President, Vice President, Treasurer, Secretary, Position Holders)
      try {
        const { data: uList } = await adminSupabase.from('users').select('*');
        if (uList && uList.length > 0) {
          for (const u of uList) {
            const userPhones: any[] = [
              u.phone,
              u.mobile,
              u.phoneNumber,
              u.phone_number,
              u.whatsapp,
              u.whatsapp_number,
              u.contactPhone
            ];

            if (u.profile_photo && typeof u.profile_photo === 'string' && u.profile_photo.includes('|||')) {
              try {
                const extra = JSON.parse(u.profile_photo.split('|||')[1] || '{}');
                if (extra.phone) userPhones.push(extra.phone);
                if (extra.mobile) userPhones.push(extra.mobile);
                if (extra.whatsapp) userPhones.push(extra.whatsapp);
              } catch (e) {}
            }

            const isMemberMatch = userPhones.some(p => isSamePhoneServer(p, rawGuestPhone));
            if (isMemberMatch) {
              const memberName = u.name || u.full_name || u.displayName || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Member';
              const memberPosition = formatRole(u.position || u.chapter_position || u.role, u.role);
              
              return res.status(409).json({
                success: false,
                error: "MEMBER_CANNOT_BE_GUEST",
                message: `${memberName} is already a member (${memberPosition}) and cannot be added as a guest.`,
                memberName,
                memberPosition
              });
            }
          }
        }
      } catch (uErr) {
        console.warn("Users lookup for guest validation notice:", uErr);
      }

      // 2. Duplicate guest check for same meeting
      if (newInvitation.meeting_id) {
        try {
          const { data: existingGuests } = await adminSupabase
            .from('guest_invitations')
            .select('id, guest_phone, guest_whatsapp, meeting_id')
            .eq('meeting_id', newInvitation.meeting_id);
            
          if (existingGuests && existingGuests.length > 0) {
            const isDuplicate = existingGuests.some((g: any) => 
              isSamePhoneServer(g.guest_phone, rawGuestPhone) || isSamePhoneServer(g.guest_whatsapp, rawGuestPhone)
            );
            if (isDuplicate) {
              return res.status(409).json({
                success: false,
                error: "GUEST_ALREADY_INVITED",
                message: "This guest has already been invited to this meeting."
              });
            }
          }
        } catch (gErr) {
          console.warn("Guest duplicate check notice:", gErr);
        }
      }

      // 3. Prepare sanitized invitation payload
      const invitePayload = {
        invited_by: caller.id || callerId,
        invited_by_user_id: caller.id || callerId,
        created_by: caller.id || callerId,
        invited_by_name: caller.name || newInvitation.invited_by_name || 'Member',
        invited_by_role: newInvitation.invited_by_role || callerRole,
        chapter_id: caller.chapter_id || (meeting ? meeting.chapter_id : newInvitation.chapter_id),
        invited_by_chapter: caller.chapter_id || (meeting ? meeting.chapter_id : newInvitation.chapter_id),
        chapter_name: newInvitation.chapter_name || '',
        guest_name: newInvitation.guest_name,
        guest_phone: newInvitation.guest_phone,
        guest_whatsapp: newInvitation.guest_whatsapp,
        business_category: newInvitation.business_category,
        meeting_id: meeting ? meeting.id : newInvitation.meeting_id,
        meeting_title: newInvitation.meeting_title || 'Weekly Chapter Meeting',
        meeting_date: (meeting && meeting.date) || newInvitation.meeting_date,
        meeting_time: (meeting && meeting.time) || newInvitation.meeting_time || '10:00 AM',
        venue: (meeting && (meeting.venue || meeting.location)) || newInvitation.venue || 'SSK Business Hall',
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
        console.warn("Guest invitation table insert failed, using fallback:", insertErr.message || insertErr);
        try {
          const { data: userRec } = await adminSupabase
            .from('users')
            .select('profile_photo')
            .eq('id', caller.id || callerId)
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
          await adminSupabase.from('users').update({ profile_photo: newPhotoStr }).eq('id', caller.id || callerId);

          return res.json({
            success: true,
            message: "Guest invited successfully.",
            guest: newInvItem,
            data: [newInvItem]
          });
        } catch (fallbackErr: any) {
          console.error("Fallback guest invitation error:", fallbackErr);
        }
        
        // Final fallback object if DB insert and profile update failed
        const newInvItem = { ...invitePayload, id: 'inv-' + Date.now() };
        return res.json({
          success: true,
          message: "Guest invited successfully.",
          guest: newInvItem,
          data: [newInvItem]
        });
      }

      const createdGuest = (inserted && inserted[0]) ? inserted[0] : { ...invitePayload, id: 'inv-' + Date.now() };
      return res.json({
        success: true,
        message: "Guest invited successfully.",
        guest: createdGuest,
        data: inserted || [createdGuest]
      });
    } catch (err: any) {
      console.error("Invite guest API error:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "An unexpected error occurred while inviting guest.",
        error: err?.message || "An unexpected error occurred while inviting guest."
      });
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
  });

  // Profile Photo Upload endpoint
  app.post("/api/profile/upload-photo", async (req, res) => {
    try {
      const { userId, imageBase64, mimeType, fileName } = req.body;
      if (!userId || !imageBase64) {
        return res.status(400).json({ success: false, error: "Missing required image data or user ID." });
      }

      const fileExt = (mimeType || '').includes('png') ? 'png' : 'webp';
      const cleanFileName = fileName || `profiles/${userId}/${Date.now()}.${fileExt}`;
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      let photoUrl = '';

      // 1. Try uploading to Supabase Storage via adminSupabase or supabase
      try {
        const { data: uploadData, error: uploadErr } = await adminSupabase.storage
          .from('profile_photos')
          .upload(cleanFileName, buffer, {
            contentType: mimeType || 'image/webp',
            upsert: true
          });

        if (!uploadErr && uploadData) {
          const { data: { publicUrl } } = adminSupabase.storage
            .from('profile_photos')
            .getPublicUrl(cleanFileName);
          if (publicUrl) {
            photoUrl = `${publicUrl}?t=${Date.now()}`;
          }
        } else if (uploadErr) {
          console.warn("Server Supabase Storage upload warning (using fallback database storage):", uploadErr.message);
        }
      } catch (sErr: any) {
        console.warn("Server Supabase Storage upload exception (using fallback database storage):", sErr?.message || sErr);
      }

      // 2. Fallback to Data URL if storage bucket is not writeable or blocked by RLS
      if (!photoUrl) {
        const prefix = imageBase64.startsWith('data:') ? '' : `data:${mimeType || 'image/webp'};base64,`;
        photoUrl = `${prefix}${base64Data}`;
      }

      // 3. Update user profile in Supabase database
      const { data: existingUser } = await adminSupabase.from('users').select('profile_photo').eq('id', userId).maybeSingle();
      let extraData: any = {};
      if (existingUser?.profile_photo?.includes('|||')) {
        try {
          extraData = JSON.parse(existingUser.profile_photo.split('|||')[1] || '{}');
        } catch(e) {}
      }

      const newPhotoDbStr = Object.keys(extraData).length > 0 ? `${photoUrl}|||${JSON.stringify(extraData)}` : photoUrl;

      const { error: dbErr } = await adminSupabase
        .from('users')
        .update({
          profile_photo: newPhotoDbStr,
          photo_url: photoUrl,
          photoURL: photoUrl
        })
        .eq('id', userId);

      if (dbErr) {
        console.warn("Direct DB update by id failed, trying by uid:", dbErr);
        await adminSupabase
          .from('users')
          .update({
            profile_photo: newPhotoDbStr,
            photo_url: photoUrl,
            photoURL: photoUrl
          })
          .eq('uid', userId);
      }

      // Also sync master_admins table if applicable
      try {
        await adminSupabase.from('master_admins').update({ profile_photo: photoUrl }).eq('id', userId);
      } catch(e) {}

      return res.json({ success: true, photoURL: photoUrl });
    } catch (err: any) {
      console.error("Error in /api/profile/upload-photo:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to upload profile photo." });
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

  // Helpers for phone normalization
  function normalizeDigits(phone?: string | number | null): string {
    if (!phone) return "";
    const digits = phone.toString().replace(/\D/g, "");
    return digits.length >= 10 ? digits.slice(-10) : digits;
  }

  function normalizePhone(phone?: string | number | null): string {
    if (!phone) return "";
    const digits = normalizeDigits(phone);
    return digits.length >= 10 ? "+91" + digits : digits ? "+91" + digits : "";
  }

  // Create Member endpoint with strict duplicate validation and single-record persistence
  app.post("/api/members/create", async (req, res) => {
    try {
      const data = req.body || {};
      const {
        name,
        phone,
        whatsapp,
        whatsappNumber,
        category,
        password,
        subscriptionStart,
        subscriptionStartDate,
        subscriptionEnd,
        subscriptionEndDate,
        chapter_id,
        chapter_name,
        chapterName,
        role,
        position,
        admin_id,
        created_by,
        createdByName,
        createdByRole,
        callerId
      } = data;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: "Full Name is required." });
      }

      if (!phone || !phone.toString().trim()) {
        return res.status(400).json({ success: false, error: "Mobile Number is required." });
      }

      const phone10 = normalizeDigits(phone);
      if (!phone10 || phone10.length < 10) {
        return res.status(400).json({ success: false, error: "Please enter a valid 10-digit mobile number." });
      }

      const cleanPhone = normalizePhone(phone);
      const rawWhatsapp = whatsapp || whatsappNumber || phone;
      const whatsapp10 = normalizeDigits(rawWhatsapp);
      const cleanWhatsapp = normalizePhone(rawWhatsapp);

      // Check if mobile number already exists in users table
      const { data: existingUsers, error: fetchErr } = await adminSupabase
        .from("users")
        .select("id, name, phone, whatsapp_number, deleted, status");

      if (fetchErr) {
        console.error("Error checking existing users:", fetchErr);
      }

      if (existingUsers && existingUsers.length > 0) {
        const duplicatePhoneUser = existingUsers.find(u => {
          const isDeleted = u.deleted === true || u.deleted === 'true' || u.status === 'DELETED';
          if (isDeleted) return false;
          const uPhone10 = normalizeDigits(u.phone);
          const uWPhone10 = normalizeDigits(u.whatsapp_number);
          return (uPhone10 && uPhone10 === phone10) || (uWPhone10 && uWPhone10 === phone10);
        });

        if (duplicatePhoneUser) {
          return res.status(409).json({
            success: false,
            error: "This mobile number is already registered to a member."
          });
        }

        if (whatsapp10 && whatsapp10 !== phone10) {
          const duplicateWhatsappUser = existingUsers.find(u => {
            const isDeleted = u.deleted === true || u.deleted === 'true' || u.status === 'DELETED';
            if (isDeleted) return false;
            const uPhone10 = normalizeDigits(u.phone);
            const uWPhone10 = normalizeDigits(u.whatsapp_number);
            return (uPhone10 && uPhone10 === whatsapp10) || (uWPhone10 && uWPhone10 === whatsapp10);
          });

          if (duplicateWhatsappUser) {
            return res.status(409).json({
              success: false,
              error: "This WhatsApp number is already registered to a member."
            });
          }
        }
      }

      const newUserId = data.id || data.uid || crypto.randomUUID();
      const rawPassword = password || 'Welcometosskbusiness';
      const hashedPassword = bcrypt.hashSync(rawPassword, 10);
      const finalChapterId = chapter_id || null;
      const finalChapterName = chapter_name || chapterName || null;
      const finalSubStart = subscriptionStart || subscriptionStartDate || new Date().toISOString().split('T')[0];
      const finalSubEnd = subscriptionEnd || subscriptionEndDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

      const userPayload: Record<string, any> = {
        id: newUserId,
        name: name.trim(),
        phone: cleanPhone,
        whatsapp_number: cleanWhatsapp || cleanPhone,
        category: category || null,
        chapter_id: finalChapterId,
        chapter_name: finalChapterName,
        role: role || 'MEMBER',
        position: position || 'member',
        status: 'ACTIVE',
        membership_status: 'ACTIVE',
        account_status: 'ACTIVE',
        disabled: false,
        deleted: false,
        blocked: false,
        must_change_password: true,
        password: hashedPassword,
        subscription_start: finalSubStart,
        subscription_end: finalSubEnd,
        subscriptionStartDate: finalSubStart,
        subscriptionEndDate: finalSubEnd,
        subscriptionStatus: 'Active',
        created_by: created_by || admin_id || callerId || null,
        admin_id: admin_id || created_by || callerId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: insertedUser, error: insertErr } = await adminSupabase
        .from("users")
        .insert(userPayload)
        .select()
        .single();

      if (insertErr) {
        console.error("Member insert error:", insertErr);
        if (insertErr.code === '23505' || insertErr.message?.toLowerCase().includes('unique') || insertErr.message?.toLowerCase().includes('duplicate')) {
          return res.status(409).json({
            success: false,
            error: "This mobile number is already registered to a member."
          });
        }
        return res.status(500).json({ success: false, error: insertErr.message || "Failed to save member to database." });
      }

      // Upsert into member_subscriptions
      try {
        await adminSupabase.from("member_subscriptions").upsert({
          user_id: newUserId,
          member_name: name.trim(),
          chapter_id: finalChapterId,
          chapter_name: finalChapterName,
          position_name: position || 'member',
          subscription_start: finalSubStart,
          subscription_end: finalSubEnd,
          membership_status: 'Active',
          account_status: 'Active',
          created_by: created_by || admin_id || callerId || null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch (subErr) {
        console.warn("member_subscriptions upsert warning:", subErr);
      }

      return res.json({
        success: true,
        id: newUserId,
        uid: newUserId,
        data: insertedUser
      });
    } catch (err: any) {
      console.error("Error in /api/members/create:", err);
      return res.status(500).json({ success: false, error: err.message || "Failed to create member." });
    }
  });

  // Delete Member endpoint (both /api/members/delete and /api/auth/delete-user)
  app.post(["/api/members/delete", "/api/auth/delete-user"], async (req, res) => {
    const uid = req.body.uid || req.body.id;
    if (!uid) {
      return res.status(400).json({ error: "Missing uid parameter" });
    }
    try {
      // 1. Delete associated subscriptions
      await adminSupabase
        .from("member_subscriptions")
        .delete()
        .eq("user_id", uid);

      // 2. Delete meeting participants
      await adminSupabase
        .from("meeting_participants")
        .delete()
        .eq("user_id", uid);

      // 3. Delete user from users table
      const { error } = await adminSupabase
        .from("users")
        .delete()
        .eq("id", uid);

      if (error) {
        console.error("adminSupabase delete error:", error);
        throw error;
      }

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
        sender_id: slipData.sender_id || slipData.senderId || slipData.from_user_id || slipData.fromUserId || slipData.submitted_by || slipData.submittedBy || null,
        receiver_id: slipData.receiver_id || slipData.receiverId || slipData.to_user_id || slipData.toUserId || null,
        submitted_by: slipData.submitted_by || slipData.submittedBy || slipData.from_user_id || slipData.fromUserId || null,
        from_user_id: slipData.from_user_id || slipData.fromUserId || slipData.submitted_by || slipData.submittedBy || null,
        to_user_id: slipData.to_user_id || slipData.toUserId || null,
        customer_name: slipData.customer_name || slipData.customerName || '',
        business_value: Number(slipData.business_value || slipData.businessValue || slipData.businessAmount || 0),
        notes: slipData.notes || slipData.thankYouMessage || slipData.businessDescription || '',
        thank_you_message: slipData.thank_you_message || slipData.notes || slipData.thankYouMessage || '',
        created_at: slipData.created_at || slipData.createdAt || new Date().toISOString()
      };

      if (cleanDbPayload.referral_id) {
        const { data: existing } = await adminSupabase
          .from('thank_you_slips')
          .select('id')
          .eq('referral_id', String(cleanDbPayload.referral_id));

        if (existing && existing.length > 0) {
          return res.status(400).json({ error: "A Thank You Slip has already been submitted for this referral." });
        }
      }

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

  // One-to-One Meetings creation endpoint
  app.post("/api/one-to-one-meetings/create", async (req, res) => {
    try {
      const data = req.body || {};
      const creator_id = data.creator_id || data.creatorId || data.sender_id || data.senderId || data.organizer_id || data.organizerId;
      const receiver_id = data.receiver_id || data.receiverId || data.member_id || data.memberId || data.participant_id || data.participantId;
      const date = data.date || data.scheduled_date || data.meeting_date;
      const time = data.time || data.scheduled_time || data.meeting_time;
      const venue = data.venue || data.meeting_location || data.location || 'Online Meeting';
      const notes = data.notes || data.description || data.topics || '';
      const status = data.status || 'UPCOMING';
      const chapter_id = data.chapter_id || data.chapterId || null;

      // Validation
      if (!creator_id) {
        return res.status(400).json({ success: false, error: "Creator ID is required." });
      }
      if (!receiver_id) {
        return res.status(400).json({ success: false, error: "Receiver/Participant ID is required." });
      }
      if (String(creator_id).trim().toLowerCase() === String(receiver_id).trim().toLowerCase()) {
        return res.status(400).json({ success: false, error: "Creator and receiver cannot be the same member." });
      }
      if (!date) {
        return res.status(400).json({ success: false, error: "Meeting date is required." });
      }
      if (!time) {
        return res.status(400).json({ success: false, error: "Meeting time is required." });
      }

      // Fetch member names if title not provided
      let meetingTitle = (data.title || '').trim();
      if (!meetingTitle) {
        const { data: users } = await adminSupabase
          .from('users')
          .select('id, name')
          .in('id', [creator_id, receiver_id]);

        const uMap: Record<string, string> = {};
        if (users) {
          users.forEach(u => { uMap[u.id] = u.name; });
        }
        const name1 = uMap[creator_id] || 'Member';
        const name2 = uMap[receiver_id] || 'Member';
        meetingTitle = `1:1 Meeting - ${name1} & ${name2}`;
      }

      // Construct clean database payload using ONLY valid columns
      const cleanDbPayload = {
        title: meetingTitle,
        creator_id: creator_id,
        receiver_id: receiver_id,
        sender_id: creator_id,
        organizer_id: creator_id,
        member_id: receiver_id,
        chapter_id: chapter_id,
        date: date,
        time: time,
        scheduled_date: date,
        scheduled_time: time,
        venue: venue,
        meeting_location: venue,
        meeting_type: 'one_to_one',
        notes: notes,
        description: notes,
        status: status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await adminSupabase
        .from('one_to_one_meetings')
        .insert([cleanDbPayload])
        .select()
        .single();

      if (error) {
        console.error("adminSupabase insert error in /api/one-to-one-meetings/create:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        // Try standard supabase client fallback
        const { data: result2, error: error2 } = await supabase
          .from('one_to_one_meetings')
          .insert([cleanDbPayload])
          .select()
          .single();

        if (error2) {
          console.error("supabase fallback insert error:", error2);
          return res.status(500).json({
            success: false,
            error: "Unable to schedule the One-to-One Meeting. Please try again.",
            details: error2.message,
            code: error2.code
          });
        }

        return res.json({ success: true, data: result2 });
      }

      // Send push notification to receiver
      try {
        const { data: creatorUser } = await adminSupabase
          .from('users')
          .select('name')
          .eq('id', creator_id)
          .single();
        const creatorName = creatorUser?.name || 'A fellow member';

        // Also insert into notifications table
        await adminSupabase.from('notifications').insert([{
          user_id: receiver_id,
          type: 'MEETING',
          title: 'New 1-to-1 Meeting Scheduled',
          message: `${creatorName} has scheduled a 1-to-1 meeting with you for ${date} at ${time}.|||${JSON.stringify({ link: '/one-to-one', relatedUserId: creator_id, role: 'MEMBER' })}`,
          is_read: false,
          created_at: new Date().toISOString()
        }]);
      } catch (notifErr) {
        console.warn("Notification error during 1-to-1 creation:", notifErr);
      }

      res.json({ success: true, data: result });
    } catch (err: any) {
      console.error("Unhandled error in /api/one-to-one-meetings/create:", err);
      res.status(500).json({
        success: false,
        error: "Unable to schedule the One-to-One Meeting. Please try again.",
        details: err?.message || String(err)
      });
    }
  });

  // Meeting Attendance & Collection Update Endpoint
  app.post("/api/meetings/update", async (req, res) => {
    try {
      const { meetingId, callerId, attendance, amountCollected, memberNotes, isCompleted, guestUpdates, date, time, location, memberCount, guestCount } = req.body || {};
      if (!meetingId || !callerId) {
        return res.status(400).json({
          success: false,
          message: "Missing required meetingId or callerId.",
          error: "Missing required parameters."
        });
      }

      // Fetch caller account
      const { data: caller, error: callerErr } = await adminSupabase
        .from('users')
        .select('*')
        .or(`id.eq.${callerId},uid.eq.${callerId}`)
        .maybeSingle();

      if (callerErr || !caller) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized user account.",
          error: "Unauthorized user account."
        });
      }

      const role = String(caller.role || '').toUpperCase();
      const pos = String(caller.position || '').toLowerCase();
      const isChapAdmin = 
        role === 'CHAPTER_ADMIN' || 
        role === 'MASTER_ADMIN' || 
        role === 'ADMIN' || 
        pos === 'chapter_admin' ||
        pos === 'president' ||
        pos === 'vice_president' ||
        pos === 'treasurer' ||
        pos === 'secretary' ||
        pos === 'coordinator';

      if (!isChapAdmin) {
        return res.status(403).json({
          success: false,
          message: "Only Chapter Admin or Position Holders can update meeting attendance.",
          error: "Permission denied: Normal Member cannot modify attendance."
        });
      }

      // Fetch target meeting
      const { data: meeting, error: meetingErr } = await adminSupabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingErr || !meeting) {
        return res.status(404).json({
          success: false,
          message: "Target meeting not found.",
          error: "Meeting not found."
        });
      }

      // Verify chapter restriction
      if (caller.role !== 'MASTER_ADMIN') {
        const callerChap = caller.chapter_id || caller.chapterId;
        const meetingChap = meeting.chapter_id || meeting.chapterId;
        if (callerChap && meetingChap && String(callerChap).trim() !== String(meetingChap).trim()) {
          return res.status(403).json({
            success: false,
            message: "You can only update meetings belonging to your own chapter.",
            error: "You can only update meetings belonging to your own chapter."
          });
        }
      }

      const updatePayload: any = {
        updated_at: new Date().toISOString()
      };
      
      if (date) updatePayload.date = date;
      if (time) updatePayload.time = time;
      if (location !== undefined) updatePayload.location = location;

      if (attendance) updatePayload.attendance = attendance;
      if (amountCollected) updatePayload.amount_collected = amountCollected;
      if (memberNotes) updatePayload.member_notes = memberNotes;
      if (memberCount !== undefined || guestCount !== undefined) {
        const mCount = memberCount !== undefined ? (Number(memberCount) || 0) : undefined;
        const gCount = guestCount !== undefined ? (Number(guestCount) || 0) : undefined;
        const existingNotes = updatePayload.member_notes || memberNotes || {};
        updatePayload.member_notes = {
          ...existingNotes,
          __counts: {
            memberCount: mCount !== undefined ? mCount : existingNotes.__counts?.memberCount,
            guestCount: gCount !== undefined ? gCount : existingNotes.__counts?.guestCount
          },
          ...(mCount !== undefined ? { __memberCount: mCount } : {}),
          ...(gCount !== undefined ? { __guestCount: gCount } : {})
        };
      }
      if (req.body.isCancelled === true || req.body.status === 'CANCELLED') {
        updatePayload.is_completed = false;
        updatePayload.status = 'CANCELLED';
      } else if (isCompleted === true || (isCompleted === undefined && attendance)) {
        updatePayload.is_completed = true;
        updatePayload.status = 'COMPLETED';
      } else if (isCompleted === false) {
        updatePayload.is_completed = false;
        updatePayload.status = 'UPCOMING';
      }

      let updateErr: any = null;
      const { error: firstErr } = await adminSupabase
        .from('meetings')
        .update(updatePayload)
        .eq('id', meetingId);

      if (firstErr) {
        console.warn("First update failed, retrying without is_completed:", firstErr.message);
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.is_completed;
        const { error: secondErr } = await adminSupabase
          .from('meetings')
          .update(fallbackPayload)
          .eq('id', meetingId);
        updateErr = secondErr;
      }

      if (updateErr) { console.error("SUPABASE UPDATE ERR:", updateErr);
        return res.status(500).json({
          success: false,
          message: "Failed to update meeting in database.",
          error: updateErr.message
        });
      }

      if (guestUpdates && Array.isArray(guestUpdates)) {
        for (const guest of guestUpdates) {
          const payload = {
            status: guest.status,
            attendance_status: guest.status,
            attendance_updated_by: caller.uid || caller.id,
            attendance_updated_by_name: caller.name || caller.full_name,
            attendance_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          await adminSupabase
            .from('guest_invitations')
            .update(payload)
            .eq('id', guest.id);
            
          if (guest.status === 'Present' && guest.wasNotPresent) {
            const inviterId = guest.inviterId;
            if (inviterId) {
               const { data: inviterData } = await adminSupabase
                 .from('users')
                 .select('workspace_checklist')
                 .or(`id.eq.${inviterId},uid.eq.${inviterId}`)
                 .single();
                 
               if (inviterData) {
                 const checklist = inviterData.workspace_checklist || {};
                 await adminSupabase
                   .from('users')
                   .update({ workspace_checklist: { ...checklist, task_invite_guest: true, 'Invite a New Guest': true } })
                   .or(`id.eq.${inviterId},uid.eq.${inviterId}`);
               }
            }
          }
        }
      }

      return res.json({
        success: true,
        message: "Meeting attendance & collection updated successfully."
      });
    } catch (err: any) {
      console.error("Error in /api/meetings/update:", err);
      return res.status(500).json({
        success: false,
        message: "Backend Crash: " + (err.stack || err.message || "Unknown error"),
        error: err.message || "Server error"
      });
    }
  });

  // Meeting Cancellation Endpoint
  app.post("/api/meetings/cancel", async (req, res) => {
    try {
      const { meetingId, callerId, reason } = req.body || {};
      if (!meetingId || !callerId) {
        return res.status(400).json({
          success: false,
          message: "Missing required meetingId or callerId.",
          error: "Missing required parameters."
        });
      }

      // Fetch caller account
      const { data: caller, error: callerErr } = await adminSupabase
        .from('users')
        .select('*')
        .or(`id.eq.${callerId},uid.eq.${callerId}`)
        .maybeSingle();

      if (callerErr || !caller) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized user account.",
          error: "Unauthorized user account."
        });
      }

      const role = String(caller.role || '').toUpperCase();
      const pos = String(caller.position || '').toLowerCase();
      const isAuthorized = 
        role === 'CHAPTER_ADMIN' || 
        role === 'MASTER_ADMIN' || 
        role === 'ADMIN' || 
        pos === 'chapter_admin' ||
        pos === 'president' ||
        pos === 'vice_president' ||
        pos === 'treasurer' ||
        pos === 'secretary' ||
        pos === 'coordinator';

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Only Chapter Admin or Position Holders can cancel meetings.",
          error: "Permission denied: Normal Member cannot cancel meetings."
        });
      }

      // Fetch target meeting
      const { data: meeting, error: meetingErr } = await adminSupabase
        .from('meetings')
        .select('*')
        .eq('id', meetingId)
        .single();

      if (meetingErr || !meeting) {
        return res.status(404).json({
          success: false,
          message: "Target meeting not found.",
          error: "Meeting not found."
        });
      }

      // Verify chapter restriction
      if (caller.role !== 'MASTER_ADMIN') {
        const callerChap = caller.chapter_id || caller.chapterId;
        const meetingChap = meeting.chapter_id || meeting.chapterId;
        if (callerChap && meetingChap && String(callerChap).trim() !== String(meetingChap).trim()) {
          return res.status(403).json({
            success: false,
            message: "You can only cancel meetings belonging to your own chapter.",
            error: "You can only cancel meetings belonging to your own chapter."
          });
        }
      }

      const updatePayload: any = {
        status: 'CANCELLED',
        is_completed: false,
        updated_at: new Date().toISOString()
      };

      if (reason) {
        const existingNotes = meeting.member_notes || {};
        updatePayload.member_notes = {
          ...existingNotes,
          cancellation_reason: reason
        };
      }

      let cancelErr: any = null;
      const { error: firstErr } = await adminSupabase
        .from('meetings')
        .update(updatePayload)
        .eq('id', meetingId);

      if (firstErr) {
        console.warn("First cancel update failed, retrying without is_completed:", firstErr.message);
        const fallbackPayload = { ...updatePayload };
        delete fallbackPayload.is_completed;
        const { error: secondErr } = await adminSupabase
          .from('meetings')
          .update(fallbackPayload)
          .eq('id', meetingId);
        cancelErr = secondErr;
      }

      if (cancelErr) {
        console.error("SUPABASE CANCEL ERR:", cancelErr);
        return res.status(500).json({
          success: false,
          message: "Failed to cancel meeting in database.",
          error: cancelErr.message
        });
      }

      return res.json({
        success: true,
        message: "Meeting cancelled successfully."
      });
    } catch (err: any) {
      console.error("Error in /api/meetings/cancel:", err);
      return res.status(500).json({
        success: false,
        message: "Backend Crash: " + (err.stack || err.message || "Unknown error"),
        error: err.message || "Server error"
      });
    }
  });

  // Dedicated AI Agent and SEO Endpoints (guaranteed text/xml delivery without SPA redirect)
  const servePublicFile = (reqFileName: string, contentType: string) => {
    return (_req: express.Request, res: express.Response) => {
      const candidates = [
        path.join(process.cwd(), "public", reqFileName),
        path.join(process.cwd(), "dist", reqFileName)
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          return res.sendFile(candidate);
        }
      }
      return res.status(404).type("text/plain").send("Not found");
    };
  };

  app.get("/robots.txt", servePublicFile("robots.txt", "text/plain; charset=utf-8"));
  app.get("/llms.txt", servePublicFile("llms.txt", "text/plain; charset=utf-8"));
  app.get("/llms-full.txt", servePublicFile("llms-full.txt", "text/plain; charset=utf-8"));
  app.get("/sitemap.xml", servePublicFile("sitemap.xml", "application/xml; charset=utf-8"));

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production (Standard Node server)
    const distPath = path.join(process.cwd(), "dist");
    const indexPath = path.join(distPath, "index.html");
    
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else if (/\.(js|css)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/\.(webp|png|jpg|jpeg|svg|ico|woff|woff2)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
        } else if (/\.(txt|xml|json)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      }
    }));
    
    app.get("*", (req, res) => {
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Application build not found. Please build the project.");
      }
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer().catch((err) => {
  console.error("Critical server startup failure:", err);
  process.exit(1);
});
export default appPromise;
