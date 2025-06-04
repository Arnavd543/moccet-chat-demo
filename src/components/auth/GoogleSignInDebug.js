import React, { useState } from 'react';
import { 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from 'firebase/auth';
import { auth } from '../../config/firebase';

const GoogleSignInDebug = () => {
  const [debugInfo, setDebugInfo] = useState([]);
  const [loading, setLoading] = useState(false);

  const addDebugInfo = (info) => {
    setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${info}`]);
  };

  const testGoogleSignInPopup = async () => {
    setLoading(true);
    setDebugInfo([]);
    
    try {
      addDebugInfo('Starting Google sign-in with popup...');
      addDebugInfo(`Auth domain: ${process.env.REACT_APP_FIREBASE_AUTH_DOMAIN}`);
      addDebugInfo(`Using emulator: ${process.env.REACT_APP_USE_FIREBASE_EMULATOR}`);
      
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      addDebugInfo('Provider created, attempting sign-in...');
      
      const result = await signInWithPopup(auth, provider);
      
      addDebugInfo(`Success! User: ${result.user.email}`);
      addDebugInfo(`User ID: ${result.user.uid}`);
      addDebugInfo(`Auth provider: ${result.providerId}`);
      
    } catch (error) {
      addDebugInfo(`ERROR: ${error.code}`);
      addDebugInfo(`Message: ${error.message}`);
      addDebugInfo(`Full error: ${JSON.stringify(error, null, 2)}`);
      
      // Log to console for more details
      console.error('Full error object:', error);
    }
    
    setLoading(false);
  };

  const testGoogleSignInRedirect = async () => {
    setLoading(true);
    addDebugInfo('Starting Google sign-in with redirect...');
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error) {
      addDebugInfo(`Redirect ERROR: ${error.code} - ${error.message}`);
    }
  };

  const checkRedirectResult = async () => {
    try {
      addDebugInfo('Checking for redirect result...');
      const result = await getRedirectResult(auth);
      
      if (result) {
        addDebugInfo(`Redirect success! User: ${result.user.email}`);
      } else {
        addDebugInfo('No redirect result found');
      }
    } catch (error) {
      addDebugInfo(`Redirect result ERROR: ${error.code} - ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Google Sign-In Debug</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testGoogleSignInPopup}
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Test Popup Sign-In
        </button>
        
        <button 
          onClick={testGoogleSignInRedirect}
          disabled={loading}
          style={{ marginRight: '10px', padding: '10px 20px' }}
        >
          Test Redirect Sign-In
        </button>
        
        <button 
          onClick={checkRedirectResult}
          style={{ padding: '10px 20px' }}
        >
          Check Redirect Result
        </button>
      </div>
      
      <div style={{ 
        backgroundColor: '#f0f0f0', 
        padding: '20px', 
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        whiteSpace: 'pre-wrap',
        maxHeight: '400px',
        overflow: 'auto'
      }}>
        <h3>Debug Output:</h3>
        {debugInfo.length === 0 ? (
          <p>No debug info yet. Click a button to test.</p>
        ) : (
          debugInfo.map((info, index) => (
            <div key={index}>{info}</div>
          ))
        )}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <h3>Common Issues:</h3>
        <ul>
          <li><strong>auth/operation-not-allowed</strong>: Enable Google sign-in in Firebase Console</li>
          <li><strong>auth/unauthorized-domain</strong>: Add your domain to authorized domains in Firebase Console</li>
          <li><strong>auth/popup-blocked</strong>: Browser is blocking popups</li>
          <li><strong>Network error</strong>: Check internet connection or Firebase project configuration</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleSignInDebug;