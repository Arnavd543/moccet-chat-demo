// Message testing utilities
import { firestoreService } from '../services/firestore';
import { createMessage } from '../models';

export const messageTest = {
  // Test message creation model
  testMessageModel: () => {
    const testData = {
      channelId: 'test-channel',
      workspaceId: 'test-workspace',
      userId: 'test-user-123',
      senderId: 'test-user-123',
      content: 'Test message content',
      sender: {
        uid: 'test-user-123',
        displayName: 'Test User',
        email: 'test@example.com',
        photoURL: null
      },
      senderName: 'Test User',
      senderAvatar: null
    };
    
    const message = createMessage(testData);
    console.log('[MessageTest] Created message model:', message);
    console.log('[MessageTest] Has userId:', !!message.userId);
    console.log('[MessageTest] Has senderId:', !!message.senderId);
    console.log('[MessageTest] userId value:', message.userId);
    console.log('[MessageTest] senderId value:', message.senderId);
    
    return message;
  },
  
  // Test the full send flow
  testSendFlow: async (channelId, workspaceId, userId) => {
    try {
      console.log('[MessageTest] Testing send flow with:', {
        channelId,
        workspaceId,
        userId
      });
      
      const messageData = {
        channelId,
        workspaceId,
        userId,
        content: 'Test message from messageTest ' + Date.now(),
        type: 'text',
        attachments: []
      };
      
      const senderInfo = {
        uid: userId,
        displayName: 'Test User',
        email: 'test@example.com',
        photoURL: null,
        status: 'online'
      };
      
      const result = await firestoreService.sendMessage(messageData, senderInfo);
      console.log('[MessageTest] Send result:', result);
      return result;
    } catch (error) {
      console.error('[MessageTest] Send failed:', error);
      throw error;
    }
  }
};

// Attach to window for console access
if (typeof window !== 'undefined') {
  window.messageTest = messageTest;
  console.log('[MessageTest] Test utilities available at window.messageTest');
}