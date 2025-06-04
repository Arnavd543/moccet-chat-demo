const {onRequest} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

admin.initializeApp();

const app = express();

// Configure CORS
app.use(cors({ 
  origin: true,
  credentials: true 
}));

// Global rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: "Too many requests, please try again later."
});

app.use(limiter);

// Verify App Check token
const verifyAppCheck = async (req, res, next) => {
  const appCheckToken = req.header("X-Firebase-AppCheck");

  if (!appCheckToken) {
    res.status(401).send("Unauthorized: Missing App Check token");
    return;
  }

  try {
    await admin.appCheck().verifyToken(appCheckToken);
    next();
  } catch (err) {
    console.error("App Check verification failed:", err);
    res.status(401).send("Unauthorized: Invalid App Check token");
  }
};

// Verify Firebase Auth token
const verifyAuth = async (req, res, next) => {
  const idToken = req.header("Authorization")?.replace("Bearer ", "");

  if (!idToken) {
    res.status(401).send("Unauthorized: No token provided");
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).send("Unauthorized: Invalid token");
  }
};

// Apply middleware to all /api routes
app.use("/api", verifyAppCheck);
app.use("/api", verifyAuth);

// API endpoints
app.post("/api/invite-user", async (req, res) => {
  try {
    const { email, workspaceId, role } = req.body;
    const inviterId = req.user.uid;

    // Check if inviter has permission
    const inviterDoc = await admin.firestore()
      .doc(`workspaces/${workspaceId}/members/${inviterId}`)
      .get();

    if (!inviterDoc.exists()) {
      return res.status(403).send("Forbidden: Not a workspace member");
    }

    const inviterRole = inviterDoc.data().role;
    if (!["owner", "admin"].includes(inviterRole)) {
      return res.status(403).send("Forbidden: Insufficient permissions");
    }

    // Create invitation
    const invitation = {
      email,
      workspaceId,
      role,
      invitedBy: inviterId,
      invitedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending"
    };

    await admin.firestore().collection("invitations").add(invitation);

    // Log action
    await admin.firestore().collection(`workspaces/${workspaceId}/auditLogs`).add({
      action: "USER_INVITED",
      userId: inviterId,
      targetEmail: email,
      role,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(200).json({ success: true, message: "Invitation sent" });
  } catch (error) {
    console.error("Error inviting user:", error);
    res.status(500).send("Internal server error");
  }
});

// Workspace creation with rate limiting
const workspaceCreationLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 workspaces per day
  skipSuccessfulRequests: false
});

