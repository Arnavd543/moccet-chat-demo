import { firestore } from '../config/firebase';
import { collection, getDocs, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export const debugFirestore = {
  // List all channels
  listChannels: async () => {
    try {
      const channelsRef = collection(firestore, 'channels');
      const snapshot = await getDocs(channelsRef);
      const channels = [];
      snapshot.forEach(doc => {
        channels.push({ id: doc.id, ...doc.data() });
      });
      console.log('[DebugFirestore] Found channels:', channels);
      return channels;
    } catch (error) {
      console.error('[DebugFirestore] Error listing channels:', error);
      throw error;
    }
  },

  // Get messages for a channel
  getChannelMessages: async (channelId) => {
    try {
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      console.log(`[DebugFirestore] Found ${messages.length} messages in channel ${channelId}:`, messages);
      return messages;
    } catch (error) {
      console.error('[DebugFirestore] Error getting messages:', error);
      throw error;
    }
  },

  // Watch messages in real-time
  watchChannel: (channelId, callback) => {
    console.log('[DebugFirestore] Setting up watcher for channel:', channelId);
    const messagesRef = collection(firestore, 'channels', channelId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(20));
    
    return onSnapshot(q, 
      (snapshot) => {
        console.log('[DebugFirestore] Snapshot received:', {
          size: snapshot.size,
          docs: snapshot.docs.length,
          changes: snapshot.docChanges().length
        });
        
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        
        if (callback) {
          callback(messages);
        } else {
          console.log('[DebugFirestore] Messages:', messages);
        }
      },
      (error) => {
        console.error('[DebugFirestore] Watch error:', error);
      }
    );
  },

  // Get channel details
  getChannelDetails: async (channelId) => {
    try {
      const channels = await debugFirestore.listChannels();
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        console.log('[DebugFirestore] Channel details:', channel);
        const messages = await debugFirestore.getChannelMessages(channelId);
        console.log('[DebugFirestore] Channel has', messages.length, 'messages');
        return { channel, messages };
      } else {
        console.log('[DebugFirestore] Channel not found:', channelId);
        return null;
      }
    } catch (error) {
      console.error('[DebugFirestore] Error getting channel details:', error);
      throw error;
    }
  }
};

// Attach to window for console access
if (typeof window !== 'undefined') {
  window.debugFirestore = debugFirestore;
  console.log('[DebugFirestore] Debug utilities available at window.debugFirestore');
  console.log('Available commands:');
  console.log('- window.debugFirestore.listChannels()');
  console.log('- window.debugFirestore.getChannelMessages(channelId)');
  console.log('- window.debugFirestore.watchChannel(channelId)');
  console.log('- window.debugFirestore.getChannelDetails(channelId)');
}