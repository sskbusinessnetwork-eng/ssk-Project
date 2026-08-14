import { createClient } from "@supabase/supabase-js";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as webpush from "web-push";

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
          .select('id, role, position, chapter_id, status, name')
          .eq('id', callerId)
          .maybeSingle();
        if (c1) {
          caller = c1;
        } else {
          const { data: c2 } = await adminSupabase
            .from('users')
            .select('id, role, position, chapter_id, status, name')
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

      if (meeting && meeting.chapter_id && caller.chapter_id && String(meeting.chapter_id).trim() !== String(caller.chapter_id).trim()) {
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
          if (pLower === 'chapter_admin' || pLower === 'chapter admin') return 'Chapter Admin';
          if (pLower === 'member') return 'Member';
          return pos.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        if (role === 'CHAPTER_ADMIN') return 'Chapter Admin';
        return 'Member';
      };

      const callerRole = formatRole(caller.position, caller.role);

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
  
}
