import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { ref, set, onDisconnect, onValue } from 'firebase/database';
import { auth, firestore, realtimeDb } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Auto-logout timer
  const inactivityTimerRef = useRef(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (currentUser) {
      inactivityTimerRef.current = setTimeout(() => {
        // Call logout without dependency
        signOut(auth).catch(console.error);
      }, INACTIVITY_TIMEOUT);
    }
  }, [currentUser, INACTIVITY_TIMEOUT]);

  // Set up activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [currentUser, resetInactivityTimer]);

  // Create user profile in Firestore
  const createUserProfile = async (user, additionalData = {}) => {
    if (!user) return;

    const userRef = doc(firestore, 'users', user.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      const { displayName, email, photoURL } = user;
      try {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: displayName || '',
          email,
          photoURL: photoURL || '',
          status: 'online',
          bio: '',
          title: '',
          department: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          emailVerified: user.emailVerified,
          ...additionalData
        });
      } catch (error) {
        console.error('Error creating user profile:', error);
      }
    }
    
    return userRef;
  };

  // Manage user presence
  const managePresence = async (user) => {
    if (!user) return;

    const presenceRef = ref(realtimeDb, `presence/${user.uid}`);
    const userStatusRef = ref(realtimeDb, `status/${user.uid}`);

    // Set online status
    await set(presenceRef, {
      online: true,
      lastSeen: serverTimestamp()
    });

    await set(userStatusRef, 'online');

    // Set offline on disconnect
    onDisconnect(presenceRef).set({
      online: false,
      lastSeen: serverTimestamp()
    });

    onDisconnect(userStatusRef).set('offline');

    // Update Firestore on status change
    onValue(userStatusRef, async (snapshot) => {
      const status = snapshot.val();
      if (status && user.uid) {
        const userDocRef = doc(firestore, 'users', user.uid);
        await updateDoc(userDocRef, {
          status: status,
          lastSeen: serverTimestamp()
        });
      }
    });
  };

  // Sign up with email and password
  const signup = async (email, password, profileData) => {
    try {
      setError('');
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      if (profileData.displayName) {
        await updateProfile(user, {
          displayName: profileData.displayName
        });
      }

      // Send verification email
      await sendEmailVerification(user);

      // Create user profile
      await createUserProfile(user, profileData);
      
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with email and password
  const login = async (email, password) => {
    try {
      setError('');
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await managePresence(user);
      return user;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setError('');
      const provider = new GoogleAuthProvider();
      // Add additional scopes if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      // Force account selection
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      console.log('Attempting Google sign-in...');
      console.log('Auth instance:', auth);
      console.log('Auth current user:', auth.currentUser);
      
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in result:', result);
      const { user } = result;
      console.log('Google sign-in successful, user:', user.email);
      
      await createUserProfile(user);
      await managePresence(user);
      return user;
    } catch (error) {
      console.error('Google sign-in error in AuthContext:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // Check if it's a network error
      if (error.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled.');
      } else if (error.code === 'auth/popup-blocked') {
        setError('Popup was blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Please check Firebase Console settings.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setError('Google sign-in is not enabled in Firebase Console.');
      } else {
        setError(error.message || 'Failed to sign in with Google');
      }
      throw error;
    }
  };

  // Sign out
  const logout = async () => {
    try {
      if (currentUser) {
        // Update offline status
        const presenceRef = ref(realtimeDb, `presence/${currentUser.uid}`);
        const userStatusRef = ref(realtimeDb, `status/${currentUser.uid}`);
        
        await set(presenceRef, {
          online: false,
          lastSeen: serverTimestamp()
        });
        
        await set(userStatusRef, 'offline');
        
        // Update Firestore
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(userDocRef, {
          status: 'offline',
          lastSeen: serverTimestamp()
        });
      }
      
      await signOut(auth);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Send password reset email
  const resetPassword = async (email) => {
    try {
      setError('');
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Send email verification
  const sendVerificationEmail = async () => {
    try {
      setError('');
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Update user profile
  const updateUserProfile = async (updates) => {
    try {
      setError('');
      if (currentUser) {
        const userRef = doc(firestore, 'users', currentUser.uid);
        await updateDoc(userRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });

        // Update auth profile if display name or photo changed
        if (updates.displayName || updates.photoURL) {
          await updateProfile(currentUser, {
            displayName: updates.displayName || currentUser.displayName,
            photoURL: updates.photoURL || currentUser.photoURL
          });
        }
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          // Create profile if it doesn't exist
          console.log('[AuthContext] User profile not found, creating...');
          await createUserProfile(user);
          const newUserDoc = await getDoc(doc(firestore, 'users', user.uid));
          if (newUserDoc.exists()) {
            setUserProfile(newUserDoc.data());
          }
        }
        
        // Set up presence
        await managePresence(user);
        
        // Start inactivity timer
        resetInactivityTimer();
      } else {
        setUserProfile(null);
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [resetInactivityTimer]);

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    signInWithGoogle,
    resetPassword,
    sendVerificationEmail,
    updateUserProfile,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};