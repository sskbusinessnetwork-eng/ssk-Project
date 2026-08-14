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
  
}
