import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
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

  // Helper to get Auth Email from identifier (phone or email) - DEPRECATED but kept for backward compatibility
  async function getAuthEmail(identifier: string) {
    let email = identifier.trim().toLowerCase();
    if (!email.includes('@')) {
      const normalizedPhone = normalizePhone(identifier);
      const last10 = normalizedPhone.slice(-10);
      
      try {
        const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
        const userSnapshot = await firestore.collection('users').where('phone', '==', normalizedPhone).limit(1).get();
        
        if (!userSnapshot.empty) {
          const userDoc = userSnapshot.docs[0].data();
          return userDoc.email || `+91${last10}@ssk.internal`;
        }
      } catch (e) {
        console.error("Error looking up user by phone in Firestore:", e);
      }
      
      return `+91${last10}@ssk.internal`;
    }
    return email;
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // NEW: API Route for phone + password login
  app.post("/api/auth/login", async (req, res) => {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: "Phone number and password are required" });
    }

    try {
      const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
      const normalizedPhone = normalizePhone(phone.toString().trim());
      const trimmedPassword = password.toString().trim();
      
      console.log(`Login attempt for phone: ${normalizedPhone}`);

      // 1. Find user by phone in Firestore
      const userSnapshot = await firestore.collection('users').where('phone', '==', normalizedPhone).limit(1).get();
      
      if (userSnapshot.empty) {
        console.log(`User not found for phone: ${normalizedPhone}`);
        return res.status(401).json({ error: "User not found" });
      }

      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data();
      const uid = userDoc.id;

      // 2. Get password from SINGLE SOURCE OF TRUTH: auth_data collection
      let authDoc = await firestore.collection('auth_data').doc(uid).get();
      let authData = authDoc.data();
      let storedPassword = authData?.password;
      
      // DEBUG REQUIREMENT: Print stored and entered passwords
      console.log(`DEBUG: UID: ${uid}`);
      console.log(`DEBUG: Entered Password: ${trimmedPassword}`);
      console.log(`DEBUG: Stored Password: ${storedPassword}`);

      // 3. Verify password using plain text comparison as requested
      const isValid = trimmedPassword === storedPassword;

      if (!isValid) {
        console.log(`Invalid password for phone: ${normalizedPhone}`);
        return res.status(401).json({ 
          error: "Wrong password", 
          storedPassword: storedPassword // Added for debug as requested
        });
      }

      // 4. Create custom token with claims for immediate access
      const customToken = await admin.auth().createCustomToken(uid, {
        role: userData.role,
        membershipStatus: userData.membershipStatus,
        phone: normalizedPhone // Added phone to claims for rules
      });
      
      console.log(`Login successful for phone: ${normalizedPhone}, UID: ${uid}`);
      res.json({ token: customToken, uid, role: userData.role });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // NEW: API Route for registration
  app.post("/api/auth/register", async (req, res) => {
    const { phone, password, name, role, state, city, area, address, email } = req.body;

    if (!phone || !password || !name || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
      const normalizedPhone = normalizePhone(phone.toString().trim());
      const trimmedPassword = password.toString().trim();
      const trimmedName = name.toString().trim();
      const trimmedEmail = email ? email.toString().trim().toLowerCase() : null;

      // 1. Check if phone already exists
      const phoneSnapshot = await firestore.collection('users').where('phone', '==', normalizedPhone).limit(1).get();
      if (!phoneSnapshot.empty) {
        return res.status(400).json({ error: "An account with this phone number already exists." });
      }

      // 2. Use plain text password as requested
      // (Bcrypt hashing removed per user requirement)

      // 3. Create Firebase Auth user (without email)
      const userRecord = await admin.auth().createUser({
        displayName: trimmedName,
        phoneNumber: normalizedPhone,
        password: trimmedPassword
      });

      const uid = userRecord.uid;

      // 4. Create Firestore profile (NO PASSWORD STORED HERE)
      const profileData: any = {
        uid,
        name: trimmedName,
        role,
        membershipStatus: role === 'MASTER_ADMIN' ? 'ACTIVE' : 'PENDING',
        phone: normalizedPhone,
        state: state || '',
        city: city || '',
        area: area || '',
        address: address || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (trimmedEmail) profileData.email = trimmedEmail;

      await firestore.collection('users').doc(uid).set(profileData);

      // 5. Store plain text password in private auth_data collection (SINGLE SOURCE OF TRUTH)
      await firestore.collection('auth_data').doc(uid).set({
        password: trimmedPassword,
        updatedAt: new Date().toISOString()
      });

      // 6. Set custom claims
      await admin.auth().setCustomUserClaims(uid, { 
        role,
        membershipStatus: profileData.membershipStatus,
        phone: normalizedPhone
      });

      // 7. Create custom token for immediate login with claims
      const customToken = await admin.auth().createCustomToken(uid, { 
        role,
        membershipStatus: profileData.membershipStatus,
        phone: normalizedPhone
      });

      res.json({ token: customToken, uid, role });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register", details: error.message });
    }
  });

  // API Route for getting Auth Email from identifier (phone or email) - DEPRECATED
  app.post("/api/auth/get-email", async (req, res) => {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: "Missing identifier" });
    }

    try {
      const email = await getAuthEmail(identifier);
      res.json({ email });
    } catch (error: any) {
      console.error("Error getting auth email:", error);
      res.status(500).json({ error: "Failed to get auth email", details: error.message });
    }
  });

  // API Route for resetting password via Firebase Admin
  app.post("/api/auth/reset-password", async (req, res) => {
    const { identifier, newPassword, idToken } = req.body;

    if (!identifier || !newPassword || !idToken) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const adminApp = getFirebaseAdmin();
      const adminAuth = admin.auth(adminApp);
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      
      // Ensure the token belongs to the user with the provided phone number
      const normalizedPhone = normalizePhone(identifier.toString().trim());
      const trimmedPassword = newPassword.toString().trim();
      
      // decodedToken.phone_number contains the verified phone number from OTP
      if (decodedToken.phone_number !== normalizedPhone) {
        console.error(`Phone mismatch: Token phone ${decodedToken.phone_number} vs Input phone ${normalizedPhone}`);
        return res.status(403).json({ error: "Unauthorized: Phone number mismatch" });
      }

      const firestore = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

      // 1. Find user by phone in Firestore to get the correct UID used in the app
      const userSnapshot = await firestore.collection('users').where('phone', '==', normalizedPhone).limit(1).get();
      
      if (userSnapshot.empty) {
        console.error(`User not found in Firestore for phone: ${normalizedPhone}`);
        return res.status(404).json({ error: "User profile not found in database" });
      }

      const firestoreUid = userSnapshot.docs[0].id;
      console.log(`Resetting password for Firestore UID: ${firestoreUid} (Auth UID: ${decodedToken.uid})`);

      // 2. Use plain text password as requested
      // (Bcrypt hashing removed)

      // 3. Update plain text password in auth_data (SINGLE SOURCE OF TRUTH)
      await firestore.collection('auth_data').doc(firestoreUid).set({
        password: trimmedPassword,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Remove legacy fields from users if they exist (cleanup)
      await firestore.collection('users').doc(firestoreUid).update({
        password: admin.firestore.FieldValue.delete(),
        passwordHash: admin.firestore.FieldValue.delete(),
        updatedAt: new Date().toISOString()
      }).catch(() => {}); // Ignore if fields don't exist

      // 4. Also update Firebase Auth password if possible (optional but good for consistency)
      try {
        await admin.auth().updateUser(firestoreUid, {
          password: trimmedPassword
        });
      } catch (authUpdateError) {
        console.warn("Could not update Firebase Auth password (might be phone-only user):", authUpdateError);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error resetting password via Firebase Admin:", error);
      res.status(500).json({ error: "Failed to reset password", details: error.message });
    }
  });

  // API Route for sending Push Notifications via FCM
  app.post("/api/send-push-notification", async (req, res) => {
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
  app.post("/api/admin/create-user", async (req, res) => {
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

      // 1. Use plain text password
      // (Bcrypt hashing removed)

      // 2. Create Firebase Auth user (without email)
      const userRecord = await admin.auth().createUser({
        displayName: trimmedName,
        phoneNumber: normalizedPhone,
        password: trimmedPassword
      });

      const uid = userRecord.uid;

      // 3. Create Firestore profile (NO PASSWORD STORED HERE)
      const profileData: any = {
        uid,
        name: trimmedName,
        role,
        membershipStatus: 'ACTIVE', // Admin-created users are active by default
        phone: normalizedPhone,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (trimmedEmail) profileData.email = trimmedEmail;

      await firestore.collection('users').doc(uid).set(profileData);

      // 4. Store plain text password in private auth_data collection (SINGLE SOURCE OF TRUTH)
      await firestore.collection('auth_data').doc(uid).set({
        password: trimmedPassword,
        updatedAt: new Date().toISOString()
      });

      // 5. Set custom claims
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
  app.post("/api/admin/update-user", async (req, res) => {
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
      // Master Admin can update anyone, Chapter Admin can update members
      if (adminData?.role !== 'MASTER_ADMIN' && adminData?.role !== 'CHAPTER_ADMIN') {
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions." });
      }

      const authUpdateData: any = {};
      if (displayName) authUpdateData.displayName = displayName;

      await admin.auth().updateUser(uid, authUpdateData);

      // Handle password update if provided
      if (password) {
        // Update auth_data with plain text password (SINGLE SOURCE OF TRUTH)
        await firestore.collection('auth_data').doc(uid).set({
          password: password,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // Cleanup users collection
        await firestore.collection('users').doc(uid).update({
          password: admin.firestore.FieldValue.delete(),
          passwordHash: admin.firestore.FieldValue.delete(),
          updatedAt: new Date().toISOString()
        }).catch(() => {});

        // Also update Auth password
        await admin.auth().updateUser(uid, { password });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user via Firebase Admin:", error);
      res.status(500).json({ error: "Failed to update user", details: error.message });
    }
  });

  // API Route for deleting a user (Admin only)
  app.post("/api/auth/delete-user", async (req, res) => {
    const { uid, adminUid } = req.body;

    console.log(`Server: Delete request received for UID: ${uid} from Admin UID: ${adminUid}`);

    if (!uid || !adminUid) {
      console.error("Server: Missing required fields (uid or adminUid)");
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      getFirebaseAdmin();
      
      // Verify admin status
      const firestore = getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId);
      const adminDoc = await firestore.collection('users').doc(adminUid).get();
      if (!adminDoc.exists) {
        console.error(`Server: Admin document not found for UID: ${adminUid}`);
        return res.status(403).json({ error: "Unauthorized: Admin profile not found." });
      }

      const adminData = adminDoc.data();
      if (adminData?.role !== 'MASTER_ADMIN' && adminData?.role !== 'CHAPTER_ADMIN') {
        console.error(`Server: User ${adminUid} is not authorized. Role: ${adminData?.role}`);
        return res.status(403).json({ error: "Unauthorized: Insufficient permissions." });
      }

      // Delete from Auth
      try {
        await admin.auth().deleteUser(uid);
        console.log(`Server: Successfully deleted user ${uid} from Auth`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          console.warn(`Server: User ${uid} not found in Auth, proceeding to delete from Firestore`);
        } else {
          throw authError;
        }
      }
      
      // Delete from Firestore
      await getFirestore(getFirebaseAdmin(), firebaseConfig.firestoreDatabaseId).collection('users').doc(uid).delete();
      console.log(`Server: Successfully deleted user ${uid} from Firestore`);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Server: Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user", details: error.message });
    }
  });

  // 404 handler for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  // Global Error Handler for JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global error handler:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.stack : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
