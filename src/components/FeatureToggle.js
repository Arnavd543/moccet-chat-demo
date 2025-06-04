import React from 'react';
import { FEATURES } from '../config/featureFlags';

const FeatureToggle = () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const toggleFeature = () => {
    // Toggle between Firebase and original version
    const newValue = !FEATURES.USE_FIREBASE_CHAT;
    localStorage.setItem('USE_FIREBASE_CHAT', newValue.toString());
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: FEATURES.USE_FIREBASE_CHAT ? '#10b981' : '#6b7280',
      color: 'white',
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    }} onClick={toggleFeature}>
      {FEATURES.USE_FIREBASE_CHAT ? '🔥 Firebase' : '📄 Original'}
    </div>
  );
};

export default FeatureToggle;