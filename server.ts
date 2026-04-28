import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import cors from "cors";

// Read Firebase Config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set trust proxy for Cloud Run/Firebase
  app.set('trust proxy', true);

  // Enable CORS
  app.use(cors({ origin: true }));
  app.use(express.json());
  
  // Request Logger
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || process.env.FUNCTION_NAME) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
      return res.status(400).json({ error: "Invalid JSON payload" });
    }
    next(err);
  });

  // Firebase Admin Initialization (Lazy)
  let firebaseAdminApp: admin.app.App | null = null;

  function getFirebaseAdmin() {
    if (admin.apps.length > 0) {
      return admin.apps[0]!;
    }

    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    
    try {
      if (serviceAccountKey) {
        const serviceAccount = JSON.parse(serviceAccountKey);
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Fallback to default credentials (useful in Cloud Functions/Google Cloud)
        console.log("FIREBASE_SERVICE_ACCOUNT_KEY not found, using default credentials");
        return admin.initializeApp();
      }
    } catch (error: any) {
      console.error("Firebase Admin Init Error:", error);
      throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
    }
  }

  // Helper to normalize phone number to +91XXXXXXXXXX
  function normalizePhone(phone: string): string {
    if (!phone) return "";
    return "+91" + phone.toString().replace(/\D/g, "").slice(-10);
  }

  const apiRouter = express.Router();

  // API Router Request Logger - Only log likely API calls, ignore asset spam in dev
  apiRouter.use((req, res, next) => {
    const isAsset = req.path.match(/\.(tsx?|jsx?|css|png|jpg|jpeg|gif|svg|ico|json|woff2?|ttf|eot)$/) || 
                    req.path.startsWith('/src/') || 
                    req.path.startsWith('/@') ||
                    req.path.startsWith('/node_modules/');
    
    if (!isAsset) {
      console.log(`[API Router Path] ${req.path}`);
    }
    next();
  });

  // API Routes
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route for sending Push Notifications via FCM
  apiRouter.post(["/send-push-notification", "/send-push-notification/"], async (req, res) => {
    const { deviceToken, title, body, data } = req.body;

    if (!deviceToken || !title || !body) {
      return res.status(400).json({ error: "Missing 'deviceToken', 'title', or 'body' field" });
    }

    try {
      getFirebaseAdmin(); // Ensure initialized
      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: data || {},
        token: deviceToken,
      };

      const response = await admin.messaging().send(message);
      console.log(`Push notification sent successfully: ${response}`);
      res.json({ success: true, messageId: response });
    } catch (error: any) {
      console.error("Error sending push notification via FCM:", error);
      res.status(500).json({ 
        error: "Failed to send push notification", 
        details: error.message 
      });
    }
  });

  // API Route for creating a new user (Admin only)
  apiRouter.post(["/admin/create-user", "/admin/create-user/", "/addMember", "/addMember/"], async (req, res) => {
    console.log("Processing /api/admin/create-user request:", req.body ? "Body present" : "Body missing");
    const { email, password, displayName, role, adminUid, phone } = req.body;

    if (!phone || !password || !role || !adminUid) {
      console.log("Validation failed: missing required fields", { phone: !!phone, password: !!password, role: !!role, adminUid: !!adminUid });
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.toString().length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long." });
    }

    try {
      getFirebaseAdmin();
      
      // Verify admin status
      const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
      
      // Normalize and check if phone number already exists
      const normalizedPhone = normalizePhone(phone.toString().trim());
      const trimmedPassword = password.toString().trim();
      const trimmedName = displayName ? displayName.toString().trim() : "";
      const trimmedEmail = email ? email.toString().trim().toLowerCase() : null;

      console.log("Checking for existing user with phone:", normalizedPhone);
      const phoneSnapshot = await firestore.collection('users').where('phone', '==', normalizedPhone).limit(1).get();
      if (!phoneSnapshot.empty) {
        return res.status(400).json({ error: "An account with this phone number already exists." });
      }

      console.log("Verifying admin permissions for UID:", adminUid);
      const adminDoc = await firestore.collection('users').doc(adminUid).get();
      if (!adminDoc.exists) {
        console.error("Admin profile not found for UID:", adminUid);
        return res.status(403).json({ error: "Unauthorized: Admin profile not found." });
      }

      const adminData = adminDoc.data();
      console.log("Admin role:", adminData?.role, "Target role:", role);
      if (adminData?.role !== 'MASTER_ADMIN' && !(adminData?.role === 'CHAPTER_ADMIN' && role === 'MEMBER')) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions to create this user role." });
      }

      // 1. Create Firebase Auth user
      const authData: any = {
        displayName: trimmedName,
        phoneNumber: normalizedPhone,
        password: trimmedPassword
      };
      if (trimmedEmail) {
        authData.email = trimmedEmail;
        authData.emailVerified = true;
      }

      console.log("Calling admin.auth().createUser...");
      let userRecord;
      try {
        userRecord = await admin.auth().createUser(authData);
      } catch (authError: any) {
        console.error("Firebase Auth Error:", authError.code, authError.message);
        if (authError.code === 'auth/email-already-exists') {
          return res.status(400).json({ error: "An account with this email address already exists." });
        }
        if (authError.code === 'auth/phone-number-already-exists') {
          return res.status(400).json({ error: "An account with this phone number already exists in Authentication." });
        }
        if (authError.code === 'auth/invalid-phone-number') {
          return res.status(400).json({ error: "The phone number is invalid. Must be in E.164 format (e.g. +91XXXXXXXXXX)." });
        }
        throw authError; // Rethrow for generic handler
      }

      const uid = userRecord.uid;
      console.log("User created in Auth with UID:", uid);

      // 2. Create Firestore profile
      const profileData: any = {
        uid,
        name: trimmedName,
        role,
        membershipStatus: 'ACTIVE',
        phone: normalizedPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (trimmedEmail) profileData.email = trimmedEmail;

      console.log("Saving Firestore profile for UID:", uid);
      await firestore.collection('users').doc(uid).set(profileData);

      // 3. Store plain text password in private auth_data collection (for admin view/reset capability)
      console.log("Saving auth_data for UID:", uid);
      await firestore.collection('auth_data').doc(uid).set({
        password: trimmedPassword,
        updatedAt: new Date().toISOString()
      });

      // 4. Set custom claims
      console.log("Setting custom claims for UID:", uid);
      await admin.auth().setCustomUserClaims(uid, { 
        role,
        membershipStatus: 'ACTIVE'
      });

      console.log("User creation complete for UID:", uid);
      res.json({ uid, success: true });
    } catch (error: any) {
      console.error("Critical error in /api/admin/create-user:", error);
      // Ensure we return the actual error message to the frontend in the 'error' field
      res.status(error.status || 500).json({ 
        error: error.message || "Failed to create user",
        code: error.code || "unknown_error"
      });
    }
  });

  // API Route for updating a user (Admin only)
  apiRouter.post(["/admin/update-user", "/admin/update_user/", "/admin/update_user"], async (req, res) => {
    console.log("Processing /api/admin/update-user request for UID:", req.body?.uid);
    const { uid, email, password, displayName, adminUid } = req.body;

    if (!uid || !adminUid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      getFirebaseAdmin();

      // Verify admin status
      const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
      const adminDoc = await firestore.collection('users').doc(adminUid).get();
      if (!adminDoc.exists) {
        return res.status(403).json({ error: "Unauthorized: Admin profile not found." });
      }

      const adminData = adminDoc.data();
      if (adminData?.role !== 'MASTER_ADMIN' && adminData?.role !== 'CHAPTER_ADMIN') {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions." });
      }

      const authUpdateData: any = {};
      if (displayName) authUpdateData.displayName = displayName;

      await admin.auth().updateUser(uid, authUpdateData);

      if (password) {
        await firestore.collection('auth_data').doc(uid).set({
          password: password,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        await firestore.collection('users').doc(uid).update({
          updatedAt: new Date().toISOString()
        }).catch(() => {});

        await admin.auth().updateUser(uid, { password });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user via Firebase Admin:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to update user" });
    }
  });

  // API Route for deleting a user (Admin only)
  apiRouter.post(["/auth/delete-user", "/auth/delete_user/", "/auth/delete_user"], async (req, res) => {
    const { uid, adminUid } = req.body;

    if (!uid || !adminUid) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      getFirebaseAdmin();
      const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
      const adminDoc = await firestore.collection('users').doc(adminUid).get();
      
      if (!adminDoc.exists) {
        return res.status(403).json({ error: "Unauthorized: Admin profile not found." });
      }

      const adminData = adminDoc.data();
      if (adminData?.role !== 'MASTER_ADMIN' && adminData?.role !== 'CHAPTER_ADMIN') {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions." });
      }

      try {
        await admin.auth().deleteUser(uid);
      } catch (authError: any) {
        if (authError.code !== 'auth/user-not-found') throw authError;
      }
      
      await firestore.collection('users').doc(uid).delete();
      res.json({ success: true });
    } catch (error: any) {
      console.error("Server: Error deleting user:", error);
      res.status(error.status || 500).json({ error: error.message || "Failed to delete user" });
    }
  });

  // Mount API Router
  // We mount it at /api and / to be safe with different Hosting/Function pathing
  app.use("/api", apiRouter);
  app.use("/", apiRouter);

  // Global 404 handler for API routes
  // This must be after all specific API routes but before static assets/SPA fallback
  const apiNotFoundHandler = (req: express.Request, res: express.Response) => {
    console.warn(`[Route Not Found] ${req.method} ${req.path} (Original: ${req.originalUrl})`);
    res.status(404).json({ 
      error: "API endpoint not found", 
      method: req.method,
      path: req.path,
      fullUrl: req.originalUrl
    });
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production (Standard Node server or Cloud Function)
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    
    app.get("*", (req, res) => {
      // If it looks like an API call (starts with /api or /addMember), return JSON 404 instead of HTML
      if (req.path.startsWith('/api') || req.path === '/addMember' || req.path === '/addMember/') {
        return apiNotFoundHandler(req, res);
      }
      
      // Serve SPA index.html for everything else (GET only)
      if (req.method === 'GET') {
        res.sendFile(path.join(distPath, "index.html"));
      } else {
        // Falling through for non-GET requests to unknown paths
        apiNotFoundHandler(req, res);
      }
    });
  }

  // Final catch-all for anything that reached here (e.g. POST to unknown routes)
  app.all("*", apiNotFoundHandler);


  // Global Error Handler for JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler caught an error:", err);
    if (req.path.startsWith('/api/') || process.env.FUNCTION_NAME) {
      return res.status(err.status || 500).json({
        error: err.message || "Internal server error"
      });
    }
    next(err);
  });

  if (!process.env.FUNCTION_NAME) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

// Export for Cloud Functions
let appInstance: express.Express | null = null;
async function getApp() {
  if (!appInstance) {
    appInstance = await startServer();
  }
  return appInstance;
}

import { onRequest } from "firebase-functions/v2/https";
export const api = onRequest({ region: "asia-southeast1", cors: true, maxInstances: 10 }, async (req, res) => {
  const app = await getApp();
  return app(req, res);
});

// Run startServer for local standard node execution
if (!process.env.FUNCTION_NAME) {
  startServer();
}

