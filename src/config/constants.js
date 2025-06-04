// Environment
export const IS_DEVELOPMENT = process.env.REACT_APP_ENVIRONMENT === 'development';
export const IS_PRODUCTION = process.env.REACT_APP_ENVIRONMENT === 'production';

// Collections
export const COLLECTIONS = {
  USERS: 'users',
  CHANNELS: 'channels',
  MESSAGES: 'messages',
  DIRECT_MESSAGES: 'directMessages',
  THREADS: 'threads',
  REACTIONS: 'reactions',
  ATTACHMENTS: 'attachments',
  PRESENCE: 'presence',
  CALLS: 'calls',
  WORKSPACES: 'workspaces'
};

// Realtime Database Paths
export const RTDB_PATHS = {
  PRESENCE: 'presence',
  TYPING: 'typing',
  ACTIVE_CALLS: 'activeCalls',
  USER_STATUS: 'status'
};

// Storage Paths
export const STORAGE_PATHS = {
  USER_AVATARS: 'avatars',
  MESSAGE_ATTACHMENTS: 'attachments',
  CHANNEL_IMAGES: 'channels',
  WORKSPACE_LOGOS: 'workspaces'
};

// Message Types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  CODE: 'code',
  SYSTEM: 'system',
  AI_RESPONSE: 'ai_response',
  CALL_STARTED: 'call_started',
  CALL_ENDED: 'call_ended'
};

// User Status
export const USER_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline'
};

// AI Assistant
export const AI_ASSISTANT = {
  ID: 'moccet-ai-assistant',
  NAME: 'Moccet Assistant',
  AVATAR: 'M',
  SYSTEM_PROMPTS: {
    GENERAL: 'You are Moccet, a helpful AI assistant integrated into this workspace.',
    CLARIFICATION: 'Analyze this conversation and provide helpful clarification.',
    SUMMARY: 'Provide a concise summary of this conversation.',
    SUGGESTION: 'Suggest relevant actions based on this conversation.'
  }
};