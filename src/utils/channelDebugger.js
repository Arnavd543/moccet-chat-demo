import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../config/firebase';

export const channelDebugger = {
  // Check if a channel exists and is valid
  async checkChannel(channelId) {
    console.log(`[ChannelDebugger] Checking channel: ${channelId}`);
    
    try {
      const channelRef = doc(firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (!channelDoc.exists()) {
        console.error(`[ChannelDebugger] Channel ${channelId} does not exist in Firestore`);
        return {
          exists: false,
          error: 'Channel not found'
        };
      }
      
      const channelData = channelDoc.data();
      console.log(`[ChannelDebugger] Channel data:`, channelData);
      
      return {
        exists: true,
        data: {
          id: channelDoc.id,
          ...channelData
        },
        workspaceId: channelData.workspaceId,
        memberCount: channelData.members?.length || 0,
        type: channelData.type,
        createdAt: channelData.createdAt
      };
    } catch (error) {
      console.error(`[ChannelDebugger] Error checking channel:`, error);
      return {
        exists: false,
        error: error.message
      };
    }
  },

  // Check messages in a channel
  async checkChannelMessages(channelId) {
    console.log(`[ChannelDebugger] Checking messages for channel: ${channelId}`);
    
    try {
      // First verify channel exists
      const channelCheck = await this.checkChannel(channelId);
      if (!channelCheck.exists) {
        return {
          error: 'Channel does not exist',
          channelExists: false
        };
      }
      
      // Query messages
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(10));
      const snapshot = await getDocs(q);
      
      console.log(`[ChannelDebugger] Found ${snapshot.size} messages`);
      
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          content: data.content?.substring(0, 50) || '[No content]',
          senderId: data.senderId || data.userId,
          senderName: data.senderName || data.sender?.displayName || 'Unknown',
          createdAt: data.createdAt,
          hasValidId: !!doc.id && doc.id !== '',
          hasValidSenderId: !!(data.senderId || data.userId)
        });
      });
      
      return {
        channelExists: true,
        messageCount: snapshot.size,
        messages,
        channelData: channelCheck.data
      };
    } catch (error) {
      console.error(`[ChannelDebugger] Error checking messages:`, error);
      return {
        error: error.message,
        channelExists: false
      };
    }
  },

  // Test sending a message
  async testSendMessage(channelId, userId, content = 'Test message') {
    console.log(`[ChannelDebugger] Testing message send to channel: ${channelId}`);
    
    try {
      const { firestoreService } = await import('../services/firestore');
      
      const result = await firestoreService.sendMessage(
        {
          channelId,
          userId,
          type: 'text',
          content,
          workspaceId: 'test-workspace'
        },
        {
          uid: userId,
          displayName: 'Test User',
          email: 'test@example.com',
          photoURL: null,
          status: 'online'
        }
      );
      
      console.log(`[ChannelDebugger] Test message sent:`, result);
      return {
        success: true,
        messageId: result.id,
        result
      };
    } catch (error) {
      console.error(`[ChannelDebugger] Test message failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Debug all channels in a workspace
  async debugWorkspaceChannels(workspaceId) {
    console.log(`[ChannelDebugger] Debugging workspace channels: ${workspaceId}`);
    
    try {
      const { firestoreService } = await import('../services/firestore');
      const channels = await firestoreService.getChannels(workspaceId);
      
      console.log(`[ChannelDebugger] Found ${channels.length} channels`);
      
      const channelInfo = [];
      for (const channel of channels) {
        const messageCheck = await this.checkChannelMessages(channel.id);
        channelInfo.push({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          memberCount: channel.members?.length || 0,
          messageCount: messageCheck.messageCount || 0,
          hasMessages: messageCheck.messageCount > 0,
          lastMessageAt: channel.lastMessageAt
        });
      }
      
      return {
        workspaceId,
        channelCount: channels.length,
        channels: channelInfo
      };
    } catch (error) {
      console.error(`[ChannelDebugger] Error debugging workspace:`, error);
      return {
        error: error.message
      };
    }
  }
};

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  window.channelDebugger = channelDebugger;
}

export default channelDebugger;