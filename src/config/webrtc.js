/**
 * WebRTC Configuration
 * Contains STUN/TURN servers and connection settings
 */

export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
};

export const MEDIA_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 480, ideal: 720, max: 1080 },
    frameRate: { ideal: 30 }
  }
};

export const CALL_STATES = {
  INITIATING: 'initiating',
  RINGING: 'ringing',
  ACTIVE: 'active',
  ENDED: 'ended',
  FAILED: 'failed',
  DECLINED: 'declined'
};

export const CALL_TIMEOUT = 30000; // 30 seconds
export const ICE_GATHERING_TIMEOUT = 5000; // 5 seconds