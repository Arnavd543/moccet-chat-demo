import React, { useEffect, useState } from 'react';
import { firestore } from '../config/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// Direct component that bypasses all the complex logic
export const DirectMessageDisplay = ({ channelId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!channelId) return;
    
    console.log('[DirectMessageDisplay] Setting up subscription for:', channelId);
    
    const messagesRef = collection(firestore, 'channels', channelId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('[DirectMessageDisplay] Received snapshot:', {
          size: snapshot.size,
          empty: snapshot.empty
        });
        
        const newMessages = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          newMessages.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
          });
        });
        
        console.log('[DirectMessageDisplay] Messages:', newMessages);
        setMessages(newMessages);
        setLoading(false);
      },
      (error) => {
        console.error('[DirectMessageDisplay] Error:', error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [channelId]);
  
  if (loading) {
    return <div>Loading messages...</div>;
  }
  
  if (messages.length === 0) {
    return <div>No messages yet. Start the conversation!</div>;
  }
  
  return (
    <div style={{ padding: '20px' }}>
      <h3>Direct Message Display (Debug)</h3>
      <div>Channel: {channelId}</div>
      <div>Message count: {messages.length}</div>
      <div style={{ marginTop: '20px' }}>
        {messages.map(message => (
          <div key={message.id} style={{ 
            marginBottom: '10px', 
            padding: '10px', 
            border: '1px solid #ccc',
            borderRadius: '5px',
            backgroundColor: message.senderId === currentUser?.uid ? '#e3f2fd' : '#f5f5f5'
          }}>
            <div style={{ fontWeight: 'bold' }}>
              {message.senderName || 'Unknown'} 
              <span style={{ fontWeight: 'normal', marginLeft: '10px', fontSize: '12px' }}>
                {message.createdAt.toLocaleTimeString()}
              </span>
            </div>
            <div>{message.content}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>ID: {message.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DirectMessageDisplay;