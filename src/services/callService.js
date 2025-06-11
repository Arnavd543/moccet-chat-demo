/**
 * Call Service - Handles WebRTC call initiation and management
 * Based on PHASE 4 WebRTC Implementation
 */

import { 
  collection, 
  doc, 
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { firestore as db } from '../config/firebase';
import { WEBRTC_CONFIG, CALL_STATES, CALL_TIMEOUT } from '../config/webrtc';

class CallService {
  constructor() {
    this.currentCall = null;
    this.currentUserId = null;
    this.localStream = null;
    this.remoteStreams = new Map();
    this.peerConnections = new Map();
    this.dataChannels = new Map();
    this.listeners = new Map();
    this.pendingCandidates = new Map();
    this.callTimer = null;
  }

  /**
   * Initialize a new call
   */
  async initiateCall(channelId, initiatorId, participants, isVideo = true) {
    try {
      console.log('[CallService] Initiating call:', { channelId, initiatorId, participants, isVideo });
      
      // Store current user ID
      this.currentUserId = initiatorId;
      
      // Create call document
      const callData = {
        channelId,
        initiatorId,
        participants: [initiatorId], // Start with just initiator
        state: CALL_STATES.INITIATING,
        type: isVideo ? 'video' : 'audio',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const callRef = await addDoc(collection(db, 'calls'), callData);
      this.currentCall = { id: callRef.id, ...callData };
      
      console.log('[CallService] Call created:', this.currentCall.id);
      
      // Request media permissions
      await this.setupLocalStream(isVideo);
      
      // Update call state to ringing
      await updateDoc(callRef, {
        state: CALL_STATES.RINGING,
        updatedAt: serverTimestamp()
      });
      
      // Set up call timeout
      this.callTimer = setTimeout(async () => {
        if (this.currentCall && this.currentCall.state === CALL_STATES.RINGING) {
          console.log('[CallService] Call timeout - no answer');
          await this.endCall('timeout');
        }
      }, CALL_TIMEOUT);
      
      // Set up listeners for participants joining
      this.setupCallListeners(callRef.id);
      
      return this.currentCall;
    } catch (error) {
      console.error('[CallService] Error initiating call:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Join an existing call
   */
  async joinCall(callId, userId) {
    try {
      console.log('[CallService] Joining call:', { callId, userId });
      
      // Store current user ID
      this.currentUserId = userId;
      
      // Get call document
      const callRef = doc(db, 'calls', callId);
      const callDoc = await getDoc(callRef);
      
      if (!callDoc.exists()) {
        throw new Error('Call not found');
      }
      
      const callData = callDoc.data();
      this.currentCall = { id: callId, ...callData };
      
      // Request media permissions
      await this.setupLocalStream(callData.type === 'video');
      
      // Add participant to call
      const updatedParticipants = [...(callData.participants || [])];
      if (!updatedParticipants.includes(userId)) {
        updatedParticipants.push(userId);
      }
      
      // Update call to active state and set activeAt timestamp if this is the first joiner
      const updateData = {
        participants: updatedParticipants,
        state: CALL_STATES.ACTIVE,
        updatedAt: serverTimestamp()
      };
      
      // If call is transitioning from ringing to active, set activeAt
      if (callData.state === CALL_STATES.RINGING) {
        updateData.activeAt = serverTimestamp();
      }
      
      await updateDoc(callRef, updateData);
      
      // Clear any timeout
      if (this.callTimer) {
        clearTimeout(this.callTimer);
        this.callTimer = null;
      }
      
      // Set up listeners first
      this.setupCallListeners(callId);
      
      // Listen for offers from existing participants
      console.log('[CallService] Setting up to receive offers from existing participants');
      for (const participantId of callData.participants) {
        if (participantId !== userId) {
          this.listenForOfferFromParticipant(callId, participantId, userId);
        }
      }
      
      return this.currentCall;
    } catch (error) {
      console.error('[CallService] Error joining call:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Set up local media stream
   */
  async setupLocalStream(isVideo) {
    try {
      console.log('[CallService] Setting up local stream, video:', isVideo);
      
      // Import media constraints from config
      const { MEDIA_CONSTRAINTS } = await import('../config/webrtc');
      
      const constraints = {
        audio: MEDIA_CONSTRAINTS.audio,
        video: isVideo ? MEDIA_CONSTRAINTS.video : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CallService] Local stream obtained:', {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length
      });
      
      // Emit local stream update event
      this.emit('localStreamUpdated');
      
      return this.localStream;
    } catch (error) {
      console.error('[CallService] Error getting user media:', error);
      throw error;
    }
  }

  /**
   * Set up peer connection handlers
   */
  setupPeerConnectionHandlers(pc, callId, localId, remoteId) {
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[CallService] Received remote track:', {
        kind: event.track.kind,
        enabled: event.track.enabled,
        readyState: event.track.readyState,
        streams: event.streams.length,
        remoteId: remoteId
      });
      const [remoteStream] = event.streams;
      this.remoteStreams.set(remoteId, remoteStream);
      this.emit('remoteStream', { participantId: remoteId, stream: remoteStream });
    };
    
    // Handle data channel
    pc.ondatachannel = (event) => {
      console.log('[CallService] Received data channel');
      this.setupDataChannel(event.channel, remoteId);
    };
    
    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('[CallService] New ICE candidate');
        try {
          await addDoc(collection(db, `calls/${callId}/candidates`), {
            candidate: event.candidate.toJSON(),
            sender: localId,
            target: remoteId,
            createdAt: serverTimestamp()
          });
        } catch (error) {
          console.error('[CallService] Error adding ICE candidate:', error);
        }
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[CallService] Connection state: ${pc.connectionState}`);
      this.emit('connectionState', { 
        participantId: remoteId, 
        state: pc.connectionState 
      });
      
      if (pc.connectionState === 'failed') {
        console.error('[CallService] Connection failed, attempting restart');
        pc.restartIce();
      }
    };
    
    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`[CallService] ICE connection state: ${pc.iceConnectionState}`);
    };
  }

  /**
   * Create peer connection between two participants
   */
  async createPeerConnection(callId, localId, remoteId, isOfferer) {
    console.log('[CallService] Creating peer connection:', { callId, localId, remoteId, isOfferer });
    
    const pc = new RTCPeerConnection(WEBRTC_CONFIG);
    const connectionKey = `${localId}-${remoteId}`;
    this.peerConnections.set(connectionKey, pc);
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        console.log('[CallService] Adding local track:', {
          kind: track.kind,
          enabled: track.enabled,
          readyState: track.readyState,
          localId: localId,
          remoteId: remoteId
        });
        pc.addTrack(track, this.localStream);
      });
    } else {
      console.error('[CallService] No local stream available when creating peer connection');
    }
    
    // Set up data channel
    if (isOfferer) {
      const dataChannel = pc.createDataChannel('messages');
      this.setupDataChannel(dataChannel, remoteId);
    }
    
    // Set up common handlers
    this.setupPeerConnectionHandlers(pc, callId, localId, remoteId);
    
    // Create and send offer/answer
    if (isOfferer) {
      await this.createAndSendOffer(callId, localId, remoteId, pc);
    }
    
    // Listen for offers/answers and ICE candidates
    this.listenForSignaling(callId, localId, remoteId, pc, isOfferer);
    
    return pc;
  }

  /**
   * Create and send offer
   */
  async createAndSendOffer(callId, localId, remoteId, pc) {
    try {
      console.log('[CallService] Creating offer');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await setDoc(doc(db, `calls/${callId}/offers`, `${localId}-${remoteId}`), {
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        sender: localId,
        target: remoteId,
        createdAt: serverTimestamp()
      });
      
      console.log('[CallService] Offer sent');
    } catch (error) {
      console.error('[CallService] Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Create and send answer
   */
  async createAndSendAnswer(callId, localId, remoteId, pc) {
    try {
      console.log('[CallService] Creating answer');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await setDoc(doc(db, `calls/${callId}/answers`, `${remoteId}-${localId}`), {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        sender: localId,
        target: remoteId,
        createdAt: serverTimestamp()
      });
      
      console.log('[CallService] Answer sent');
    } catch (error) {
      console.error('[CallService] Error creating answer:', error);
      throw error;
    }
  }

  /**
   * Listen for offer from a specific participant (for joiners)
   */
  listenForOfferFromParticipant(callId, remoteId, localId) {
    const offerRef = doc(db, `calls/${callId}/offers`, `${remoteId}-${localId}`);
    const unsubscribe = onSnapshot(offerRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('[CallService] Received offer from participant:', remoteId);
        
        // Create peer connection to respond
        const connectionKey = `${localId}-${remoteId}`;
        if (!this.peerConnections.has(connectionKey)) {
          const pc = new RTCPeerConnection(WEBRTC_CONFIG);
          this.peerConnections.set(connectionKey, pc);
          
          // Add local stream
          if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
              console.log('[CallService] Adding local track to answer PC:', {
                kind: track.kind,
                enabled: track.enabled,
                localId: localId,
                remoteId: remoteId
              });
              pc.addTrack(track, this.localStream);
            });
          } else {
            console.error('[CallService] No local stream when responding to offer');
          }
          
          // Set up peer connection handlers
          this.setupPeerConnectionHandlers(pc, callId, localId, remoteId);
          
          // Set remote description and create answer
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await this.createAndSendAnswer(callId, localId, remoteId, pc);
            
            // Process any pending candidates
            await this.processPendingCandidates(remoteId, pc);
            
            // Listen for signaling (ICE candidates)
            this.listenForSignaling(callId, localId, remoteId, pc, false);
          } catch (error) {
            console.error('[CallService] Error handling offer:', error);
          }
        }
      }
    });
    this.listeners.set(`offer-${callId}-${remoteId}`, unsubscribe);
  }

  /**
   * Listen for signaling messages
   */
  listenForSignaling(callId, localId, remoteId, pc, isOfferer) {
    // Listen for offer (if not offerer)
    if (!isOfferer) {
      const offerRef = doc(db, `calls/${callId}/offers`, `${remoteId}-${localId}`);
      const unsubscribeOffer = onSnapshot(offerRef, async (doc) => {
        if (doc.exists() && pc.signalingState === 'stable') {
          const data = doc.data();
          console.log('[CallService] Received offer');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            await this.createAndSendAnswer(callId, localId, remoteId, pc);
            
            // Process any pending candidates
            await this.processPendingCandidates(remoteId, pc);
          } catch (error) {
            console.error('[CallService] Error handling offer:', error);
          }
        }
      });
      this.listeners.set(`offer-${remoteId}`, unsubscribeOffer);
    }
    
    // Listen for answer (if offerer)
    if (isOfferer) {
      const answerRef = doc(db, `calls/${callId}/answers`, `${localId}-${remoteId}`);
      const unsubscribeAnswer = onSnapshot(answerRef, async (doc) => {
        if (doc.exists() && pc.signalingState === 'have-local-offer') {
          const data = doc.data();
          console.log('[CallService] Received answer');
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            
            // Process any pending candidates
            await this.processPendingCandidates(remoteId, pc);
          } catch (error) {
            console.error('[CallService] Error handling answer:', error);
          }
        }
      });
      this.listeners.set(`answer-${remoteId}`, unsubscribeAnswer);
    }
    
    // Listen for ICE candidates
    const candidatesQuery = query(
      collection(db, `calls/${callId}/candidates`),
      where('sender', '==', remoteId),
      where('target', '==', localId)
    );
    
    const unsubscribeCandidates = onSnapshot(candidatesQuery, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          console.log('[CallService] Received ICE candidate');
          
          // Store candidate if remote description not set yet
          if (!pc.remoteDescription) {
            console.log('[CallService] Storing candidate for later');
            if (!this.pendingCandidates.has(remoteId)) {
              this.pendingCandidates.set(remoteId, []);
            }
            this.pendingCandidates.get(remoteId).push(data.candidate);
          } else {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
              console.error('[CallService] Error adding ICE candidate:', error);
            }
          }
        }
      });
    });
    this.listeners.set(`candidates-${remoteId}`, unsubscribeCandidates);
  }

  /**
   * Process pending ICE candidates
   */
  async processPendingCandidates(remoteId, pc) {
    const pending = this.pendingCandidates.get(remoteId);
    if (pending && pending.length > 0) {
      console.log(`[CallService] Processing ${pending.length} pending candidates`);
      for (const candidate of pending) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('[CallService] Error adding pending candidate:', error);
        }
      }
      this.pendingCandidates.delete(remoteId);
    }
  }

  /**
   * Set up data channel
   */
  setupDataChannel(channel, participantId) {
    console.log('[CallService] Setting up data channel for:', participantId);
    
    channel.onopen = () => {
      console.log('[CallService] Data channel opened');
      this.dataChannels.set(participantId, channel);
      this.emit('dataChannelOpen', participantId);
    };
    
    channel.onclose = () => {
      console.log('[CallService] Data channel closed');
      this.dataChannels.delete(participantId);
    };
    
    channel.onmessage = (event) => {
      console.log('[CallService] Data channel message:', event.data);
      this.emit('dataChannelMessage', { participantId, message: event.data });
    };
    
    channel.onerror = (error) => {
      console.error('[CallService] Data channel error:', error);
    };
  }

  /**
   * Set up call state listeners
   */
  setupCallListeners(callId) {
    // Listen for call state changes
    const callRef = doc(db, 'calls', callId);
    const unsubscribeCall = onSnapshot(callRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const oldParticipants = this.currentCall?.participants || [];
        this.currentCall = { id: callId, ...data };
        
        // Handle new participants
        const newParticipants = data.participants.filter(p => !oldParticipants.includes(p));
        for (const participantId of newParticipants) {
          if (participantId !== this.currentUserId) {
            console.log('[CallService] New participant detected:', participantId);
            
            // Only the initiator creates connections with new participants
            if (this.currentUserId === data.initiatorId) {
              const connectionKey = `${this.currentUserId}-${participantId}`;
              if (!this.peerConnections.has(connectionKey)) {
                console.log('[CallService] Initiator creating connection with:', participantId);
                await this.createPeerConnection(callId, this.currentUserId, participantId, true);
              }
            }
          }
        }
        
        // Handle participants leaving
        const leftParticipants = oldParticipants.filter(p => !data.participants.includes(p));
        for (const participantId of leftParticipants) {
          console.log('[CallService] Participant left:', participantId);
          this.cleanupParticipant(participantId);
        }
        
        // Emit state change
        this.emit('callStateChanged', data.state);
        this.emit('participantsUpdated', data.participants);
        
        // Handle call end
        if (data.state === CALL_STATES.ENDED) {
          await this.cleanup();
        }
      }
    });
    this.listeners.set('call', unsubscribeCall);
  }

  /**
   * Toggle audio
   */
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('audioStateChanged', enabled);
    }
  }

  /**
   * Toggle video
   */
  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('videoStateChanged', enabled);
    }
  }

  /**
   * Start screen sharing
   */
  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      const screenTrack = screenStream.getVideoTracks()[0];
      
      // Replace video track in all peer connections
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      });
      
      // Handle screen share ending
      screenTrack.onended = () => {
        this.stopScreenShare();
      };
      
      this.emit('screenShareStarted', screenStream);
      return screenStream;
    } catch (error) {
      console.error('[CallService] Error starting screen share:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenShare() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        // Replace screen share with camera
        this.peerConnections.forEach((pc) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
    this.emit('screenShareStopped');
  }

  /**
   * Send message via data channel
   */
  sendDataChannelMessage(message, targetParticipant = null) {
    const targets = targetParticipant 
      ? [this.dataChannels.get(targetParticipant)].filter(Boolean)
      : Array.from(this.dataChannels.values());
    
    targets.forEach(channel => {
      if (channel.readyState === 'open') {
        channel.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Leave the call (remove current user from participants)
   */
  async endCall(reason = 'user') {
    if (this.currentCall && this.currentUserId) {
      try {
        // Get the current call document
        const callRef = doc(db, 'calls', this.currentCall.id);
        const callDoc = await getDoc(callRef);
        
        if (callDoc.exists()) {
          const callData = callDoc.data();
          
          // Remove current user from participants
          const updatedParticipants = (callData.participants || []).filter(p => p !== this.currentUserId);
          
          // Check if this is the last participant
          if (updatedParticipants.length === 0) {
            // Last participant leaving - end the call
            let duration = 0;
            
            // Calculate duration if call was active
            if (callData.activeAt || callData.createdAt) {
              const startTime = callData.activeAt || callData.createdAt;
              const startTimestamp = startTime.toDate ? startTime.toDate() : new Date(startTime);
              duration = Math.floor((Date.now() - startTimestamp.getTime()) / 1000);
            }
            
            await updateDoc(callRef, {
              state: CALL_STATES.ENDED,
              participants: [],
              endedAt: serverTimestamp(),
              endReason: reason,
              duration: duration // Save the duration in seconds
            });
          } else {
            // Other participants still in call - just remove current user
            await updateDoc(callRef, {
              participants: updatedParticipants,
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.error('[CallService] Error leaving call:', error);
      }
    }
    
    await this.cleanup();
  }

  /**
   * Clean up a specific participant
   */
  async cleanupParticipant(participantId) {
    console.log('[CallService] Cleaning up participant:', participantId);
    
    // Clean up WebRTC documents if we're leaving the call
    if (this.currentCall && this.currentUserId) {
      try {
        // Delete offers/answers/candidates related to this connection
        const callId = this.currentCall.id;
        
        // Delete offers where we are sender or target
        const offerRef1 = doc(db, `calls/${callId}/offers`, `${this.currentUserId}-${participantId}`);
        const offerRef2 = doc(db, `calls/${callId}/offers`, `${participantId}-${this.currentUserId}`);
        
        // Delete answers where we are sender or target  
        const answerRef1 = doc(db, `calls/${callId}/answers`, `${this.currentUserId}-${participantId}`);
        const answerRef2 = doc(db, `calls/${callId}/answers`, `${participantId}-${this.currentUserId}`);
        
        // Delete in parallel, ignoring errors for non-existent docs
        await Promise.all([
          deleteDoc(offerRef1).catch(() => {}),
          deleteDoc(offerRef2).catch(() => {}),
          deleteDoc(answerRef1).catch(() => {}),
          deleteDoc(answerRef2).catch(() => {})
        ]);
      } catch (error) {
        console.error('[CallService] Error cleaning up WebRTC documents:', error);
      }
    }
    
    // Find and close peer connections with this participant
    const keysToDelete = [];
    this.peerConnections.forEach((pc, key) => {
      if (key.includes(participantId)) {
        pc.close();
        keysToDelete.push(key);
      }
    });
    
    // Remove peer connections
    keysToDelete.forEach(key => this.peerConnections.delete(key));
    
    // Remove remote stream
    if (this.remoteStreams.has(participantId)) {
      this.remoteStreams.delete(participantId);
      this.emit('participantLeft', participantId);
    }
    
    // Close data channel
    if (this.dataChannels.has(participantId)) {
      this.dataChannels.get(participantId).close();
      this.dataChannels.delete(participantId);
    }
    
    // Clean up listeners
    [`offer-${participantId}`, `answer-${participantId}`, `candidates-${participantId}`].forEach(key => {
      if (this.listeners.has(key)) {
        this.listeners.get(key)();
        this.listeners.delete(key);
      }
    });
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    console.log('[CallService] Cleaning up');
    
    // Clean up WebRTC documents before leaving
    if (this.currentCall && this.currentUserId) {
      try {
        const callId = this.currentCall.id;
        
        // Get all participants to clean up connections with them
        const participants = this.currentCall.participants || [];
        const cleanupPromises = [];
        
        for (const participantId of participants) {
          if (participantId !== this.currentUserId) {
            // Delete offers/answers for each connection
            cleanupPromises.push(
              deleteDoc(doc(db, `calls/${callId}/offers`, `${this.currentUserId}-${participantId}`)).catch(() => {}),
              deleteDoc(doc(db, `calls/${callId}/offers`, `${participantId}-${this.currentUserId}`)).catch(() => {}),
              deleteDoc(doc(db, `calls/${callId}/answers`, `${this.currentUserId}-${participantId}`)).catch(() => {}),
              deleteDoc(doc(db, `calls/${callId}/answers`, `${participantId}-${this.currentUserId}`)).catch(() => {})
            );
          }
        }
        
        // Delete all candidates where we are sender
        const candidatesQuery = query(
          collection(db, `calls/${callId}/candidates`),
          where('sender', '==', this.currentUserId)
        );
        const candidatesSnapshot = await getDocs(candidatesQuery);
        candidatesSnapshot.forEach(doc => {
          cleanupPromises.push(deleteDoc(doc.ref).catch(() => {}));
        });
        
        await Promise.all(cleanupPromises);
      } catch (error) {
        console.error('[CallService] Error cleaning up WebRTC documents:', error);
      }
    }
    
    // Clear timer
    if (this.callTimer) {
      clearTimeout(this.callTimer);
      this.callTimer = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close data channels
    this.dataChannels.forEach(channel => channel.close());
    this.dataChannels.clear();
    
    // Close peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    
    // Clear remote streams
    this.remoteStreams.clear();
    
    // Unsubscribe listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    
    // Clear pending candidates
    this.pendingCandidates.clear();
    
    // Reset current call
    this.currentCall = null;
    
    this.emit('callEnded');
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
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput'),
        audioOutputs: devices.filter(d => d.kind === 'audiooutput')
      };
    } catch (error) {
      console.error('[CallService] Error getting media devices:', error);
      return { audioInputs: [], videoInputs: [], audioOutputs: [] };
    }
  }

  /**
   * Switch media device
   */
  async switchDevice(kind, deviceId) {
    if (!this.localStream) return;

    const constraints = kind === 'video' 
      ? { video: { deviceId: { exact: deviceId } } }
      : { audio: { deviceId: { exact: deviceId } } };

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newTrack = newStream.getTracks()[0];
      const oldTrack = this.localStream.getTracks().find(t => t.kind === kind);

      if (oldTrack) {
        this.localStream.removeTrack(oldTrack);
        oldTrack.stop();
      }

      this.localStream.addTrack(newTrack);

      // Replace track in peer connections
      this.peerConnections.forEach((pc) => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === kind);
        if (sender) {
          sender.replaceTrack(newTrack);
        }
      });
    } catch (error) {
      console.error('[CallService] Error switching device:', error);
      throw error;
    }
  }
}

// Export singleton instance
const callService = new CallService();
export default callService;