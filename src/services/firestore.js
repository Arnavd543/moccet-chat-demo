import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  addDoc,
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { 
  createWorkspace as createWorkspaceModel, 
  createChannel as createChannelModel, 
  createMessage as createMessageModel,
  createDirectMessage as createDirectMessageModel 
} from '../models';

/**
 * FirestoreService - Main service for all Firestore database operations
 * 
 * This service handles all interactions with Firebase Firestore including:
 * - Workspace management
 * - Channel operations
 * - Message CRUD operations
 * - Direct message handling
 * - User profile management
 * - Real-time subscriptions
 * 
 * @class
 */
class FirestoreService {
  /**
   * Validates if a channel exists in the database
   * @param {string} channelId - The channel ID to validate
   * @returns {Promise<boolean>} True if channel exists, false otherwise
   */
  async validateChannel(channelId) {
    try {
      const channelRef = doc(firestore, 'channels', channelId);
      const channelDoc = await getDoc(channelRef);
      return channelDoc.exists();
    } catch (error) {
      console.error('[FirestoreService] Error validating channel:', error);
      return false;
    }
  }
  // ============ Workspace Operations ============
  
  /**
   * Creates a new workspace with default channels
   * @param {Object} workspaceData - Workspace configuration
   * @param {string} workspaceData.name - Workspace name
   * @param {string} workspaceData.description - Workspace description
   * @param {string} workspaceData.ownerId - User ID of the workspace owner
   * @param {string[]} workspaceData.members - Initial member IDs
   * @param {string[]} workspaceData.admins - Initial admin IDs
   * @returns {Promise<Object>} Created workspace object with ID
   */
  async createWorkspace(workspaceData) {
    try {
      console.log('FirestoreService.createWorkspace called with:', workspaceData);
      
      const workspace = createWorkspaceModel(workspaceData);
      console.log('Created workspace model:', workspace);
      
      workspace.createdAt = serverTimestamp();
      workspace.updatedAt = serverTimestamp();
      workspace.channelCount = 2; // Set initial channel count
      workspace.members = workspaceData.members || [workspaceData.ownerId];
      workspace.admins = workspaceData.admins || [workspaceData.ownerId];
      
      console.log('About to add to Firestore:', workspace);
      const docRef = await addDoc(collection(firestore, 'workspaces'), workspace);
      console.log('Document created with ID:', docRef.id);
      
      if (!docRef.id) {
        throw new Error('Failed to get document ID from Firestore');
      }
      
      // Create default channels
      const batch = writeBatch(firestore);
      
      // General channel
      const generalChannel = createChannelModel({
        workspaceId: docRef.id,
        name: 'general',
        description: 'General discussion for the whole team',
        type: 'public',
        createdBy: workspace.ownerId,
        members: [workspace.ownerId],
        admins: [workspace.ownerId]
      });
      generalChannel.createdAt = serverTimestamp();
      generalChannel.updatedAt = serverTimestamp();
      const generalRef = doc(collection(firestore, 'channels'));
      batch.set(generalRef, generalChannel);
      
      // Random channel
      const randomChannel = createChannelModel({
        workspaceId: docRef.id,
        name: 'random',
        description: 'Random conversations and fun',
        type: 'public',
        createdBy: workspace.ownerId,
        members: [workspace.ownerId],
        admins: [workspace.ownerId]
      });
      randomChannel.createdAt = serverTimestamp();
      randomChannel.updatedAt = serverTimestamp();
      const randomRef = doc(collection(firestore, 'channels'));
      batch.set(randomRef, randomChannel);
      
      // Add owner as member
      const memberRef = doc(firestore, 'workspaces', docRef.id, 'members', workspace.ownerId);
      batch.set(memberRef, {
        userId: workspace.ownerId,
        role: 'owner',
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });
      
      await batch.commit();
      
      console.log('Batch committed successfully');
      
      // Return the workspace with the generated ID
      // Don't need to fetch it again since we have all the data
      const createdWorkspace = {
        id: docRef.id,
        ...workspace,
        // Convert serverTimestamp() to actual timestamps for immediate use
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Returning created workspace:', createdWorkspace);
      return createdWorkspace;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  }

  // Channel operations
  async createChannel(channelData) {
    try {
      const channel = createChannelModel(channelData);
      channel.createdAt = serverTimestamp();
      channel.updatedAt = serverTimestamp();
      channel.lastMessageAt = serverTimestamp();
      
      const docRef = await addDoc(collection(firestore, 'channels'), channel);
      
      // Update workspace channel count
      if (channel.workspaceId) {
        const workspaceRef = doc(firestore, 'workspaces', channel.workspaceId);
        await updateDoc(workspaceRef, {
          channelCount: increment(1),
          updatedAt: serverTimestamp()
        });
      }
      
      return { id: docRef.id, ...channel };
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async getChannels(workspaceId, userId = null) {
    try {
      console.log('[FirestoreService] Getting channels for workspace:', workspaceId, 'user:', userId);
      
      // Get all channels for the workspace
      // Users should see all public channels, plus private channels they're members of
      const q = query(
        collection(firestore, 'channels'),
        where('workspaceId', '==', workspaceId)
      );
      
      const snapshot = await getDocs(q);
      let channels = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filter channels based on visibility rules
      if (userId) {
        channels = channels.filter(channel => {
          // Show all public channels
          if (channel.type === 'public') return true;
          // Show private channels only if user is a member
          if (channel.type === 'private' && channel.members?.includes(userId)) return true;
          // Hide all other channels
          return false;
        });
      }
      
      console.log('[FirestoreService] Found channels:', channels.map(c => ({ id: c.id, name: c.name, type: c.type })));
      return channels;
    } catch (error) {
      console.error('Error getting channels:', error);
      throw error;
    }
  }

  // Message operations with denormalization
  async sendMessage(messageData, senderInfo) {
    console.log('[FirestoreService] sendMessage called:', {
      messageData,
      senderInfo,
      channelId: messageData.channelId,
      hasUserId: !!messageData.userId,
      hasSenderInfoUid: !!senderInfo.uid
    });
    
    try {
      // First, verify the channel exists
      const channelRef = doc(firestore, 'channels', messageData.channelId);
      const channelDoc = await getDoc(channelRef);
      
      if (!channelDoc.exists()) {
        throw new Error(`Channel ${messageData.channelId} does not exist`);
      }
      
      console.log('[FirestoreService] Channel verified:', channelDoc.id);
      
      // Ensure we have userId
      const userId = messageData.userId || senderInfo.uid;
      if (!userId) {
        console.error('[FirestoreService] No userId found in messageData or senderInfo');
        throw new Error('No userId available for message');
      }
      
      // Create message object directly to debug the issue
      const messageInput = {
        ...messageData,
        sender: senderInfo, // Denormalized sender data
        userId: userId, // Ensure userId is set
        senderId: userId, // Ensure senderId is set
        senderName: senderInfo.displayName || senderInfo.email || 'Unknown User',
        senderAvatar: senderInfo.photoURL || null
      };
      
      console.log('[FirestoreService] Message input before createMessageModel:', messageInput);
      
      const message = createMessageModel(messageInput);
      message.createdAt = serverTimestamp();
      message.status = 'sent';
      
      // Force set userId and senderId if they're missing
      if (!message.userId) {
        console.warn('[FirestoreService] Forcing userId on message');
        message.userId = userId;
      }
      if (!message.senderId) {
        console.warn('[FirestoreService] Forcing senderId on message');
        message.senderId = userId;
      }
      
      console.log('[FirestoreService] Message after createMessageModel:', {
        hasUserId: !!message.userId,
        hasSenderId: !!message.senderId,
        userId: message.userId,
        senderId: message.senderId,
        isSystemMessage: message.isSystemMessage,
        callId: message.callId,
        callType: message.callType,
        fullMessage: message
      });
      
      // Double-check critical fields
      if (!message.userId || !message.senderId) {
        console.error('[FirestoreService] Message missing required fields:', message);
        throw new Error('Missing userId or senderId in message');
      }
      
      console.log('[FirestoreService] Created message model:', message);
      
      // Add message to channel
      const messagesRef = collection(firestore, 'channels', messageData.channelId, 'messages');
      console.log('[FirestoreService] Adding message to collection: channels/' + messageData.channelId + '/messages');
      
      const docRef = await addDoc(messagesRef, message);
      console.log('[FirestoreService] Message added with ID:', docRef.id);
      
      // Verify the message was actually created
      if (!docRef.id) {
        throw new Error('Failed to get message ID from Firestore');
      }
      
      // Update channel last message (only include defined fields)
      const updateData = {
        lastMessageAt: serverTimestamp(),
        'metadata.messageCount': increment(1),
        'metadata.lastActivity': serverTimestamp()
      };
      
      // Only add lastMessage if we have all required fields
      if (message.senderId && message.senderName) {
        updateData.lastMessage = {
          id: docRef.id,
          content: message.content,
          senderId: message.senderId,
          senderName: message.senderName,
          createdAt: serverTimestamp()
        };
      }
      
      await updateDoc(channelRef, updateData);
      
      // If it's a thread reply, update thread
      if (messageData.threadId) {
        const threadRef = doc(firestore, 'channels', messageData.channelId, 'messages', messageData.threadId, 'threads', messageData.threadId);
        await updateDoc(threadRef, {
          replyCount: increment(1),
          lastReplyAt: serverTimestamp()
        });
      }
      
      // Return the message with the generated ID and actual timestamp
      const result = { 
        ...message,
        id: docRef.id, // Make sure ID comes from Firestore
        // Override serverTimestamp with actual date for immediate UI use
        createdAt: new Date()
      };
      return result;
    } catch (error) {
      console.error('[FirestoreService] Error sending message:', error);
      throw error;
    }
  }

  // Get messages with pagination
  async getMessages(channelId, limitCount = 50, lastDoc = null) {
    console.log('[FirestoreService] getMessages called:', {
      channelId,
      limitCount,
      hasLastDoc: !!lastDoc
    });
    
    try {
      let q = query(
        collection(firestore, 'channels', channelId, 'messages'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      if (lastDoc) {
        q = query(
          collection(firestore, 'channels', channelId, 'messages'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }
      
      console.log('[FirestoreService] Executing query...');
      const snapshot = await getDocs(q);
      console.log('[FirestoreService] Query results:', {
        docCount: snapshot.docs.length,
        empty: snapshot.empty
      });
      
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('[FirestoreService] Message data:', {
          id: doc.id,
          content: data.content?.substring(0, 50),
          senderId: data.senderId,
          createdAt: data.createdAt
        });
        return {
          id: doc.id,
          ...data
        };
      });
      
      const lastVisible = snapshot.docs[snapshot.docs.length - 1];
      
      const result = {
        messages: messages.reverse(), // Reverse to show oldest first
        lastDoc: lastVisible,
        hasMore: snapshot.docs.length === limitCount
      };
      
      console.log('[FirestoreService] Returning messages:', {
        messageCount: result.messages.length,
        hasMore: result.hasMore
      });
      
      return result;
    } catch (error) {
      console.error('[FirestoreService] Error getting messages:', error);
      throw error;
    }
  }

  // Real-time message listener - simplified version
  subscribeToMessages(channelId, callback, limitCount = 50) {
    console.log('[FirestoreService] Setting up message subscription for channel:', channelId);
    
    if (!channelId) {
      console.error('[FirestoreService] Cannot subscribe to null/undefined channel');
      return () => {}; // Return empty unsubscribe function
    }
    
    const messagesPath = `channels/${channelId}/messages`;
    console.log('[FirestoreService] Subscribing to path:', messagesPath);
    
    const q = query(
      collection(firestore, 'channels', channelId, 'messages'),
      orderBy('createdAt', 'asc'), // Changed to ascending order for proper display
      limit(limitCount)
    );
    
    return onSnapshot(q, 
      (snapshot) => {
        // Simply return all messages every time
        const messages = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          const message = {
            id: doc.id,
            ...data,
            // Handle Firestore timestamp properly
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date())
          };
          messages.push(message);
        });
        
        callback(messages);
      },
      (error) => {
        console.error('[FirestoreService] Subscription error:', error);
        console.error('[FirestoreService] Error details:', {
          code: error.code,
          message: error.message,
          channelId: channelId
        });
        callback([]); // Return empty array on error
      }
    );
  }

  // Direct messages
  async createDirectMessageConversation(participants, participantDetails) {
    try {
      // Check if conversation already exists
      const conversationId = participants.sort().join('_');
      const existingDoc = await getDoc(doc(firestore, 'directMessages', conversationId));
      
      if (existingDoc.exists()) {
        return { id: conversationId, ...existingDoc.data() };
      }
      
      // Create new conversation
      const dm = createDirectMessageModel({
        participants,
        participantDetails
      });
      dm.createdAt = serverTimestamp();
      dm.updatedAt = serverTimestamp();
      
      await setDoc(doc(firestore, 'directMessages', conversationId), dm);
      
      return { id: conversationId, ...dm };
    } catch (error) {
      console.error('Error creating DM conversation:', error);
      throw error;
    }
  }

  // Update message (for edits)
  async updateMessage(channelId, messageId, updates) {
    try {
      const messageRef = doc(firestore, 'channels', channelId, 'messages', messageId);
      await updateDoc(messageRef, {
        ...updates,
        isEdited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  // Add reaction
  async addReaction(channelId, messageId, userId, reaction) {
    try {
      const messageRef = doc(firestore, 'channels', channelId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const currentReactions = messageDoc.data().reactions || [];
        
        // Check if user already reacted with this emoji
        const existingReactionIndex = currentReactions.findIndex(
          r => r.emoji === reaction && r.userId === userId
        );
        
        if (existingReactionIndex === -1) {
          // Add new reaction
          await updateDoc(messageRef, {
            reactions: arrayUnion({
              emoji: reaction,
              userId: userId,
              timestamp: serverTimestamp()
            })
          });
        }
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }

  // Remove reaction
  async removeReaction(channelId, messageId, userId, reaction) {
    try {
      const messageRef = doc(firestore, 'channels', channelId, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      
      if (messageDoc.exists()) {
        const currentReactions = messageDoc.data().reactions || [];
        
        // Filter out the user's reaction
        const updatedReactions = currentReactions.filter(
          r => !(r.emoji === reaction && r.userId === userId)
        );
        
        // Update the reactions array
        await updateDoc(messageRef, {
          reactions: updatedReactions
        });
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }

  // Get user's workspaces
  async getUserWorkspaces(userId = null) {
    try {
      console.log('[FirestoreService] getUserWorkspaces called:', {
        userId,
        hasUserId: !!userId,
        timestamp: new Date().toISOString()
      });
      
      // If no userId provided, get all workspaces (for development)
      const q = userId ? 
        query(
          collection(firestore, 'workspaces'),
          where('members', 'array-contains', userId)
        ) :
        query(
          collection(firestore, 'workspaces')
        );
      
      console.log('[FirestoreService] Executing workspaces query...');
      const snapshot = await getDocs(q);
      console.log('[FirestoreService] Query results:', {
        docsFound: snapshot.docs.length,
        empty: snapshot.empty
      });
      
      const workspaces = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('[FirestoreService] Workspace data:', {
          id: doc.id,
          name: data.name,
          members: data.members?.length || 0,
          userIsMember: data.members?.includes(userId)
        });
        return {
          id: doc.id,
          ...data
        };
      });

      // Filter out archived workspaces
      const activeWorkspaces = workspaces.filter(ws => !ws.isArchived);
      console.log('[FirestoreService] Active workspaces after filtering:', {
        totalWorkspaces: workspaces.length,
        activeWorkspaces: activeWorkspaces.length,
        workspaceIds: activeWorkspaces.map(ws => ws.id)
      });

      return activeWorkspaces;
    } catch (error) {
      console.error('[FirestoreService] Error getting user workspaces:', {
        error: error.message,
        code: error.code,
        userId,
        stack: error.stack
      });
      throw error;
    }
  }

  // Get direct messages for a user
  async getDirectMessages(userId = null) {
    try {
      if (!userId) return [];
      
      const q = query(
        collection(firestore, 'directMessages'),
        where('participants', 'array-contains', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting direct messages:', error);
      return []; // Return empty array on error
    }
  }

  /**
   * Get a specific workspace by ID
   * @param {string} workspaceId - The workspace ID to retrieve
   * @returns {Promise<Object|null>} The workspace object or null if not found
   */
  async getWorkspace(workspaceId) {
    try {
      console.log('[FirestoreService] Getting workspace:', {
        workspaceId,
        idLength: workspaceId?.length,
        idType: typeof workspaceId
      });
      
      // Validate workspace ID
      if (!workspaceId || typeof workspaceId !== 'string' || workspaceId.trim() === '') {
        console.error('[FirestoreService] Invalid workspace ID:', workspaceId);
        return null;
      }
      
      const workspaceRef = doc(firestore, 'workspaces', workspaceId);
      console.log('[FirestoreService] Fetching workspace document...');
      const workspaceDoc = await getDoc(workspaceRef);
      
      if (!workspaceDoc.exists()) {
        console.log('[FirestoreService] Workspace not found:', {
          workspaceId,
          docExists: workspaceDoc.exists(),
          docRef: workspaceRef.path
        });
        return null;
      }
      
      const workspace = {
        id: workspaceDoc.id,
        ...workspaceDoc.data()
      };
      
      console.log('[FirestoreService] Found workspace:', {
        id: workspace.id,
        name: workspace.name,
        members: workspace.members?.length || 0,
        admins: workspace.admins?.length || 0
      });
      return workspace;
    } catch (error) {
      console.error('[FirestoreService] Error getting workspace:', {
        error: error.message,
        code: error.code,
        workspaceId,
        stack: error.stack
      });
      throw error; // Re-throw to let caller handle it
    }
  }

  /**
   * Add a user to a workspace
   * @param {string} workspaceId - The workspace ID to join
   * @param {string} userId - The user ID to add
   * @returns {Promise<void>}
   */
  async joinWorkspace(workspaceId, userId) {
    try {
      console.log('[FirestoreService] Adding user to workspace:', { 
        workspaceId, 
        userId,
        timestamp: new Date().toISOString()
      });
      
      // First verify the workspace exists
      console.log('[FirestoreService] Verifying workspace exists...');
      const workspace = await this.getWorkspace(workspaceId);
      if (!workspace) {
        const error = new Error('Workspace not found');
        error.code = 'not-found';
        throw error;
      }
      
      console.log('[FirestoreService] Workspace verified, current members:', workspace.members);
      
      // Check if user is already a member
      if (workspace.members && workspace.members.includes(userId)) {
        console.log('[FirestoreService] User is already a member of this workspace');
        return; // User is already a member, no need to add again
      }
      
      // Update workspace members array
      const workspaceRef = doc(firestore, 'workspaces', workspaceId);
      console.log('[FirestoreService] Updating workspace members array...');
      await updateDoc(workspaceRef, {
        members: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      console.log('[FirestoreService] Workspace members array updated');
      
      // Add member document to workspace members subcollection
      const memberRef = doc(firestore, 'workspaces', workspaceId, 'members', userId);
      console.log('[FirestoreService] Creating member document...');
      await setDoc(memberRef, {
        userId: userId,
        role: 'member', // Default role for new members
        joinedAt: serverTimestamp(),
        lastActiveAt: serverTimestamp()
      });
      console.log('[FirestoreService] Member document created');
      
      // Automatically add user to all public channels in the workspace
      console.log('[FirestoreService] Adding user to public channels...');
      const channels = await this.getChannels(workspaceId);
      const publicChannels = channels.filter(c => c.type === 'public');
      
      for (const channel of publicChannels) {
        console.log('[FirestoreService] Adding user to channel:', channel.name);
        await this.joinChannel(channel.id, userId);
      }
      
      console.log('[FirestoreService] User added to workspace successfully');
    } catch (error) {
      console.error('[FirestoreService] Error joining workspace:', {
        error: error.message,
        code: error.code,
        workspaceId,
        userId,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Add a user to a channel
   * @param {string} channelId - The channel ID to join
   * @param {string} userId - The user ID to add
   * @returns {Promise<void>}
   */
  async joinChannel(channelId, userId) {
    try {
      console.log('[FirestoreService] Adding user to channel:', { 
        channelId, 
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Verify the channel exists
      const channelRef = doc(firestore, 'channels', channelId);
      console.log('[FirestoreService] Fetching channel document...');
      const channelDoc = await getDoc(channelRef);
      
      if (!channelDoc.exists()) {
        console.error('[FirestoreService] Channel not found:', channelId);
        const error = new Error('Channel not found');
        error.code = 'not-found';
        throw error;
      }
      
      const channelData = channelDoc.data();
      console.log('[FirestoreService] Channel found:', {
        id: channelDoc.id,
        name: channelData.name,
        currentMembers: channelData.members?.length || 0
      });
      
      // Check if user is already a member
      if (channelData.members && channelData.members.includes(userId)) {
        console.log('[FirestoreService] User is already a member of this channel');
        return; // User is already a member
      }
      
      // Update channel members array
      console.log('[FirestoreService] Updating channel members array...');
      await updateDoc(channelRef, {
        members: arrayUnion(userId),
        updatedAt: serverTimestamp()
      });
      
      console.log('[FirestoreService] User added to channel successfully');
    } catch (error) {
      console.error('[FirestoreService] Error joining channel:', {
        error: error.message,
        code: error.code,
        channelId,
        userId,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get user profile from Firestore
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} User profile data or null if not found
   */
  async getUserProfile(userId) {
    try {
      if (!userId) {
        console.error('[FirestoreService.getUserProfile] No userId provided');
        return null;
      }

      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      
      return null;
    } catch (error) {
      console.error('[FirestoreService.getUserProfile] Error:', {
        error: error.message,
        userId,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * Get user profile by ID
   * @param {string} userId - The user ID
   * @returns {Promise<Object|null>} User profile data
   */
  async getUserProfile(userId) {
    try {
      console.log('[FirestoreService] Getting user profile:', userId);
      
      // First try to get from users collection
      const userRef = doc(firestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return { id: userId, ...userDoc.data() };
      }
      
      // If not found, return minimal data
      console.log('[FirestoreService] User profile not found in users collection');
      return null;
    } catch (error) {
      console.error('[FirestoreService] Error getting user profile:', error);
      return null;
    }
  }
}

export const firestoreService = new FirestoreService();