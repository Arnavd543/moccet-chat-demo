// Debug helpers for troubleshooting message display issues

import { firestore } from './config/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Function to check messages in a specific channel
export const checkChannelMessages = async (channelId) => {
  console.log('[DebugHelper] Checking messages for channel:', channelId);
  
  try {
    const messagesRef = collection(firestore, 'channels', channelId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    
    console.log('[DebugHelper] Found messages:', snapshot.size);
    
    const messages = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        content: data.content,
        senderId: data.senderId,
        senderName: data.senderName,
        createdAt: data.createdAt,
        ...data
      });
    });
    
    console.log('[DebugHelper] Messages:', messages);
    return messages;
  } catch (error) {
    console.error('[DebugHelper] Error checking messages:', error);
    throw error;
  }
};

// Function to list all channels
export const listAllChannels = async () => {
  console.log('[DebugHelper] Listing all channels...');
  
  try {
    const channelsRef = collection(firestore, 'channels');
    const snapshot = await getDocs(channelsRef);
    
    console.log('[DebugHelper] Found channels:', snapshot.size);
    
    const channels = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      channels.push({
        id: doc.id,
        name: data.name,
        type: data.type,
        workspaceId: data.workspaceId,
        memberCount: data.members?.length || 0
      });
    });
    
    console.log('[DebugHelper] Channels:', channels);
    return channels;
  } catch (error) {
    console.error('[DebugHelper] Error listing channels:', error);
    throw error;
  }
};

// Function to check channel structure
export const checkChannelStructure = async (channelId) => {
  console.log('[DebugHelper] Checking channel structure for:', channelId);
  
  try {
    // Check if channel exists
    const channelsRef = collection(firestore, 'channels');
    const channelSnapshot = await getDocs(channelsRef);
    
    let channelExists = false;
    let channelData = null;
    
    channelSnapshot.forEach((doc) => {
      if (doc.id === channelId) {
        channelExists = true;
        channelData = { id: doc.id, ...doc.data() };
      }
    });
    
    console.log('[DebugHelper] Channel exists:', channelExists);
    console.log('[DebugHelper] Channel data:', channelData);
    
    // Check messages subcollection
    const messages = await checkChannelMessages(channelId);
    
    return {
      exists: channelExists,
      data: channelData,
      messageCount: messages.length,
      messages: messages
    };
  } catch (error) {
    console.error('[DebugHelper] Error checking channel structure:', error);
    throw error;
  }
};

// Expose functions globally for console debugging
if (typeof window !== 'undefined') {
  window.debugHelpers = {
    checkChannelMessages,
    listAllChannels,
    checkChannelStructure
  };
  console.log('[DebugHelper] Debug helpers available in window.debugHelpers');
}