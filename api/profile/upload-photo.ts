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
  
}
