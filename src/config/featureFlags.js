// Feature flags for gradual migration
export const FEATURES = {
  // Set to true to use Firebase-connected version
  USE_FIREBASE_CHAT: process.env.REACT_APP_USE_FIREBASE_CHAT === 'true' || 
                     (typeof window !== 'undefined' && localStorage.getItem('USE_FIREBASE_CHAT') === 'true') || 
                     false,
  
  // Individual feature toggles for gradual migration
  FIREBASE_MESSAGES: true,
  FIREBASE_CHANNELS: true, 
  FIREBASE_PRESENCE: true,
  FIREBASE_TYPING: true,
  FIREBASE_REACTIONS: true,
  FIREBASE_DMS: true,
  
  // Development/debugging flags
  LOG_FIREBASE_OPERATIONS: process.env.NODE_ENV === 'development',
  SHOW_MOCK_DATA_FALLBACK: true
};

// Helper to check if we should use Firebase for a specific feature
export const useFirebaseFeature = (feature) => {
  return FEATURES.USE_FIREBASE_CHAT && FEATURES[`FIREBASE_${feature.toUpperCase()}`];
};