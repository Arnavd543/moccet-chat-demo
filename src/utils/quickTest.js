import { firestore } from '../config/firebase';
import { collection, addDoc, getDocs, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';

export const quickTest = {
  // Get current user ID
  getCurrentUserId: () => {
    const { auth } = window.firebase || {};
    if (auth && auth.currentUser) {
      return auth.currentUser.uid;
    }
    // Try to get from localStorage as backup
    const stored = localStorage.getItem('firebase:authUser:' + Object.keys(localStorage).find(k => k.includes('firebase:authUser:')));
    if (stored) {
      try {
        return JSON.parse(stored).uid;
      } catch (e) {}
    }
    return null;
  },

  // Test basic Firestore connectivity
  testConnection: async () => {
    try {
      console.log('[QuickTest] Testing Firestore connection...');
      const testRef = doc(firestore, 'test', 'test');
      const testDoc = await getDoc(testRef);
      console.log('[QuickTest] Connection successful, doc exists:', testDoc.exists());
      return true;
    } catch (error) {
      console.error('[QuickTest] Connection failed:', error);
      return false;
    }
  },

  // Test channel read
  testChannelRead: async (channelId) => {
    try {
      console.log('[QuickTest] Testing channel read for:', channelId);
      const channelRef = doc(firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (channelDoc.exists()) {
        console.log('[QuickTest] Channel data:', channelDoc.data());
        return channelDoc.data();
      } else {
        console.log('[QuickTest] Channel does not exist');
        return null;
      }
    } catch (error) {
      console.error('[QuickTest] Channel read failed:', error);
      throw error;
    }
  },

  // Test direct message write (bypassing all app logic)
  testDirectWrite: async (channelId, userId, content) => {
    try {
      console.log('[QuickTest] Testing direct write to channel:', channelId);
      
      // Use serverTimestamp for createdAt
      const { serverTimestamp } = await import('firebase/firestore');
      
      const messageData = {
        channelId,
        userId,
        senderId: userId,
        content,
        type: 'text',
        createdAt: serverTimestamp(),
        status: 'sent',
        senderName: 'Test User',
        attachments: []
      };
      
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const docRef = await addDoc(messagesRef, messageData);
      
      console.log('[QuickTest] Message written with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('[QuickTest] Direct write failed:', error);
      throw error;
    }
  },

  // Test message read
  testMessageRead: async (channelId) => {
    try {
      console.log('[QuickTest] Reading messages from channel:', channelId);
      
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('[QuickTest] Found', messages.length, 'messages:', messages);
      return messages;
    } catch (error) {
      console.error('[QuickTest] Message read failed:', error);
      throw error;
    }
  },

  // Test real-time subscription
  testSubscription: (channelId, duration = 10000) => {
    console.log('[QuickTest] Setting up subscription for', duration, 'ms');
    
    const messagesRef = collection(firestore, 'channels', channelId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(10));
    
    let changeCount = 0;
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('[QuickTest] Snapshot received:', {
          size: snapshot.size,
          changes: snapshot.docChanges().length
        });
        
        snapshot.docChanges().forEach(change => {
          changeCount++;
          console.log('[QuickTest] Change', changeCount, ':', {
            type: change.type,
            id: change.doc.id,
            data: change.doc.data()
          });
        });
      },
      (error) => {
        console.error('[QuickTest] Subscription error:', error);
      }
    );
    
    // Auto-unsubscribe after duration
    setTimeout(() => {
      console.log('[QuickTest] Unsubscribing after', changeCount, 'changes');
      unsubscribe();
    }, duration);
    
    return unsubscribe;
  }
};

// Attach to window
if (typeof window !== 'undefined') {
  window.quickTest = quickTest;
  console.log('[QuickTest] Test utilities available at window.quickTest');
}