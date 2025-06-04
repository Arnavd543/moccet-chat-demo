// Emergency fix to get the app working
import { firestore } from '../config/firebase';
import { collection, doc, addDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';

export const emergencyFix = {
  // Fix channels without IDs
  fixChannels: async () => {
    console.log('=== FIXING CHANNELS ===');
    
    const channelsRef = collection(firestore, 'channels');
    const snapshot = await getDocs(channelsRef);
    
    let fixed = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (!docSnap.id || docSnap.id === '') {
        console.error('Found channel without ID:', data);
        // This shouldn't happen - Firestore always provides IDs
      } else {
        console.log('Channel OK:', docSnap.id, data.name);
      }
    }
    
    return { fixed, total: snapshot.size };
  },
  
  // Fix messages without IDs
  fixMessages: async (channelId) => {
    console.log('=== FIXING MESSAGES FOR CHANNEL ===', channelId);
    
    const messagesRef = collection(firestore, 'channels', channelId, 'messages');
    const snapshot = await getDocs(messagesRef);
    
    let fixed = 0;
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (!docSnap.id || docSnap.id === '') {
        console.error('Found message without ID:', data);
        // This shouldn't happen - Firestore always provides IDs
      } else {
        console.log('Message OK:', docSnap.id, data.content?.substring(0, 30));
      }
    }
    
    return { fixed, total: snapshot.size };
  },
  
  // Get debug panel manually
  getDebugPanel: () => {
    // Find React component instance
    const container = document.querySelector('#root');
    if (!container || !container._reactRootContainer) {
      console.error('React root not found');
      return null;
    }
    
    // Try to access the debug panel through React DevTools
    console.log('Attempting to access debug panel...');
    
    // Alternative: directly check window
    return {
      exists: !!window.debugPanel,
      methods: window.debugPanel ? Object.keys(window.debugPanel) : [],
      firestore: !!window.debugFirestore,
      quickTest: !!window.quickTest
    };
  },
  
  // Send a test message directly
  sendTestMessage: async (channelId, content = 'Emergency test message') => {
    console.log('=== SENDING TEST MESSAGE ===');
    
    try {
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const docRef = await addDoc(messagesRef, {
        content,
        senderId: 'test-user',
        senderName: 'Test User',
        userId: 'test-user',
        channelId,
        createdAt: new Date(),
        type: 'text',
        status: 'sent'
      });
      
      console.log('Message sent with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  },
  
  // List all data
  listAll: async () => {
    console.log('=== LISTING ALL DATA ===');
    
    // Get channels
    const channels = await window.debugFirestore.listChannels();
    console.log('Channels:', channels);
    
    // For each channel, get messages
    for (const channel of channels) {
      if (channel.id) {
        const messages = await window.debugFirestore.getChannelMessages(channel.id);
        console.log(`Channel ${channel.name} (${channel.id}): ${messages.length} messages`);
      }
    }
    
    return { channels };
  }
};

// Attach to window
window.emergencyFix = emergencyFix;
console.log('Emergency fix utilities available at window.emergencyFix');
console.log('Commands:');
console.log('- window.emergencyFix.fixChannels()');
console.log('- window.emergencyFix.fixMessages(channelId)');
console.log('- window.emergencyFix.getDebugPanel()');
console.log('- window.emergencyFix.sendTestMessage(channelId)');
console.log('- window.emergencyFix.listAll()');