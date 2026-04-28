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
    if (!firebaseAdminApp) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing in environment variables");
      }
      
      try {
        const serviceAccount = JSON.parse(serviceAccountKey);
        firebaseAdminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } catch (error: any) {
        throw new Error(`Failed to initialize Firebase Admin: ${error.message}`);
      }
    }
    return firebaseAdminApp;
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
      return res.status(400).json({ error: "Missing required fields" });
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

      const phoneSnapshot = await firestore.collection('users').where('phone', '==', normalizedPhone).limit(1).get();
      if (!phoneSnapshot.empty) {
        return res.status(400).json({ error: "An account with this phone number already exists." });
      }

      const adminDoc = await firestore.collection('users').doc(adminUid).get();
      if (!adminDoc.exists) {
        return res.status(403).json({ error: "Unauthorized: Admin profile not found." });
      }

      const adminData = adminDoc.data();
      if (adminData?.role !== 'MASTER_ADMIN' && !(adminData?.role === 'CHAPTER_ADMIN' && role === 'MEMBER')) {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions to create this user role." });
      }

      // 1. Create Firebase Auth user (without email)
      const userRecord = await admin.auth().createUser({
        displayName: trimmedName,
        phoneNumber: normalizedPhone,
        password: trimmedPassword
      });

      const uid = userRecord.uid;

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

      await firestore.collection('users').doc(uid).set(profileData);

      // 3. Store plain text password in private auth_data collection
      await firestore.collection('auth_data').doc(uid).set({
        password: trimmedPassword,
        updatedAt: new Date().toISOString()
      });

      // 4. Set custom claims
      await admin.auth().setCustomUserClaims(uid, { 
        role,
        membershipStatus: 'ACTIVE'
      });

      res.json({ uid });
    } catch (error: any) {
      console.error("Error creating user via Firebase Admin:", error);
      res.status(500).json({ error: "Failed to create user", details: error.message });
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
      res.status(500).json({ error: "Failed to update user", details: error.message });
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
      res.status(500).json({ error: "Failed to delete user", details: error.message });
    }
  });

  // Mount API Router - Priority on /api
  app.use("/api", apiRouter);

  // Global 404 handler for API routes (only if we're expected to be an API)
  const apiNotFoundHandler = (req: express.Request, res: express.Response) => {
    console.warn(`API route not found: ${req.method} ${req.path}`);
    res.status(404).json({ 
      error: "API endpoint not found", 
      method: req.method,
      path: req.path,
      fullUrl: req.originalUrl
    });
  };

  // If running as a Cloud Function, we handle everything as API
  if (process.env.FUNCTION_NAME) {
    app.use("/", apiRouter);
    app.all("*", apiNotFoundHandler);
  } else if (process.env.NODE_ENV !== "production") {
    // Local development with Vite
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Mount root API router after Vite in dev so assets are handled first
    app.use("/", apiRouter);
  } else {
    // Production (Standard Node server)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Mount root API router after static assets
    app.use("/", apiRouter);
    
    app.get("*", (req, res) => {
      // If reached here and starts with /api or was likely an API call, return a proper 404
      if (req.path.startsWith('/api')) {
        return apiNotFoundHandler(req, res);
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

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

