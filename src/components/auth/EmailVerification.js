import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

const EmailVerification = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { currentUser, sendVerificationEmail } = useAuth();

  const handleResendEmail = async () => {
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await sendVerificationEmail();
      setMessage('Verification email sent! Check your inbox.');
    } catch (error) {
      setError('Failed to send verification email. Please try again.');
    }
    
    setLoading(false);
  };

  if (currentUser?.emailVerified) {
    return null;
  }

  return (
    <div className="email-verification-banner">
      <div className="verification-content">
        <i className="fa-solid fa-envelope"></i>
        <span>Please verify your email address to access all features.</span>
        <button 
          onClick={handleResendEmail} 
          disabled={loading}
          className="resend-button"
        >
          {loading ? 'Sending...' : 'Resend Email'}
        </button>
      </div>
      {message && <div className="verification-message success">{message}</div>}
      {error && <div className="verification-message error">{error}</div>}
    </div>
  );
};

export default EmailVerification;