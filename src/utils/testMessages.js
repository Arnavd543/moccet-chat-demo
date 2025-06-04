import { firestoreService } from '../services/firestore';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { firestore } from '../config/firebase';

export const testMessages = {
  // Test the complete message flow
  async runFullTest(workspaceId, channelId, userId) {
    console.log('=== Starting Full Message Test ===');
    console.log('Workspace:', workspaceId);
    console.log('Channel:', channelId);
    console.log('User:', userId);
    
    const results = {
      channelCheck: null,
      sendMessage: null,
      fetchMessages: null,
      subscription: null
    };
    
    try {
      // 1. Check if channel exists
      console.log('\n1. Checking channel existence...');
      const channelExists = await firestoreService.validateChannel(channelId);
      results.channelCheck = { exists: channelExists };
      console.log('Channel exists:', channelExists);
      
      if (!channelExists) {
        console.error('Channel does not exist!');
        return results;
      }
      
      // 2. Send a test message
      console.log('\n2. Sending test message...');
      const testContent = `Test message at ${new Date().toISOString()}`;
      const sentMessage = await firestoreService.sendMessage(
        {
          channelId,
          userId,
          type: 'text',
          content: testContent,
          workspaceId
        },
        {
          uid: userId,
          displayName: 'Test User',
          email: 'test@example.com',
          photoURL: null,
          status: 'online'
        }
      );
      
      results.sendMessage = {
        success: true,
        messageId: sentMessage.id,
        content: sentMessage.content
      };
      console.log('Message sent:', sentMessage.id);
      
      // 3. Fetch messages to verify
      console.log('\n3. Fetching messages...');
      const fetchedMessages = await firestoreService.getMessages(channelId, 10);
      results.fetchMessages = {
        count: fetchedMessages.messages.length,
        foundTestMessage: fetchedMessages.messages.some(m => m.id === sentMessage.id),
        messages: fetchedMessages.messages.map(m => ({
          id: m.id,
          content: m.content?.substring(0, 50),
          senderId: m.senderId || m.userId
        }))
      };
      console.log('Fetched messages:', results.fetchMessages.count);
      console.log('Found test message:', results.fetchMessages.foundTestMessage);
      
      // 4. Test subscription
      console.log('\n4. Testing subscription...');
      let subscriptionWorking = false;
      const unsubscribe = firestoreService.subscribeToMessages(
        channelId,
        (changes) => {
          console.log('Subscription fired:', changes.length, 'changes');
          subscriptionWorking = true;
        }
      );
      
      // Wait a moment for subscription to fire
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      results.subscription = { working: subscriptionWorking };
      unsubscribe();
      
    } catch (error) {
      console.error('Test error:', error);
      results.error = error.message;
    }
    
    console.log('\n=== Test Results ===');
    console.log(JSON.stringify(results, null, 2));
    return results;
  },
  
  // Quick test to send a message
  async quickSend(channelId, userId, content = 'Quick test message') {
    try {
      const result = await firestoreService.sendMessage(
        {
          channelId,
          userId,
          type: 'text',
          content,
          workspaceId: 'test'
        },
        {
          uid: userId,
          displayName: 'Quick Test',
          email: 'test@example.com',
          photoURL: null,
          status: 'online'
        }
      );
      console.log('Quick send successful:', result.id);
      return result;
    } catch (error) {
      console.error('Quick send failed:', error);
      throw error;
    }
  },
  
  // List all channels in the database
  async listAllChannels() {
    try {
      const channelsRef = collection(firestore, 'channels');
      const q = query(channelsRef, limit(20));
      const snapshot = await getDocs(q);
      
      const channels = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        channels.push({
          id: doc.id,
          name: data.name,
          workspaceId: data.workspaceId,
          type: data.type,
          memberCount: data.members?.length || 0
        });
      });
      
      console.log('Found channels:', channels);
      return channels;
    } catch (error) {
      console.error('Error listing channels:', error);
      throw error;
    }
  }
};

// Make available globally for console testing
if (typeof window !== 'undefined') {
  window.testMessages = testMessages;
}

export default testMessages;