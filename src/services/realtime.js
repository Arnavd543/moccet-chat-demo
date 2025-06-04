import { 
  ref, 
  set, 
  onValue, 
  onDisconnect, 
  serverTimestamp,
  push,
  remove,
  off
} from 'firebase/database';
import { realtimeDb } from '../config/firebase';

class RealtimeService {
  constructor() {
    this.presenceRef = null;
    this.typingListeners = {};
    this.presenceListeners = {};
  }

  // Initialize user presence
  async initializePresence(userId) {
    const userStatusRef = ref(realtimeDb, `status/${userId}`);
    const userPresenceRef = ref(realtimeDb, `presence/${userId}`);
    
    // Set online status
    await set(userStatusRef, 'online');
    await set(userPresenceRef, {
      online: true,
      lastSeen: serverTimestamp()
    });

    // Set offline on disconnect
    onDisconnect(userStatusRef).set('offline');
    onDisconnect(userPresenceRef).set({
      online: false,
      lastSeen: serverTimestamp()
    });

    this.presenceRef = userPresenceRef;
  }

  // Update user status
  async updateUserStatus(userId, status) {
    const validStatuses = ['online', 'away', 'busy', 'offline'];
    if (!validStatuses.includes(status)) return;

    const userStatusRef = ref(realtimeDb, `status/${userId}`);
    await set(userStatusRef, status);

    if (status === 'offline') {
      const userPresenceRef = ref(realtimeDb, `presence/${userId}`);
      await set(userPresenceRef, {
        online: false,
        lastSeen: serverTimestamp()
      });
    }
  }

  // Set typing status
  async setTypingStatus(channelId, userId, isTyping, userInfo = {}) {
    const typingRef = ref(realtimeDb, `typing/${channelId}/${userId}`);
    
    if (isTyping) {
      await set(typingRef, {
        isTyping: true,
        startedAt: serverTimestamp(),
        userName: userInfo.userName || '',
        userPhoto: userInfo.userPhoto || ''
      });
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        remove(typingRef);
      }, 10000);
    } else {
      await remove(typingRef);
    }
  }

  // Subscribe to typing indicators for a channel
  subscribeToTyping(channelId, callback) {
    const typingRef = ref(realtimeDb, `typing/${channelId}`);
    
    const listener = onValue(typingRef, (snapshot) => {
      const typingUsers = {};
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          typingUsers[child.key] = child.val();
        });
      }
      callback(typingUsers);
    });

    this.typingListeners[channelId] = listener;
    return () => this.unsubscribeFromTyping(channelId);
  }

  // Unsubscribe from typing indicators
  unsubscribeFromTyping(channelId) {
    if (this.typingListeners[channelId]) {
      const typingRef = ref(realtimeDb, `typing/${channelId}`);
      off(typingRef, 'value', this.typingListeners[channelId]);
      delete this.typingListeners[channelId];
    }
  }

  // Subscribe to user presence
  subscribeToPresence(userId, callback) {
    const presenceRef = ref(realtimeDb, `presence/${userId}`);
    const statusRef = ref(realtimeDb, `status/${userId}`);
    
    let presenceData = {};
    let statusData = 'offline';

    const presenceListener = onValue(presenceRef, (snapshot) => {
      presenceData = snapshot.val() || { online: false };
      callback({ ...presenceData, status: statusData });
    });

    const statusListener = onValue(statusRef, (snapshot) => {
      statusData = snapshot.val() || 'offline';
      callback({ ...presenceData, status: statusData });
    });

    this.presenceListeners[userId] = { presenceListener, statusListener };
    
    return () => this.unsubscribeFromPresence(userId);
  }

  // Unsubscribe from presence
  unsubscribeFromPresence(userId) {
    if (this.presenceListeners[userId]) {
      const presenceRef = ref(realtimeDb, `presence/${userId}`);
      const statusRef = ref(realtimeDb, `status/${userId}`);
      
      off(presenceRef, 'value', this.presenceListeners[userId].presenceListener);
      off(statusRef, 'value', this.presenceListeners[userId].statusListener);
      
      delete this.presenceListeners[userId];
    }
  }

  // Subscribe to multiple users' presence
  subscribeToMultiplePresence(userIds, callback) {
    const unsubscribes = userIds.map(userId => 
      this.subscribeToPresence(userId, (data) => {
        callback(userId, data);
      })
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }

  // Active channel tracking
  async setActiveChannel(userId, channelId) {
    const activeChannelRef = ref(realtimeDb, `activeChannels/${userId}`);
    await set(activeChannelRef, {
      channelId,
      joinedAt: serverTimestamp()
    });

    onDisconnect(activeChannelRef).remove();
  }

  // Get active users in channel
  subscribeToChannelPresence(channelId, callback) {
    const activeChannelsRef = ref(realtimeDb, 'activeChannels');
    
    const listener = onValue(activeChannelsRef, (snapshot) => {
      const activeUsers = [];
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val();
          if (data.channelId === channelId) {
            activeUsers.push({
              userId: child.key,
              ...data
            });
          }
        });
      }
      callback(activeUsers);
    });

    return () => {
      off(activeChannelsRef, 'value', listener);
    };
  }

  // Connection state monitoring
  monitorConnection(callback) {
    const connectedRef = ref(realtimeDb, '.info/connected');
    
    const listener = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      callback(connected);
    });

    return () => {
      off(connectedRef, 'value', listener);
    };
  }
}

export const realtimeService = new RealtimeService();