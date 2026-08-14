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
  
}
