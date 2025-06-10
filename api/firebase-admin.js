const admin = require('firebase-admin');

// For local development, check if we have actual credentials (not from .env files loaded by Vercel)
// The private key should be a long string starting with "-----BEGIN PRIVATE KEY-----"
const hasValidPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY && 
                          process.env.FIREBASE_ADMIN_PRIVATE_KEY.includes('BEGIN PRIVATE KEY');
const useEmulator = !hasValidPrivateKey || process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true' || process.env.USE_FIREBASE_EMULATOR === 'true';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (useEmulator) {
      // When using emulator, initialize without credentials
      admin.initializeApp({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || 'moccet-slack',
      });
      
      // Set up emulator environment variables
      process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
      process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
      
      console.log('Firebase Admin initialized successfully (Emulator Mode)');
    } else {
      // Production mode - use service account credentials
      let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
      if (privateKey) {
        // Remove surrounding quotes if present
        privateKey = privateKey.replace(/^["']|["']$/g, '');
        // Replace literal \n with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('Firebase Admin initialized successfully');
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}

module.exports = admin;