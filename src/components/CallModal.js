import React, { useState, useEffect, useRef } from 'react';
import './CallModal.css';
import webRTCService, { CALL_STATES } from '../services/webrtcService';
import { firestoreService } from '../services/firestore';

const CallModal = ({ 
  isOpen, 
  onClose, 
  call, 
  currentUser, 
  participants = [] 
}) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [selectedAudioInput, setSelectedAudioInput] = useState('');
  const [selectedVideoInput, setSelectedVideoInput] = useState('');
  const [devices, setDevices] = useState({ audioInputs: [], videoInputs: [] });
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [screenStream, setScreenStream] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  
  const localVideoRef = useRef(null);
  const screenShareRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const callStartTime = useRef(null);
  const durationInterval = useRef(null);

  // Initialize call
  useEffect(() => {
    if (isOpen && call) {
      setupCall();
      loadDevices();
      
      // If we already have participants, trigger an update
      if (call.participants && call.participants.length > 0) {
        fetchParticipantInfo(call.participants);
      }
      
      // Start duration timer using call creation time
      const callCreatedAt = call.createdAt?.toDate?.() || new Date(call.createdAt) || new Date();
      callStartTime.current = callCreatedAt.getTime();
      
      // Update timer immediately and then every second
      const updateDuration = () => {
        const duration = Math.floor((Date.now() - callStartTime.current) / 1000);
        setCallDuration(duration);
      };
      
      updateDuration(); // Initial update
      durationInterval.current = setInterval(updateDuration, 1000);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isOpen, call]);

  // Function to fetch participant info
  const fetchParticipantInfo = async (participantIds) => {
    const remoteIds = participantIds.filter(id => id !== currentUser.uid);
    
    const participantPromises = remoteIds.map(async (id) => {
      const existingParticipant = remoteParticipants.find(p => p.id === id);
      if (existingParticipant && existingParticipant.name !== 'Connecting...') {
        return existingParticipant;
      }
      
      try {
        const userProfile = await firestoreService.getUserProfile(id);
        if (userProfile) {
          return {
            id,
            name: userProfile.displayName || userProfile.email?.split('@')[0] || 'User',
            photoURL: userProfile.photoURL || null
          };
        }
      } catch (error) {
        console.error('[CallModal] Error fetching participant info:', error);
      }
      
      return { id, name: 'User', photoURL: null };
    });
    
    const updatedParticipants = await Promise.all(participantPromises);
    setRemoteParticipants(updatedParticipants);
  };

  // Set up WebRTC event handlers
  useEffect(() => {
    const handleRemoteStream = ({ participantId, stream }) => {
      console.log('Setting remote stream for participant:', participantId);
      const videoElement = remoteVideoRefs.current.get(participantId);
      if (videoElement) {
        videoElement.srcObject = stream;
      }
    };

    const handleConnectionState = ({ participantId, state }) => {
      console.log('Connection state for', participantId, ':', state);
      if (state === 'connected') {
        setConnectionStatus('connected');
      } else if (state === 'failed') {
        setConnectionStatus('failed');
      }
    };

    const handleAudioState = (enabled) => {
      setIsAudioEnabled(enabled);
    };

    const handleVideoState = (enabled) => {
      setIsVideoEnabled(enabled);
    };

    const handleScreenShareStarted = (stream) => {
      setScreenStream(stream);
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = stream;
      }
    };

    const handleScreenShareStopped = () => {
      setScreenStream(null);
      if (screenShareRef.current) {
        screenShareRef.current.srcObject = null;
      }
    };

    const handleParticipantsUpdate = (participantIds) => {
      fetchParticipantInfo(participantIds);
    };
    
    const handleLocalStreamUpdate = () => {
      // Re-setup local video when stream updates
      if (localVideoRef.current && webRTCService.localStream) {
        console.log('[CallModal] Local stream updated, refreshing video element');
        localVideoRef.current.srcObject = webRTCService.localStream;
      }
    };
    
    const handleParticipantLeft = (participantId) => {
      console.log('[CallModal] Participant left:', participantId);
      // Remove video element reference
      if (remoteVideoRefs.current.has(participantId)) {
        const videoElement = remoteVideoRefs.current.get(participantId);
        if (videoElement) {
          videoElement.srcObject = null;
        }
        remoteVideoRefs.current.delete(participantId);
      }
      // Remove from remote participants
      setRemoteParticipants(prev => prev.filter(p => p.id !== participantId));
    };

    webRTCService.on('remoteStream', handleRemoteStream);
    webRTCService.on('connectionState', handleConnectionState);
    webRTCService.on('audioStateChanged', handleAudioState);
    webRTCService.on('videoStateChanged', handleVideoState);
    webRTCService.on('screenShareStarted', handleScreenShareStarted);
    webRTCService.on('screenShareStopped', handleScreenShareStopped);
    webRTCService.on('participantsUpdated', handleParticipantsUpdate);
    webRTCService.on('localStreamUpdated', handleLocalStreamUpdate);
    webRTCService.on('participantLeft', handleParticipantLeft);

    return () => {
      webRTCService.off('remoteStream', handleRemoteStream);
      webRTCService.off('connectionState', handleConnectionState);
      webRTCService.off('audioStateChanged', handleAudioState);
      webRTCService.off('videoStateChanged', handleVideoState);
      webRTCService.off('screenShareStarted', handleScreenShareStarted);
      webRTCService.off('screenShareStopped', handleScreenShareStopped);
      webRTCService.off('participantsUpdated', handleParticipantsUpdate);
      webRTCService.off('localStreamUpdated', handleLocalStreamUpdate);
      webRTCService.off('participantLeft', handleParticipantLeft);
    };
  }, [currentUser, participants]);

  const setupCall = async () => {
    try {
      // Set local stream to video element
      if (localVideoRef.current && webRTCService.localStream) {
        console.log('[CallModal] Setting local stream to video element');
        localVideoRef.current.srcObject = webRTCService.localStream;
        
        // Log stream tracks
        const tracks = webRTCService.localStream.getTracks();
        console.log('[CallModal] Local stream tracks:', tracks.map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          label: t.label,
          muted: t.muted
        })));
      } else {
        console.warn('[CallModal] Missing localVideoRef or localStream', {
          hasRef: !!localVideoRef.current,
          hasStream: !!webRTCService.localStream
        });
      }
    } catch (error) {
      console.error('Error setting up call:', error);
    }
  };

  const loadDevices = async () => {
    const deviceList = await webRTCService.getMediaDevices();
    setDevices(deviceList);
    
    // Set default devices
    if (deviceList.audioInputs.length > 0) {
      setSelectedAudioInput(deviceList.audioInputs[0].deviceId);
    }
    if (deviceList.videoInputs.length > 0) {
      setSelectedVideoInput(deviceList.videoInputs[0].deviceId);
    }
  };

  const handleToggleAudio = () => {
    webRTCService.toggleAudio(!isAudioEnabled);
  };

  const handleToggleVideo = () => {
    webRTCService.toggleVideo(!isVideoEnabled);
  };

  const handleToggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await webRTCService.startScreenShare();
        setIsScreenSharing(true);
      } else {
        await webRTCService.stopScreenShare();
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing permission denied');
      }
    }
  };

  const handleEndCall = async () => {
    await webRTCService.endCall();
    onClose();
  };

  const handleDeviceChange = async (kind, deviceId) => {
    try {
      await webRTCService.switchDevice(kind, deviceId);
      if (kind === 'audio') {
        setSelectedAudioInput(deviceId);
      } else {
        setSelectedVideoInput(deviceId);
      }
      setShowDeviceMenu(false);
    } catch (error) {
      console.error('Error switching device:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="moccet-call-modal">
      <div className="moccet-call-container">
        {/* Header */}
        <div className="moccet-call-header">
          <div className="moccet-call-info">
            <h3>{call?.isVideo ? 'Video Call' : 'Voice Call'}</h3>
            <div className="moccet-call-status">
              <span className={`status-indicator ${connectionStatus}`}></span>
              <span>{formatDuration(callDuration)}</span>
            </div>
          </div>
          <button className="moccet-call-minimize" onClick={onClose}>
            <i className="fa-solid fa-minus"></i>
          </button>
        </div>

        {/* Video Grid */}
        <div className="moccet-call-video-grid">
          {/* Local Video or Screen Share */}
          <div className="moccet-call-video-container local">
            {isScreenSharing ? (
              <>
                <video
                  ref={screenShareRef}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="moccet-call-video-label">
                  <i className="fa-solid fa-desktop"></i> Your Screen
                </div>
              </>
            ) : (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={!isVideoEnabled ? 'hidden' : ''}
                />
                {!isVideoEnabled && (
                  <div className="moccet-call-video-placeholder">
                    <div className="avatar">
                      {currentUser?.photoURL ? (
                        <img src={currentUser.photoURL} alt="You" />
                      ) : (
                        <i className="fa-solid fa-user"></i>
                      )}
                    </div>
                    <span>You</span>
                  </div>
                )}
                <div className="moccet-call-video-label">You</div>
              </>
            )}
          </div>

          {/* Remote Videos */}
          {remoteParticipants.map((participant) => {
            const hasStream = remoteVideoRefs.current.get(participant.id)?.srcObject;
            return (
              <div key={participant.id} className="moccet-call-video-container">
                <video
                  ref={(el) => {
                    if (el) remoteVideoRefs.current.set(participant.id, el);
                  }}
                  autoPlay
                  playsInline
                  className={hasStream ? '' : 'hidden'}
                />
                {!hasStream && (
                  <div className="moccet-call-video-placeholder">
                    <div className="avatar">
                      {participant.photoURL ? (
                        <img src={participant.photoURL} alt={participant.name || 'Participant'} />
                      ) : (
                        <i className="fa-solid fa-user"></i>
                      )}
                    </div>
                    <span>{participant.name || 'Connecting...'}</span>
                  </div>
                )}
                <div className="moccet-call-video-label">{participant.name || 'Participant'}</div>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="moccet-call-controls">
          <div className="moccet-call-controls-left">
            <button
              className={`moccet-call-control ${!isAudioEnabled ? 'disabled' : ''}`}
              onClick={handleToggleAudio}
              title={isAudioEnabled ? 'Mute' : 'Unmute'}
            >
              <i className={`fa-solid ${isAudioEnabled ? 'fa-microphone' : 'fa-microphone-slash'}`}></i>
            </button>
            
            <button
              className={`moccet-call-control ${!isVideoEnabled ? 'disabled' : ''}`}
              onClick={handleToggleVideo}
              title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <i className={`fa-solid ${isVideoEnabled ? 'fa-video' : 'fa-video-slash'}`}></i>
            </button>
            
            <button
              className={`moccet-call-control ${isScreenSharing ? 'active' : ''}`}
              onClick={handleToggleScreenShare}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
            >
              <i className="fa-solid fa-desktop"></i>
            </button>
            
            <div className="moccet-call-control-group">
              <button
                className="moccet-call-control"
                onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                title="Settings"
              >
                <i className="fa-solid fa-gear"></i>
              </button>
              
              {showDeviceMenu && (
                <div className="moccet-call-device-menu">
                  <div className="device-section">
                    <label>Microphone</label>
                    <select
                      value={selectedAudioInput}
                      onChange={(e) => handleDeviceChange('audio', e.target.value)}
                    >
                      {devices.audioInputs.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || 'Microphone'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="device-section">
                    <label>Camera</label>
                    <select
                      value={selectedVideoInput}
                      onChange={(e) => handleDeviceChange('video', e.target.value)}
                    >
                      {devices.videoInputs.map((device) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || 'Camera'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            className="moccet-call-control end-call"
            onClick={handleEndCall}
            title="End call"
          >
            <i className="fa-solid fa-phone-slash"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallModal;