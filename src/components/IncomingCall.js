import React, { useState, useEffect, useRef } from 'react';
import './IncomingCall.css';

const IncomingCall = ({ 
  isOpen, 
  caller, 
  callType = 'video',
  onAccept, 
  onDecline 
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Start timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Auto-decline after 30 seconds
      const autoDeclineTimer = setTimeout(() => {
        onDecline();
      }, 30000);

      // Play ringtone (optional - requires audio file)
      // if (ringtoneRef.current) {
      //   ringtoneRef.current.play().catch(e => console.log('Could not play ringtone'));
      // }

      return () => {
        clearInterval(timerRef.current);
        clearTimeout(autoDeclineTimer);
        // if (ringtoneRef.current) {
        //   ringtoneRef.current.pause();
        //   ringtoneRef.current.currentTime = 0;
        // }
      };
    }
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return (
    <div className="moccet-incoming-call">
      {/* Optional: Add ringtone audio */}
      {/* <audio ref={ringtoneRef} src="/ringtone.mp3" loop /> */}
      
      <div className="moccet-incoming-call-content">
        <div className="moccet-incoming-call-header">
          <div className="call-type-icon">
            <i className={`fa-solid ${callType === 'video' ? 'fa-video' : 'fa-phone'}`}></i>
          </div>
          <h3>Incoming {callType === 'video' ? 'Video' : 'Voice'} Call</h3>
          <div className="call-timer">{timeElapsed}s</div>
        </div>

        <div className="moccet-incoming-call-caller">
          <div className="caller-avatar">
            {caller?.photoURL ? (
              <img src={caller.photoURL} alt={caller.name} />
            ) : (
              <i className="fa-solid fa-user"></i>
            )}
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          <h2>{caller?.name || 'Unknown Caller'}</h2>
          <p>{caller?.email || ''}</p>
        </div>

        <div className="moccet-incoming-call-actions">
          <button
            className="call-action decline"
            onClick={onDecline}
            title="Decline"
          >
            <i className="fa-solid fa-phone-slash"></i>
            <span>Decline</span>
          </button>
          
          <button
            className="call-action accept"
            onClick={onAccept}
            title="Accept"
          >
            <i className={`fa-solid ${callType === 'video' ? 'fa-video' : 'fa-phone'}`}></i>
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCall;