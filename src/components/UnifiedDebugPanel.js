import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMessage } from '../contexts/MessageContext';
import { firestoreService } from '../services/firestore';
import { populateTestData } from '../utils/testDataGenerator';
import debugHelpers from '../utils/debugHelpers';
import './UnifiedDebugPanel.css';

const UnifiedDebugPanel = ({ activeChannelId, activeWorkspaceId }) => {
  const { currentUser, userProfile } = useAuth();
  const messageContext = useMessage();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('state');
  const [testMessage, setTestMessage] = useState('Test message ' + Date.now());
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messages = activeChannelId && messageContext.messages[activeChannelId] ? 
    messageContext.messages[activeChannelId] : [];
    
  // Keyboard shortcut to toggle panel
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Attach debug functions to window
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.moccetDebug = {
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev),
        getState: () => ({
          activeChannelId,
          activeWorkspaceId,
          messageCount: messages.length,
          messages,
          currentUser,
          messageContext: messageContext.messages
        }),
        sendTest: (content) => handleSendTestMessage(content),
        refresh: () => messageContext.subscribeToChannel(activeChannelId)
      };
      console.log('[UnifiedDebugPanel] Debug utilities available at window.moccetDebug');
    }
  }, [activeChannelId, activeWorkspaceId, messages, currentUser, messageContext]);
  
  const handleSendTestMessage = async (content) => {
    if (!activeChannelId || !activeWorkspaceId) {
      setTestResult('❌ No active channel or workspace');
      return;
    }
    
    setIsLoading(true);
    try {
      const messageContent = content || testMessage;
      const result = await messageContext.sendMessage(
        activeChannelId, 
        messageContent, 
        activeWorkspaceId
      );
      setTestResult(`✅ Message sent: ${result.id}`);
      setTestMessage('Test message ' + Date.now());
    } catch (error) {
      setTestResult(`❌ Send failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateTestData = async () => {
    if (!currentUser || !activeWorkspaceId || !activeChannelId) {
      setTestResult('❌ Missing required data');
      return;
    }
    
    setIsLoading(true);
    try {
      await populateTestData(currentUser, activeWorkspaceId, activeChannelId);
      setTestResult('✅ Test data generated successfully');
      messageContext.subscribeToChannel(activeChannelId); // Refresh
    } catch (error) {
      setTestResult(`❌ Failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRunDiagnostics = async () => {
    setIsLoading(true);
    setTestResult('Running diagnostics...');
    
    try {
      const results = [];
      
      // Check channel exists
      results.push('📍 Checking channel...');
      const channelExists = await firestoreService.validateChannel(activeChannelId);
      results.push(channelExists ? '✅ Channel exists' : '❌ Channel not found');
      
      // Check message count
      results.push('\n📊 Checking messages...');
      const messages = await debugHelpers.checkChannelMessages(activeChannelId);
      results.push(`Found ${messages.length} messages in Firestore`);
      results.push(`UI shows ${messages.length} messages`);
      
      // Check subscriptions
      results.push('\n🔌 Checking subscriptions...');
      results.push(`Active subscriptions: ${Object.keys(messageContext.messages).length}`);
      
      setTestResult(results.join('\n'));
    } catch (error) {
      setTestResult(`❌ Diagnostics failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearMessages = () => {
    if (window.confirm('Clear all messages from UI? (Does not affect Firestore)')) {
      // Force re-subscribe to refresh
      messageContext.unsubscribeFromChannel(activeChannelId);
      setTimeout(() => {
        messageContext.subscribeToChannel(activeChannelId);
      }, 100);
      setTestResult('✅ UI messages cleared and refreshed');
    }
  };
  
  if (!isOpen) {
    return (
      <button 
        className="unified-debug-toggle"
        onClick={() => setIsOpen(true)}
        title="Open Debug Panel (Ctrl+Shift+D)"
      >
        🛠️
      </button>
    );
  }
  
  return (
    <div className="unified-debug-panel">
      <div className="unified-debug-header">
        <h3>🛠️ Debug & Test Panel</h3>
        <button className="unified-debug-close" onClick={() => setIsOpen(false)}>×</button>
      </div>
      
      <div className="unified-debug-tabs">
        <button 
          className={`unified-debug-tab ${activeTab === 'state' ? 'active' : ''}`}
          onClick={() => setActiveTab('state')}
        >
          State
        </button>
        <button 
          className={`unified-debug-tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Test
        </button>
        <button 
          className={`unified-debug-tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          Messages
        </button>
        <button 
          className={`unified-debug-tab ${activeTab === 'diagnostics' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          Diagnostics
        </button>
      </div>
      
      <div className="unified-debug-content">
        {activeTab === 'state' && (
          <div className="unified-debug-state">
            <div className="unified-debug-info">
              <div><strong>Channel:</strong> {activeChannelId || 'None'}</div>
              <div><strong>Workspace:</strong> {activeWorkspaceId || 'None'}</div>
              <div><strong>User:</strong> {currentUser?.email || 'None'}</div>
              <div><strong>UID:</strong> {currentUser?.uid || 'None'}</div>
              <div><strong>Message Count:</strong> {messages.length}</div>
              <div><strong>Loading:</strong> {messageContext.loadingStates[activeChannelId] ? 'Yes' : 'No'}</div>
            </div>
            
            <div className="unified-debug-actions">
              <button onClick={() => messageContext.subscribeToChannel(activeChannelId)}>
                🔄 Refresh Subscription
              </button>
              <button onClick={handleClearMessages}>
                🗑️ Clear UI Messages
              </button>
              <button onClick={() => console.log(window.moccetDebug.getState())}>
                📋 Log State to Console
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'test' && (
          <div className="unified-debug-test">
            <div className="unified-debug-input-group">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Test message content..."
                onKeyPress={(e) => e.key === 'Enter' && handleSendTestMessage()}
              />
              <button 
                onClick={() => handleSendTestMessage()}
                disabled={isLoading || !activeChannelId}
              >
                📤 Send
              </button>
            </div>
            
            <div className="unified-debug-test-actions">
              <button onClick={() => handleSendTestMessage('👋 Hello World!')}>
                Send Hello
              </button>
              <button onClick={() => handleSendTestMessage('Testing emojis: 😀 🎉 🚀 ❤️ 👍 🔥')}>
                Send Emojis
              </button>
              <button onClick={() => handleSendTestMessage(`Long message test:\n${'\n'.repeat(2)}Lorem ipsum dolor sit amet, consectetur adipiscing elit.`)}>
                Send Long
              </button>
              <button onClick={handleGenerateTestData} disabled={isLoading}>
                Generate 20 Messages
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'messages' && (
          <div className="unified-debug-messages">
            <div className="unified-debug-message-list">
              {messages.length === 0 ? (
                <div className="unified-debug-empty">No messages in channel</div>
              ) : (
                messages.slice(-10).map((msg, idx) => (
                  <div key={msg.id || idx} className="unified-debug-message">
                    <div className="unified-debug-message-header">
                      <strong>{msg.senderName || msg.sender?.displayName || 'Unknown'}</strong>
                      <span className="unified-debug-message-time">
                        {msg.createdAt ? new Date(msg.createdAt.toDate ? msg.createdAt.toDate() : msg.createdAt).toLocaleTimeString() : 'unknown'}
                      </span>
                    </div>
                    <div className="unified-debug-message-content">
                      {msg.content?.substring(0, 100)}{msg.content?.length > 100 ? '...' : ''}
                    </div>
                    <div className="unified-debug-message-meta">
                      ID: {msg.id || 'No ID'} | Status: {msg.status || 'unknown'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'diagnostics' && (
          <div className="unified-debug-diagnostics">
            <div className="unified-debug-diagnostic-actions">
              <button onClick={handleRunDiagnostics} disabled={isLoading}>
                🔍 Run Full Diagnostics
              </button>
              <button onClick={async () => {
                const messages = await debugHelpers.checkChannelMessages(activeChannelId);
                setTestResult(`Found ${messages.length} messages in Firestore`);
              }}>
                📊 Check Firestore Messages
              </button>
              <button onClick={() => {
                const state = window.moccetDebug.getState();
                setTestResult(JSON.stringify(state, null, 2));
              }}>
                📋 Show Full State
              </button>
            </div>
          </div>
        )}
        
        {testResult && (
          <div className="unified-debug-result">
            <pre>{testResult}</pre>
          </div>
        )}
      </div>
      
      <div className="unified-debug-footer">
        <small>Press Ctrl+Shift+D to toggle panel</small>
      </div>
    </div>
  );
};

export default UnifiedDebugPanel;