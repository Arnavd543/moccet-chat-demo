// Workspace model
export const createWorkspace = (data) => ({
  // Don't set ID - Firestore will provide it
  name: data.name || '',
  description: data.description || '',
  ownerId: data.ownerId || '',
  logoUrl: data.logoUrl || '',
  createdAt: new Date(),
  updatedAt: new Date(),
  memberCount: 1,
  channelCount: 0,
  plan: data.plan || 'free',
  settings: {
    allowGuestAccess: false,
    defaultChannels: ['general', 'random'],
    maxChannels: 100,
    maxMembers: 10000,
    ...data.settings
  }
});

// Channel model
export const createChannel = (data) => ({
  // Don't set ID - Firestore will provide it
  workspaceId: data.workspaceId || '',
  name: data.name || '',
  description: data.description || '',
  type: data.type || 'public', // public, private, direct
  isArchived: false,
  isGeneral: data.name === 'general',
  createdBy: data.createdBy || '',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastMessageAt: new Date(),
  memberCount: 1,
  members: data.members || [],
  admins: data.admins || [],
  pinnedMessages: [],
  topic: '',
  purpose: '',
  isReadOnly: false,
  metadata: {
    messageCount: 0,
    fileCount: 0,
    lastActivity: new Date()
  }
});

// Message model with denormalized sender info
export const createMessage = (data) => ({
  // Don't set ID - Firestore will provide it
  channelId: data.channelId || '',
  workspaceId: data.workspaceId || '',
  userId: data.userId || data.senderId || '', // Support both userId and senderId
  senderId: data.senderId || data.userId || '', // Ensure senderId is always set
  
  // Denormalized sender info for performance
  sender: {
    uid: data.sender?.uid || data.userId || data.senderId || '',
    displayName: data.sender?.displayName || data.senderName || '',
    photoURL: data.sender?.photoURL || data.senderAvatar || '',
    email: data.sender?.email || '',
    status: data.sender?.status || 'offline'
  },
  
  // Add denormalized fields for backwards compatibility
  senderName: data.senderName || data.sender?.displayName || '',
  senderAvatar: data.senderAvatar || data.sender?.photoURL || '',
  
  type: data.type || 'text', // text, file, image, video, system, ai_response
  content: data.content || '',
  
  // Rich content
  attachments: data.attachments || [], // Array of file attachment objects
  mentions: data.mentions || [],
  reactions: data.reactions || [], // Array of { emoji, userId, timestamp } objects
  
  // Threading
  threadId: data.threadId || null,
  replyCount: 0,
  lastReplyAt: null,
  
  // Metadata
  createdAt: new Date(),
  updatedAt: null,
  editedAt: null,
  deletedAt: null,
  isEdited: false,
  isDeleted: false,
  isPinned: false,
  
  // AI-specific fields
  isAIGenerated: data.isAIGenerated || false,
  aiContext: data.aiContext || null,
  
  // System message fields
  isSystemMessage: data.isSystemMessage || false,
  callId: data.callId || null,
  callType: data.callType || null,
  
  // Delivery status
  status: 'sending', // sending, sent, delivered, read
  deliveredTo: [],
  readBy: []
});

// Thread model
export const createThread = (data) => ({
  // Don't set ID - Firestore will provide it
  messageId: data.messageId || '',
  channelId: data.channelId || '',
  participants: data.participants || [],
  lastReplyAt: new Date(),
  replyCount: 0,
  isResolved: false
});

// DirectMessage conversation model
export const createDirectMessage = (data) => ({
  // Don't set ID - Firestore will provide it
  participants: data.participants || [],
  participantDetails: data.participantDetails || {},
  lastMessageAt: new Date(),
  lastMessage: data.lastMessage || null,
  unreadCounts: {},
  createdAt: new Date(),
  updatedAt: new Date()
});

// Presence model (for Realtime Database)
export const createPresence = (data) => ({
  online: data.online || false,
  lastSeen: data.lastSeen || new Date(),
  status: data.status || 'offline', // online, away, busy, offline
  statusMessage: data.statusMessage || '',
  device: data.device || 'web',
  activeChannelId: data.activeChannelId || null
});

// Typing indicator model (for Realtime Database)
export const createTypingIndicator = (data) => ({
  userId: data.userId || '',
  channelId: data.channelId || '',
  isTyping: data.isTyping || false,
  startedAt: data.startedAt || new Date(),
  userName: data.userName || '',
  userPhoto: data.userPhoto || ''
});

// File attachment model
export const createAttachment = (data) => ({
  id: data.id || '',
  url: data.url || '',
  thumbnailUrl: data.thumbnailUrl || null,
  previewUrl: data.previewUrl || null,
  name: data.name || '',
  size: data.size || 0,
  type: data.type || '',
  category: data.category || 'file', // image, document, video, file
  path: data.path || '',
  uploadedBy: data.uploadedBy || '',
  uploadedAt: data.uploadedAt || new Date(),
  metadata: data.metadata || {}
});