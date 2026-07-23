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
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        
        const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (!caller || (caller.role !== 'MASTER_ADMIN' && caller.role !== 'CHAPTER_ADMIN')) {
          return res.status(403).json({ error: "Unauthorized to edit other users." });
        }
      }

      const { error: updateError } = await supabase.from('users').update(updates).eq('id', uid);
      if (updateError) throw updateError;
      
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
      // Profile permissions: Admins cannot change another user's personal info
      // if (displayName) {
      //   updates.name = displayName;
      // }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
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
