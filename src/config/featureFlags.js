// Feature flags
export const FEATURES = {
  // Development/debugging flags
  LOG_FIREBASE_OPERATIONS: process.env.NODE_ENV === 'development',
  
  // Feature toggles
  ENABLE_VOICE_CALLS: false,
  ENABLE_VIDEO_CALLS: false,
  ENABLE_AI_ASSISTANT: true,
  ENABLE_FILE_UPLOADS: true,
  ENABLE_REACTIONS: true,
  ENABLE_THREADS: false,
  ENABLE_SEARCH: false
};