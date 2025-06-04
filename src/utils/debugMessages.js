// Debug utility to check message flow
export const debugMessages = {
  // Check MessageContext state
  checkContext: () => {
    const debugPanel = window.debugPanel;
    if (!debugPanel) {
      console.error('Debug panel not initialized');
      return;
    }
    
    const state = debugPanel.getState();
    console.log('=== MESSAGE CONTEXT STATE ===');
    console.log('Active Channel:', state.activeChannelId);
    console.log('Active Workspace:', state.activeWorkspaceId);
    console.log('Current User:', state.currentUser?.uid);
    console.log('Messages in context:', state.messageContext);
    console.log('Messages for current channel:', state.messages);
    console.log('Message count:', state.messageCount);
    
    return state;
  },
  
  // Check Firestore directly
  checkFirestore: async () => {
    if (!window.debugFirestore) {
      console.error('Debug Firestore not initialized');
      return;
    }
    
    console.log('=== FIRESTORE STATE ===');
    
    // List channels
    const channels = await window.debugFirestore.listChannels();
    console.log('Channels:', channels);
    
    // Check messages for each channel
    for (const channel of channels) {
      const messages = await window.debugFirestore.getChannelMessages(channel.id);
      console.log(`Channel ${channel.name} (${channel.id}):`, messages.length, 'messages');
    }
    
    return { channels };
  },
  
  // Full diagnostic
  diagnose: async () => {
    console.log('=== FULL DIAGNOSTIC ===');
    
    // 1. Check context
    const contextState = debugMessages.checkContext();
    
    // 2. Check Firestore
    const firestoreState = await debugMessages.checkFirestore();
    
    // 3. Check if channel ID matches
    if (contextState && firestoreState) {
      const activeChannelId = contextState.activeChannelId;
      const channelExists = firestoreState.channels.some(c => c.id === activeChannelId);
      
      console.log('=== DIAGNOSTIC RESULTS ===');
      console.log('Active channel exists in Firestore:', channelExists);
      console.log('Messages in context for active channel:', contextState.messages?.length || 0);
      
      if (activeChannelId && channelExists) {
        const firestoreMessages = await window.debugFirestore.getChannelMessages(activeChannelId);
        console.log('Messages in Firestore for active channel:', firestoreMessages.length);
        console.log('First message in Firestore:', firestoreMessages[0]);
        console.log('First message in context:', contextState.messages?.[0]);
      }
    }
    
    return { contextState, firestoreState };
  },
  
  // Test the full flow
  testFlow: async (message = 'Test message from debugMessages') => {
    console.log('=== TESTING MESSAGE FLOW ===');
    
    // 1. Get current state
    const state = window.debugPanel.getState();
    if (!state.activeChannelId || !state.activeWorkspaceId) {
      console.error('No active channel or workspace');
      return;
    }
    
    console.log('1. Current state:', {
      channel: state.activeChannelId,
      workspace: state.activeWorkspaceId,
      currentMessages: state.messages.length
    });
    
    // 2. Send message
    console.log('2. Sending message:', message);
    try {
      const result = await window.debugPanel.sendTest(message);
      console.log('3. Message sent result:', result);
    } catch (error) {
      console.error('3. Failed to send:', error);
      return;
    }
    
    // 3. Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. Check if message appears
    const newState = window.debugPanel.getState();
    console.log('4. New message count:', newState.messages.length);
    console.log('5. Messages increased:', newState.messages.length > state.messages.length);
    
    // 5. Check Firestore
    const firestoreMessages = await window.debugFirestore.getChannelMessages(state.activeChannelId);
    console.log('6. Firestore message count:', firestoreMessages.length);
    
    // 6. Find our message
    const ourMessage = firestoreMessages.find(m => m.content === message);
    console.log('7. Our message in Firestore:', ourMessage ? 'FOUND' : 'NOT FOUND', ourMessage);
    
    const ourMessageInContext = newState.messages.find(m => m.content === message);
    console.log('8. Our message in context:', ourMessageInContext ? 'FOUND' : 'NOT FOUND', ourMessageInContext);
    
    return {
      messageSent: !!ourMessage,
      messageInContext: !!ourMessageInContext,
      messageCountIncreased: newState.messages.length > state.messages.length
    };
  }
};

// Attach to window
if (typeof window !== 'undefined') {
  window.debugMessages = debugMessages;
  console.log('[DebugMessages] Debug utilities available at window.debugMessages');
  console.log('Available commands:');
  console.log('- window.debugMessages.checkContext()');
  console.log('- window.debugMessages.checkFirestore()');
  console.log('- window.debugMessages.diagnose()');
  console.log('- window.debugMessages.testFlow()');
}