app.post("/api/create-workspace", workspaceCreationLimit, async (req, res) => {
  try {
    const { name, description } = req.body;
    const ownerId = req.user.uid;

    // Create workspace
    const workspace = {
      name,
      description,
      ownerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      memberCount: 1,
      plan: "free"
    };

    const workspaceRef = await admin.firestore().collection("workspaces").add(workspace);

    // Add owner as member
    await workspaceRef.collection("members").doc(ownerId).set({
      role: "owner",
      joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      permissions: ["all"]
    });

    // Create default channels
    const generalChannel = {
      name: "general",
      description: "General discussion",
      workspaceId: workspaceRef.id,
      isPublic: true,
      members: [ownerId],
      admins: [ownerId],
      createdBy: ownerId,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection("channels").add(generalChannel);

    res.status(200).json({ 
      success: true, 
      workspaceId: workspaceRef.id 
    });
  } catch (error) {
    console.error("Error creating workspace:", error);
    res.status(500).send("Internal server error");
  }
});

// Export Express app as Cloud Function
exports.api = onRequest(app);

// Image processing function
exports.processUploadedImage = onObjectFinalized(async (event) => {
  const object = event.data;
  const filePath = object.name;
  const contentType = object.contentType;
  
  // Only process images
  if (!contentType || !contentType.startsWith('image/')) {
    console.log('File is not an image.');
    return null;
  }
  
  // Don't process thumbnails or already processed images
  if (filePath.includes('thumbnails/') || filePath.includes('_thumb') || filePath.includes('_preview')) {
    console.log('Already a thumbnail or processed image.');
    return null;
  }
  
  // Extract workspace and channel info from path
  const pathParts = filePath.split('/');
  if (pathParts.length < 5 || pathParts[0] !== 'workspaces') {
    console.log('Invalid file path structure.');
    return null;
  }
  
  const workspaceId = pathParts[1];
  const channelId = pathParts[3];
  const fileName = pathParts[pathParts.length - 1];
  
  // Import required modules for image processing
  const sharp = require('sharp');
  const path = require('path');
  const os = require('os');
  const fs = require('fs').promises;
  
  const bucket = admin.storage().bucket();
  const tempFilePath = path.join(os.tmpdir(), fileName);
  
  try {
    // Download the image
    await bucket.file(filePath).download({ destination: tempFilePath });
    
    // Generate thumbnail (150x150)
    const thumbFileName = `thumb_${fileName}`;
    const thumbFilePath = path.join(os.tmpdir(), thumbFileName);
    await sharp(tempFilePath)
      .resize(150, 150, { fit: 'cover', position: 'center' })
      .toFile(thumbFilePath);
    
    // Generate preview (800x600 max, maintaining aspect ratio)
    const previewFileName = `preview_${fileName}`;
    const previewFilePath = path.join(os.tmpdir(), previewFileName);
    await sharp(tempFilePath)
      .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
      .toFile(previewFilePath);
    
    // Upload thumbnail
    const thumbDestPath = `workspaces/${workspaceId}/channels/${channelId}/thumbnails/${thumbFileName}`;
    await bucket.upload(thumbFilePath, {
      destination: thumbDestPath,
      metadata: { contentType, metadata: object.metadata }
    });
    
    // Upload preview
    const previewDestPath = `workspaces/${workspaceId}/channels/${channelId}/images/${previewFileName}`;
    await bucket.upload(previewFilePath, {
      destination: previewDestPath,
      metadata: { contentType, metadata: object.metadata }
    });
    
    // Update the original file metadata with thumbnail and preview URLs
    const [thumbUrl] = await bucket.file(thumbDestPath).getSignedUrl({
      action: 'read',
      expires: '03-01-2500' // Far future date
    });
    
    const [previewUrl] = await bucket.file(previewDestPath).getSignedUrl({
      action: 'read',
      expires: '03-01-2500'
    });
    
    // Update metadata
    await bucket.file(filePath).setMetadata({
      metadata: {
        ...object.metadata,
        thumbnailUrl: thumbUrl,
        previewUrl: previewUrl,
        processedAt: new Date().toISOString()
      }
    });
    
    // Clean up temp files
    await fs.unlink(tempFilePath);
    await fs.unlink(thumbFilePath);
    await fs.unlink(previewFilePath);
    
    console.log('Image processing completed successfully');
    return null;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
});

// Clean up old files (optional - runs daily)
exports.cleanupOldFiles = onSchedule('every 24 hours', async (event) => {
  const bucket = admin.storage().bucket();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago
  
  try {
    const [files] = await bucket.getFiles();
    const deletePromises = [];
    
    for (const file of files) {
      const [metadata] = await file.getMetadata();
      const createdTime = new Date(metadata.timeCreated);
      
      if (createdTime < cutoffDate && metadata.metadata?.autoDelete === 'true') {
        deletePromises.push(file.delete());
        console.log(`Deleting old file: ${file.name}`);
      }
    }
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old files`);
    return null;
  } catch (error) {
    console.error('Error cleaning up old files:', error);
    throw error;
  }
});

// Existing auth triggers
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    await admin.firestore().collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      status: 'online',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeen: admin.firestore.FieldValue.serverTimestamp()
    });

    await admin.database().ref(`presence/${user.uid}`).set({
      online: true,
      lastSeen: admin.database.ServerValue.TIMESTAMP
    });

    console.log('User document created for:', user.uid);
  } catch (error) {
    console.error('Error creating user document:', error);
  }
});

exports.onUserDeleted = functions.auth.user().onDelete(async (user) => {
  try {
    await admin.firestore().collection('users').doc(user.uid).delete();
    await admin.database().ref(`presence/${user.uid}`).remove();
    console.log('User data cleaned up for:', user.uid);
  } catch (error) {
    console.error('Error cleaning up user data:', error);
  }
});

// Scheduled function to clean up old rate limit records
exports.cleanupRateLimits = onSchedule('every 24 hours', async (event) => {
  const cutoff = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
  );

  const batch = admin.firestore().batch();
  const snapshot = await admin.firestore()
    .collection('rateLimits')
    .where('windowStart', '<', cutoff)
    .get();

  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Cleaned up ${snapshot.size} old rate limit records`);
});