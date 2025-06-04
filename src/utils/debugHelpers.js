import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';

// Debug helper functions for troubleshooting message display issues
export const debugHelpers = {
  // Check messages in a specific channel
  checkChannelMessages: async (channelId) => {
    try {
      console.log('[DebugHelper] Checking messages for channel:', channelId);
      
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      console.log('[DebugHelper] Found', snapshot.size, 'messages');
      
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        });
      });
      
      console.log('[DebugHelper] Messages:', messages);
      return messages;
    } catch (error) {
      console.error('[DebugHelper] Error checking messages:', error);
      throw error;
    }
  },
  
  // List all channels in all workspaces
  listAllChannels: async () => {
    try {
      console.log('[DebugHelper] Listing all channels...');
      
      const channelsRef = collection(firestore, 'channels');
      const snapshot = await getDocs(channelsRef);
      
      const channels = [];
      snapshot.forEach(doc => {
        channels.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('[DebugHelper] Found', channels.length, 'channels:', channels);
      return channels;
    } catch (error) {
      console.error('[DebugHelper] Error listing channels:', error);
      throw error;
    }
  },
  
  // Check channel structure
  checkChannelStructure: async (channelId) => {
    try {
      console.log('[DebugHelper] Checking channel structure:', channelId);
      
      const channelRef = doc(firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (!channelDoc.exists()) {
        console.error('[DebugHelper] Channel does not exist!');
        return null;
      }
      
      const channelData = channelDoc.data();
      console.log('[DebugHelper] Channel data:', channelData);
      
      // Check messages subcollection
      const messages = await debugHelpers.checkChannelMessages(channelId);
      
      return {
        channel: channelData,
        messageCount: messages.length,
        messages
      };
    } catch (error) {
      console.error('[DebugHelper] Error checking channel structure:', error);
      throw error;
    }
  },
  
  // Check all workspaces
  listAllWorkspaces: async () => {
    try {
      console.log('[DebugHelper] Listing all workspaces...');
      
      const workspacesRef = collection(firestore, 'workspaces');
      const snapshot = await getDocs(workspacesRef);
      
      const workspaces = [];
      snapshot.forEach(doc => {
        workspaces.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('[DebugHelper] Found', workspaces.length, 'workspaces:', workspaces);
      return workspaces;
    } catch (error) {
      console.error('[DebugHelper] Error listing workspaces:', error);
      throw error;
    }
  }
};

// Attach to window for easy console access
if (typeof window !== 'undefined') {
  window.debugHelpers = debugHelpers;
  console.log('[DebugHelper] Debug helpers attached to window.debugHelpers');
}

export default debugHelpers;