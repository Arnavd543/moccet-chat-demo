// Message debugging utility
export const messageDebugger = {
  // Check if a channel exists in Firestore
  checkChannelExists: async (channelId) => {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const { firestore } = await import('../config/firebase');
      
      const channelRef = doc(firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      
      console.log('[MessageDebugger] Channel check:', {
        channelId,
        exists: channelDoc.exists(),
        data: channelDoc.data()
      });
      
      return channelDoc.exists();
    } catch (error) {
      console.error('[MessageDebugger] Error checking channel:', error);
      return false;
    }
  },
  
  // List all messages in a channel
  listChannelMessages: async (channelId) => {
    try {
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const { firestore } = await import('../config/firebase');
      
      const messagesRef = collection(firestore, 'channels', channelId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('[MessageDebugger] Messages in channel', channelId, ':', messages);
      return messages;
    } catch (error) {
      console.error('[MessageDebugger] Error listing messages:', error);
      return [];
    }
  },
  
  // Check subscription status
  checkSubscription: (channelId, subscriptions) => {
    const isSubscribed = !!subscriptions.current[channelId];
    console.log('[MessageDebugger] Subscription status:', {
      channelId,
      isSubscribed,
      allSubscriptions: Object.keys(subscriptions.current)
    });
    return isSubscribed;
  }
};

// Attach to window for debugging
if (typeof window !== 'undefined') {
  window.messageDebugger = messageDebugger;
}