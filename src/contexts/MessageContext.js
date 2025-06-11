import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { firestoreService } from '../services/firestore';
import { realtimeService } from '../services/realtime';
import { storageService } from '../services/storage';
import { createAttachment } from '../models';

const MessageContext = createContext({});

export const useMessages = () => useContext(MessageContext);

export const MessageProvider = ({ children }) => {
  const { currentUser, userProfile } = useAuth();
  const [messages, setMessages] = useState({});
  const [loadingStates, setLoadingStates] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [messageCache, setMessageCache] = useState({});
  const subscriptions = useRef({});
  const typingTimeouts = useRef({});
  const messagesRef = useRef(messages);
  
  // Keep messagesRef in sync with messages state
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Debug: Log messages state changes - commented to reduce console spam
  // useEffect(() => {
  //   console.log('[MessageContext] Messages state updated:', messages);
  // }, [messages]);

  // Send message - simplified without optimistic updates
  const sendMessage = useCallback(async (channelId, content, workspaceId = null, typeOrMetadata = 'text', attachments = []) => {
    // Handle both old signature (type as string) and new signature (metadata object)
    let type = 'text';
    let metadata = {};
    
    if (typeof typeOrMetadata === 'string') {
      type = typeOrMetadata;
    } else if (typeof typeOrMetadata === 'object' && typeOrMetadata !== null) {
      metadata = typeOrMetadata;
      type = metadata.type || 'text';
    }
    
    console.log('[MessageContext] sendMessage called:', { channelId, content, workspaceId, type, metadata });
    
    if (!currentUser && !metadata.isAI) {
      console.error('[MessageContext] Cannot send message: no current user');
      return;
    }
    
    if (!channelId) {
      console.error('[MessageContext] Cannot send message: no channel ID');
      return;
    }
    
    // Use AI metadata if provided, otherwise use current user data
    const displayName = metadata.senderName || userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'Unknown User';
    const photoURL = metadata.senderAvatar || userProfile?.photoURL || currentUser?.photoURL || null;
    const userId = metadata.isAI ? 'moccet-ai' : currentUser.uid;

    try {
      // Send to Firestore
      console.log('[MessageContext] Sending to Firestore...');
      const finalWorkspaceId = workspaceId || 'default';
      
      const sentMessage = await firestoreService.sendMessage(
        {
          channelId,
          userId: userId,
          type,
          content,
          attachments,
          workspaceId: finalWorkspaceId,
          isAI: metadata.isAI || false,
          aiUsage: metadata.usage,
          cached: metadata.cached,
          isError: metadata.isError,
          isSystemMessage: metadata.isSystemMessage || false,
          callId: metadata.callId || null,
          callType: metadata.callType || null
        },
        {
          uid: userId,
          displayName: displayName,
          photoURL: photoURL,
          email: metadata.isAI ? 'ai@moccet.com' : currentUser?.email,
          status: metadata.isAI ? 'online' : (userProfile?.status || 'online')
        }
      );
      
      console.log('[MessageContext] Message sent successfully:', sentMessage);

      return sentMessage;
    } catch (error) {
      console.error('[MessageContext] Error sending message:', error);
      throw error;
    }
  }, [currentUser, userProfile]);

  // Load messages with pagination
  const loadMessages = useCallback(async (channelId, lastDoc = null) => {
    console.log('[MessageContext] loadMessages called:', { channelId, lastDoc, hasCachedData: !!messageCache[channelId] });
    
    setLoadingStates(prev => ({ ...prev, [channelId]: true }));

    try {
      // Check cache first
      if (!lastDoc && messageCache[channelId]) {
        console.log('[MessageContext] Using cached messages:', {
          channelId,
          messageCount: messageCache[channelId].length
        });
        setMessages(prev => ({ ...prev, [channelId]: messageCache[channelId] }));
        setLoadingStates(prev => ({ ...prev, [channelId]: false }));
        return;
      }

      console.log('[MessageContext] Fetching messages from Firestore...');
      const result = await firestoreService.getMessages(channelId, 50, lastDoc);
      console.log('[MessageContext] Fetched messages:', {
        channelId,
        messageCount: result.messages.length,
        hasMore: result.hasMore
      });
      
      setMessages(prev => {
        // Preserve optimistic messages when loading
        const existingMessages = prev[channelId] || [];
        const optimisticMessages = existingMessages.filter(msg => msg.isOptimistic);
        
        const newMessages = {
          ...prev,
          [channelId]: lastDoc 
            ? [...result.messages, ...existingMessages]
            : [...result.messages, ...optimisticMessages] // Keep optimistic messages when loading initial
        };
        console.log('[MessageContext] Updated messages state after load:', {
          channelId,
          totalMessages: newMessages[channelId].length,
          optimisticCount: optimisticMessages.length
        });
        return newMessages;
      });

      // Cache first page
      if (!lastDoc) {
        setMessageCache(prev => ({ ...prev, [channelId]: result.messages }));
        console.log('[MessageContext] Cached first page of messages');
      }

      return result;
    } catch (error) {
      console.error('[MessageContext] Error loading messages:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, [channelId]: false }));
    }
  }, [messageCache]);

  // Subscribe to channel messages - simplified version
  const subscribeToChannel = useCallback((channelId) => {
    if (!channelId) {
      console.warn('[MessageContext] Cannot subscribe to null/undefined channel');
      return;
    }
    
    // Unsubscribe from previous subscription if exists
    if (subscriptions.current[channelId]) {
      console.log('[MessageContext] Unsubscribing from previous subscription for channel:', channelId);
      subscriptions.current[channelId]();
      delete subscriptions.current[channelId];
    }

    console.log('[MessageContext] Subscribing to channel:', channelId);
    
    // Subscribe to real-time updates
    const unsubscribe = firestoreService.subscribeToMessages(
      channelId,
      (newMessages) => {
        // Simply replace all messages with the new set
        setMessages(prev => ({
          ...prev,
          [channelId]: newMessages
        }));
      }
    );

    subscriptions.current[channelId] = unsubscribe;
    console.log('[MessageContext] Successfully subscribed to channel:', channelId);
  }, []);

  // Unsubscribe from channel
  const unsubscribeFromChannel = useCallback((channelId) => {
    if (subscriptions.current[channelId]) {
      subscriptions.current[channelId]();
      delete subscriptions.current[channelId];
    }
  }, []);

  // Typing indicators
  const startTyping = useCallback((channelId) => {
    if (!currentUser) return;

    const displayName = userProfile?.displayName || currentUser.displayName || currentUser.email || 'Unknown User';
    const photoURL = userProfile?.photoURL || currentUser.photoURL || null;

    realtimeService.setTypingStatus(channelId, currentUser.uid, true, {
      userName: displayName,
      userPhoto: photoURL
    });

    // Clear existing timeout
    if (typingTimeouts.current[channelId]) {
      clearTimeout(typingTimeouts.current[channelId]);
    }

    // Auto-stop typing after 5 seconds
    typingTimeouts.current[channelId] = setTimeout(() => {
      stopTyping(channelId);
    }, 5000);
  }, [currentUser, userProfile]);

  const stopTyping = useCallback((channelId) => {
    if (!currentUser) return;

    realtimeService.setTypingStatus(channelId, currentUser.uid, false);

    if (typingTimeouts.current[channelId]) {
      clearTimeout(typingTimeouts.current[channelId]);
      delete typingTimeouts.current[channelId];
    }
  }, [currentUser]);

  // Edit message
  const editMessage = useCallback(async (channelId, messageId, newContent) => {
    try {
      await firestoreService.updateMessage(channelId, messageId, {
        content: newContent
      });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (channelId, messageId) => {
    try {
      await firestoreService.updateMessage(channelId, messageId, {
        isDeleted: true,
        deletedAt: new Date(),
        content: 'This message has been deleted'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, []);

  // Add reaction
  const addReaction = useCallback(async (channelId, messageId, reaction) => {
    if (!currentUser) return;

    try {
      await firestoreService.addReaction(channelId, messageId, currentUser.uid, reaction);
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, [currentUser]);

  // Remove reaction
  const removeReaction = useCallback(async (channelId, messageId, reaction) => {
    if (!currentUser) return;

    try {
      await firestoreService.removeReaction(channelId, messageId, currentUser.uid, reaction);
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }, [currentUser]);

  // Upload file and send message with attachment
  const uploadFileAndSend = useCallback(async (channelId, workspaceId, file, messageContent = '', onProgress) => {
    if (!currentUser) return;

    try {
      // Upload file
      const uploadResult = await storageService.uploadFile(
        file,
        workspaceId,
        channelId,
        currentUser.uid,
        onProgress
      );

      // Create attachment object
      const attachment = createAttachment({
        id: uploadResult.id,
        url: uploadResult.url,
        name: uploadResult.name,
        size: uploadResult.size,
        type: uploadResult.type,
        category: uploadResult.category,
        path: uploadResult.path,
        uploadedBy: currentUser.uid,
        uploadedAt: uploadResult.uploadedAt,
        metadata: {} // Don't include Firebase Storage metadata as it may contain undefined values
      });

      // Determine message type based on file category
      let messageType = 'file';
      if (uploadResult.category === 'images') messageType = 'image';
      else if (uploadResult.category === 'documents') messageType = 'document';
      else if (uploadResult.category === 'files' && storageService.isVideo(file)) messageType = 'video';

      // Send message with attachment
      await sendMessage(channelId, messageContent || `Shared ${file.name}`, workspaceId, messageType, [attachment]);

      return uploadResult;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }, [currentUser, sendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(subscriptions.current).forEach(unsubscribe => unsubscribe());
      Object.values(typingTimeouts.current).forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  const value = {
    messages,
    loadingStates,
    typingUsers,
    sendMessage,
    loadMessages,
    subscribeToChannel,
    unsubscribeFromChannel,
    startTyping,
    stopTyping,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    uploadFileAndSend,
    // Add debug method
    debugMessages: () => console.log('[MessageContext] Current messages:', messages)
  };

  return (
    <MessageContext.Provider value={value}>
      {children}
    </MessageContext.Provider>
  );
};

// Custom hook to use message context - Direct access version
export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within a MessageProvider');
  }
  
  // Return the full context for direct access
  return context;
};

// Custom hook with simplified API (deprecated - use direct access)
export const useChannelMessages = (channelId) => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useChannelMessages must be used within a MessageProvider');
  }
  
  useEffect(() => {
    if (channelId) {
      context.subscribeToChannel(channelId);
    }
    
    return () => {
      if (channelId) {
        context.unsubscribeFromChannel(channelId);
      }
    };
  }, [channelId, context]);
  
  return {
    messages: context.messages[channelId] || [],
    loading: context.loadingStates[channelId] || false,
    typingUsers: context.typingUsers[channelId] || [],
    sendMessage: (content, workspaceId) => context.sendMessage(channelId, content, workspaceId),
    editMessage: (messageId, content) => context.editMessage(channelId, messageId, content),
    deleteMessage: (messageId) => context.deleteMessage(channelId, messageId),
    addReaction: (messageId, emoji) => context.addReaction(channelId, messageId, emoji),
    removeReaction: (messageId, emoji) => context.removeReaction(channelId, messageId, emoji),
    loadMoreMessages: () => context.loadMessages(channelId),
    hasMore: true
  };
};