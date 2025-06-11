/**
 * WebRTC Service - Wrapper around CallService
 * Provides backward compatibility and handles UI interactions
 */

import callService from './callService';
import { CALL_STATES } from '../config/webrtc';

export { CALL_STATES };

class WebRTCService {
  constructor() {
    // Delegate to callService
    this.callService = callService;
    
    // Set up event forwarding
    this.setupEventForwarding();
  }
  
  // Getters for compatibility
  get localStream() {
    return this.callService.localStream;
  }
  
  get remoteStreams() {
    return this.callService.remoteStreams;
  }
  
  get currentCall() {
    return this.callService.currentCall;
  }
  
  setupEventForwarding() {
    const events = [
      'remoteStream',
      'connectionState',
      'callStateChanged',
      'participantsUpdated',
      'audioStateChanged',
      'videoStateChanged',
      'screenShareStarted',
      'screenShareStopped',
      'callEnded',
      'dataChannelOpen',
      'dataChannelMessage',
      'participantConnected',
      'localStreamUpdated',
      'participantLeft'
    ];
    
    events.forEach(event => {
      this.callService.on(event, (data) => {
        this.emit(event, data);
      });
    });
  }

  /**
   * Initialize or join a call
   */
  async startCall(channelId, participants, isVideo = true) {
    try {
      console.log('[WebRTC] Starting call:', { channelId, participants, isVideo });
      
      // Use new callService
      const call = await this.callService.initiateCall(
        channelId,
        participants[0], // initiatorId
        participants,
        isVideo
      );
      
      return call;
    } catch (error) {
      console.error('[WebRTC] Error starting call:', error);
      throw error;
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(callId, userId) {
    try {
      console.log('[WebRTC] Joining call:', { callId, userId });
      
      // Use new callService
      const call = await this.callService.joinCall(callId, userId);
      
      return call;
    } catch (error) {
      console.error('[WebRTC] Error joining call:', error);
      throw error;
    }
  }

  // Removed - handled by callService

  // Removed - handled by callService

  // Removed - handled by callService

  // Removed - handled by callService

  // Removed - handled by callService

  /**
   * Toggle audio/video
   */
  toggleAudio(enabled) {
    this.callService.toggleAudio(enabled);
  }

  toggleVideo(enabled) {
    this.callService.toggleVideo(enabled);
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    return await this.callService.startScreenShare();
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare() {
    return await this.callService.stopScreenShare();
  }

  /**
   * End the call
   */
  async endCall() {
    return await this.callService.endCall();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    return this.callService.cleanup();
  }

  /**
   * Event emitter functionality
   */
  eventHandlers = new Map();

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => handler(data));
    }
  }

  /**
   * Get media devices
   */
  async getMediaDevices() {
    return await this.callService.getMediaDevices();
  }

  /**
   * Switch media device
   */
  async switchDevice(kind, deviceId) {
    return await this.callService.switchDevice(kind, deviceId);
  }
}

// Export singleton instance
const webRTCService = new WebRTCService();
export default webRTCService;