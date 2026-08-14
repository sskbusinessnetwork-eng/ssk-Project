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

  
    try {
      const { meetingId, callerId, attendance, amountCollected, memberNotes, isCompleted, guestUpdates, date, time, location } = req.body || {};
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
        .single();

      if (callerErr || !caller) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized user account.",
          error: "Unauthorized user account."
        });
      }

      const isChapAdmin = caller.role === 'CHAPTER_ADMIN' || caller.role === 'MASTER_ADMIN' || caller.position === 'chapter_admin';
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
      if (isCompleted === true || (isCompleted === undefined && attendance)) {
        updatePayload.is_completed = true;
        updatePayload.status = 'COMPLETED';
      } else if (isCompleted === false) {
        updatePayload.is_completed = false;
        updatePayload.status = 'UPCOMING';
      }

      const { error: updateErr } = await adminSupabase
        .from('meetings')
        .update(updatePayload)
        .eq('id', meetingId);

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
  
}
