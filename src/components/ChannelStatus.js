import React, { useEffect, useState } from 'react';
import { firestoreService } from '../services/firestore';

const ChannelStatus = ({ channelId, channelName }) => {
  const [status, setStatus] = useState({ checking: true, valid: false, error: null });

  useEffect(() => {
    const checkChannel = async () => {
      if (!channelId) {
        setStatus({ checking: false, valid: false, error: 'No channel ID' });
        return;
      }

      try {
        const isValid = await firestoreService.validateChannel(channelId);
        setStatus({ checking: false, valid: isValid, error: isValid ? null : 'Channel not found' });
      } catch (error) {
        setStatus({ checking: false, valid: false, error: error.message });
      }
    };

    checkChannel();
  }, [channelId]);

  if (status.checking) {
    return <span style={{ color: '#6b7280', fontSize: '12px' }}>Checking...</span>;
  }

  return (
    <span style={{ 
      color: status.valid ? '#10b981' : '#ef4444', 
      fontSize: '12px',
      marginLeft: '8px'
    }}>
      {status.valid ? '✓' : '✗'} {status.error || 'Valid'}
    </span>
  );
};

export default ChannelStatus;