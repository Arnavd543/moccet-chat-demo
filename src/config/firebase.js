import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getAnalytics } from 'firebase/analytics';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const realtimeDb = getDatabase(app);
export const storage = getStorage(app);
// Only initialize functions if using emulators or in production with Blaze plan
export const functions = process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true' || 
                        process.env.REACT_APP_ENABLE_FUNCTIONS === 'true' 
                        ? getFunctions(app) 
                        : null;

// Initialize Analytics (only in production)
export const analytics = process.env.REACT_APP_ENVIRONMENT === 'production' 
  ? getAnalytics(app) 
  : null;

// Connect to emulators in development
if (process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, 'localhost', 8080);
    connectDatabaseEmulator(realtimeDb, 'localhost', 9000);
    connectStorageEmulator(storage, 'localhost', 9199);
    if (functions) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    console.log('🔧 Connected to Firebase emulators');
  } catch (error) {
    console.log('🔧 Emulators already connected');
  }
}

// Initialize App Check
if (typeof window !== 'undefined') {
  if (process.env.REACT_APP_ENVIRONMENT === 'production') {
    // Production: Use ReCAPTCHA v3
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(process.env.REACT_APP_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    // Development: Use debug token
    // eslint-disable-next-line no-restricted-globals
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.REACT_APP_APPCHECK_DEBUG_TOKEN || true;
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LfMVOEpAAAAAMYATHsFaV-dMr0MJPebUgrLcfqz'), // Test key
      isTokenAutoRefreshEnabled: true
    });
  }
}

export default app;