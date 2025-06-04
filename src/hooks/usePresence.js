import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { realtimeService } from '../services/realtime';
import { doc, updateDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

export const usePresence = () => {
  const { currentUser } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [userPresence, setUserPresence] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    // Initialize presence
    realtimeService.initializePresence(currentUser.uid);

    // Monitor connection
    const unsubscribeConnection = realtimeService.monitorConnection((connected) => {
      setIsOnline(connected);
      
      if (connected) {
        // Re-initialize presence on reconnection
        realtimeService.initializePresence(currentUser.uid);
      }
    });

    // Handle page visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        realtimeService.updateUserStatus(currentUser.uid, 'away');
      } else {
        realtimeService.updateUserStatus(currentUser.uid, 'online');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle before unload
    const handleBeforeUnload = () => {
      realtimeService.updateUserStatus(currentUser.uid, 'offline');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeConnection();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser]);

  // Subscribe to a user's presence
  const subscribeToUserPresence = (userId, callback) => {
    return realtimeService.subscribeToPresence(userId, (data) => {
      setUserPresence(prev => ({ ...prev, [userId]: data }));
      if (callback) callback(data);
    });
  };

  // Update user status
  const updateStatus = async (status) => {
    if (!currentUser) return;
    
    await realtimeService.updateUserStatus(currentUser.uid, status);
    
    // Also update Firestore for persistence
    const userRef = doc(firestore, 'users', currentUser.uid);
    await updateDoc(userRef, {
      status,
      lastSeen: new Date()
    });
  };

  return {
    isOnline,
    userPresence,
    subscribeToUserPresence,
    updateStatus
  };
};