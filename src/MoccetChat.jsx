import React, { useState, useRef, useEffect } from 'react';
import './MoccetChat.css';
import { useAuth } from './contexts/AuthContext';
import { useMessage } from './contexts/MessageContext';
import { firestoreService } from './services/firestore';
import { realtimeService } from './services/realtime';
import { usePresence } from './hooks/usePresence';
import UnifiedDebugPanel from './components/UnifiedDebugPanel';

const MoccetChat = () => {
  // State management
  const { currentUser, userProfile, logout } = useAuth();
  
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showChannelsSidebar, setShowChannelsSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSmartCommands, setShowSmartCommands] = useState(false);
  const [showAgentDirectory, setShowAgentDirectory] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('public');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Message context
  const messageContext = useMessage();
  
  // Use presence hook
  usePresence(activeChannelId);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Function to refresh channels
  const refreshChannels = async () => {
    if (activeWorkspaceId && currentUser) {
      try {
        const workspaceChannels = await firestoreService.getChannels(activeWorkspaceId, currentUser.uid);
        setChannels(workspaceChannels);
      } catch (error) {
        console.error('Error refreshing channels:', error);
      }
    }
  };

  // Emoji list
  const emojis = ['😊', '😂', '🙂', '😍', '😎', '🤔', '🤗', '🤫', '😮', '😥', '😴', '😫', '🤯', '🥳', '😇', '👍', '👎', '👏', '🙏', '🔥', '❤️', '🚀', '🎉', '💯'];

  // Smart commands list
  const smartCommandsList = [
    { icon: 'fa-robot', name: 'Agent Directory', desc: 'Browse and add AI agents to your workspace', shortcut: '/agent' },
    { icon: 'fa-wand-magic-sparkles', name: 'AI Generate', desc: 'Generate content with AI', shortcut: '/ai' },
    { icon: 'fa-list-check', name: 'Create Task', desc: 'Add a new task to your project', shortcut: '/task' },
    { icon: 'fa-code', name: 'Code Block', desc: 'Insert formatted code snippet', shortcut: '/code' }
  ];

  // Helper function to format time ago
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  // Initialize workspace and channels on mount
  useEffect(() => {
    const initializeWorkspace = async () => {
      if (!currentUser) return;
      
      setIsInitializing(true);
      try {
        // Get user's workspaces
        let userWorkspaces = await firestoreService.getUserWorkspaces(currentUser.uid);
        
        // If no workspaces, create a default one
        if (userWorkspaces.length === 0) {
          console.log('[MoccetChat] No workspaces found, creating default workspace...');
          const newWorkspace = await firestoreService.createWorkspace({
            name: 'My Workspace',
            description: 'Default workspace',
            ownerId: currentUser.uid,
            members: [currentUser.uid],
            admins: [currentUser.uid]
          });
          userWorkspaces = [newWorkspace];
        }
        
        setWorkspaces(userWorkspaces);
        
        if (userWorkspaces.length > 0) {
          const defaultWorkspace = userWorkspaces[0];
          setActiveWorkspaceId(defaultWorkspace.id);
          
          // Get channels for the workspace (pass userId to get member channels)
          const workspaceChannels = await firestoreService.getChannels(defaultWorkspace.id, currentUser.uid);
          setChannels(workspaceChannels);
          
          // Set the first channel as active
          if (workspaceChannels.length > 0) {
            const firstChannel = workspaceChannels[0];
            setActiveChannelId(firstChannel.id);
            // Don't subscribe here - the useEffect will handle it
          }
        }
        
        // Get direct messages
        const dms = await firestoreService.getDirectMessages(currentUser.uid);
        setDirectMessages(dms);
      } catch (error) {
        console.error('Error initializing workspace:', error);
        // Show user-friendly error message
        alert('Failed to load workspace. Please refresh the page and try again.');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeWorkspace();
  }, [currentUser, messageContext]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!activeChannelId || !currentUser) return;

    const unsubscribe = realtimeService.subscribeToTyping(activeChannelId, (typingUsers) => {
      const otherUsersTyping = typingUsers.filter(user => user.userId !== currentUser.uid);
      setShowTypingIndicator(otherUsersTyping.length > 0);
    });

    return () => unsubscribe();
  }, [activeChannelId, currentUser]);

  // Subscribe to active channel messages
  useEffect(() => {
    if (activeChannelId) {
      console.log('[MoccetChat] Channel changed, subscribing to:', activeChannelId);
      messageContext.subscribeToChannel(activeChannelId);
      
      return () => {
        messageContext.unsubscribeFromChannel(activeChannelId);
      };
    }
  }, [activeChannelId, messageContext]);
  
  // Get messages for current channel
  const channelMessages = React.useMemo(() => {
    if (activeChannelId && messageContext.messages[activeChannelId]) {
      return messageContext.messages[activeChannelId].filter(msg => msg.id && msg.id !== '');
    }
    return [];
  }, [activeChannelId, messageContext.messages]);
  
  const loading = activeChannelId ? messageContext.loadingStates[activeChannelId] || false : false;
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [channelMessages]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileMenu && !event.target.closest('.moccet-nav-item-avatar')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showProfileMenu]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Show smart commands if input starts with '/'
    setShowSmartCommands(value.startsWith('/'));
    
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
    
    // Handle typing indicator
    if (activeChannelId && currentUser) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set typing status
      if (value.trim()) {
        realtimeService.setTypingStatus(activeChannelId, currentUser.uid, true, {
          userName: userProfile?.displayName || currentUser.email || 'Unknown User',
          userPhoto: userProfile?.photoURL || currentUser.photoURL || null
        });
        
        // Clear typing after 3 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
          realtimeService.setTypingStatus(activeChannelId, currentUser.uid, false);
        }, 3000);
      } else {
        realtimeService.setTypingStatus(activeChannelId, currentUser.uid, false);
      }
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (inputValue.trim() && activeChannelId && activeWorkspaceId) {
      try {
        console.log('[MoccetChat] Sending message:', {
          channelId: activeChannelId,
          workspaceId: activeWorkspaceId,
          content: inputValue.trim()
        });
        
        // Clear typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        realtimeService.setTypingStatus(activeChannelId, currentUser.uid, false);
        
        // Send message to Firebase
        await messageContext.sendMessage(activeChannelId, inputValue.trim(), activeWorkspaceId);
        setInputValue('');
        inputRef.current.style.height = 'auto';
      } catch (error) {
        console.error('[MoccetChat] Error sending message:', error);
        alert(`Failed to send message: ${error.message}`);
      }
    } else {
      console.warn('[MoccetChat] Cannot send message:', {
        hasContent: !!inputValue.trim(),
        hasChannelId: !!activeChannelId,
        hasWorkspaceId: !!activeWorkspaceId
      });
    }
  };

  // Handle key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji) => {
    setInputValue(inputValue + emoji);
    setShowEmojiPicker(false);
    inputRef.current.focus();
  };

  // Handle reaction toggle
  const handleReactionToggle = async (messageId, reaction) => {
    try {
      const message = channelMessages.find(m => m.id === messageId);
      if (!message) return;
      
      const userReaction = message.reactions?.find(
        r => r.emoji === reaction && r.userId === currentUser.uid
      );
      
      if (userReaction) {
        await messageContext.removeReaction(activeChannelId, messageId, reaction);
      } else {
        await messageContext.addReaction(activeChannelId, messageId, reaction);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  // Show loading screen during initialization
  if (isInitializing && !activeWorkspaceId) {
    return (
      <div className={`moccet-app-container ${isDarkTheme ? 'moccet-dark-theme' : ''}`}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div className="moccet-loading-spinner" style={{ fontSize: '48px' }}>
            <i className="fa-solid fa-spinner fa-spin"></i>
          </div>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>
            Setting up your workspace...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`moccet-app-container ${isDarkTheme ? 'moccet-dark-theme' : ''}`}>
      {/* Unified Debug Panel */}
      <UnifiedDebugPanel 
        activeChannelId={activeChannelId} 
        activeWorkspaceId={activeWorkspaceId} 
      />
      
      {/* Left Sidebar (Nav) */}
      <div className="moccet-sidebar">
        <div className="moccet-sidebar-logo">m</div>
        
        <div className="moccet-sidebar-nav">
          <div className="moccet-nav-item moccet-active" title="Chat">
            <i className="fa-solid fa-message"></i>
            <div className="moccet-tooltip">Chat</div>
          </div>
          <div className="moccet-nav-item" title="Projects">
            <i className="fa-solid fa-briefcase"></i>
            <div className="moccet-tooltip">Projects</div>
          </div>
          <div className="moccet-nav-item" title="Team">
            <i className="fa-solid fa-users"></i>
            <div className="moccet-tooltip">Team</div>
          </div>
          <div className="moccet-nav-item" title="Calendar">
            <i className="fa-solid fa-calendar-days"></i>
            <div className="moccet-tooltip">Calendar</div>
          </div>
          <div className="moccet-nav-item" title="Analytics">
            <i className="fa-solid fa-chart-simple"></i>
            <div className="moccet-tooltip">Analytics</div>
          </div>
          <div className="moccet-nav-item" title="Settings">
            <i className="fa-solid fa-gear"></i>
            <div className="moccet-tooltip">Settings</div>
          </div>
          
          <div className="moccet-nav-item-avatar" onClick={() => setShowProfileMenu(!showProfileMenu)} title="Profile menu">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="User Profile" />
            ) : (
              <div className="moccet-default-avatar">
                <i className="fa-solid fa-user"></i>
              </div>
            )}
            <div className="moccet-status-indicator"></div>
            
            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="moccet-profile-menu" onClick={(e) => e.stopPropagation()}>
                <div 
                  className="moccet-profile-menu-item" 
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowProfileMenu(false);
                  }}
                >
                  <i className="fa-solid fa-user-circle"></i>
                  <span>Profile</span>
                </div>
                <div className="moccet-profile-menu-divider"></div>
                <div 
                  className="moccet-profile-menu-item moccet-logout" 
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                >
                  <i className="fa-solid fa-sign-out-alt"></i>
                  <span>Log Out</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="moccet-theme-toggle" onClick={handleThemeToggle}>
          <i className={`fa-solid ${isDarkTheme ? 'fa-moon' : 'fa-sun'}`}></i>
        </div>
        <div className="moccet-add-button">
          <i className="fa-solid fa-plus"></i>
        </div>
      </div>
      
      {/* Channels Sidebar */}
      <div className={`moccet-channels-sidebar ${showChannelsSidebar ? 'moccet-show' : ''}`}>
        <div className="moccet-workspace-header">
          <div className="moccet-workspace-title">
            <div className="moccet-workspace-name">
              {workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Loading...'}
            </div>
            <div className="moccet-workspace-status">
              {workspaces.find(w => w.id === activeWorkspaceId)?.members?.length || 0} members
            </div>
          </div>
          <div className="moccet-search-button">
            <i className="fa-solid fa-magnifying-glass"></i>
          </div>
        </div>
        
        <div className="moccet-channels-section">
          {/* Pinned Channels */}
          <div className="moccet-section-title">
            Pinned Spaces
            <div className="moccet-section-title-actions">
              <div className="moccet-section-action" onClick={() => setShowCreateChannel(true)} title="Create Channel">
                <i className="fa-solid fa-plus"></i>
              </div>
              <div className="moccet-section-action">
                <i className="fa-solid fa-ellipsis"></i>
              </div>
            </div>
          </div>
          <ul className="moccet-channel-list">
            {channels.length === 0 ? (
              <li className="moccet-channel-item moccet-loading">
                <i className="fa-solid fa-spinner fa-spin"></i> Loading channels...
              </li>
            ) : (
              channels.map(channel => (
                <li 
                  key={channel.id} 
                  className={`moccet-channel-item ${activeChannelId === channel.id ? 'moccet-active' : ''}`}
                  onClick={() => {
                    console.log('[MoccetChat] Switching to channel:', channel.id);
                    setActiveChannelId(channel.id);
                    setInputValue(''); // Clear input when switching channels
                  }}
                >
                  <div className="moccet-channel-icon">
                    <i className={`fa-solid ${channel.type === 'private' ? 'fa-lock' : 'fa-hashtag'}`}></i>
                  </div>
                  <div className="moccet-channel-name">{channel.name}</div>
                  {channel.unreadCount > 0 && (
                    <div className="moccet-channel-badge">{channel.unreadCount}</div>
                  )}
                </li>
              ))
            )}
          </ul>
          
          {/* Direct Messages */}
          <div className="moccet-section-title">
            Direct Messages
            <div className="moccet-section-title-actions">
              <div className="moccet-section-action">
                <i className="fa-solid fa-plus"></i>
              </div>
            </div>
          </div>
          <div className="moccet-dm-list">
            {directMessages.length === 0 ? (
              <div className="moccet-dm-item moccet-loading">
                <i className="fa-solid fa-spinner fa-spin"></i> No direct messages
              </div>
            ) : (
              directMessages.map(dm => {
                const otherUser = dm.participants.find(p => p.id !== currentUser?.uid);
                return (
                  <div key={dm.id} className="moccet-dm-item">
                    <div className="moccet-dm-left moccet-flex moccet-items-center moccet-gap-2">
                      <div className="moccet-dm-avatar">
                        {otherUser?.photoURL ? (
                          <img src={otherUser.photoURL} alt="Avatar" />
                        ) : (
                          <div className="moccet-dm-default-avatar">
                            <i className="fa-solid fa-user"></i>
                          </div>
                        )}
                        <div className="moccet-dm-status"></div>
                      </div>
                      <div>
                        <div className="moccet-dm-name">{otherUser?.displayName || 'Unknown'}</div>
                        <div className="moccet-dm-preview">
                          {dm.lastMessage?.content?.substring(0, 30) || 'No messages yet'}...
                        </div>
                      </div>
                    </div>
                    <div className="moccet-dm-time">
                      {dm.lastMessage?.createdAt && formatTimeAgo(dm.lastMessage.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="moccet-main-content">
        {/* Chat Header */}
        <div className="moccet-chat-header">
          <div className="moccet-header-title">
            <div className="moccet-project-icon">
              <i className={`fa-solid ${channels.find(c => c.id === activeChannelId)?.type === 'private' ? 'fa-lock' : 'fa-hashtag'}`}></i>
            </div>
            <div className="moccet-project-details">
              <div className="moccet-project-name">
                {channels.find(c => c.id === activeChannelId)?.name || 'Select a channel'}
              </div>
              <div className="moccet-project-members">
                <div className="moccet-project-members-avatars">
                  {channels.find(c => c.id === activeChannelId)?.members?.slice(0, 3).map((member, idx) => (
                    <div key={idx} className="moccet-member-avatar">
                      {member.photoURL ? (
                        <img src={member.photoURL} alt="Member" />
                      ) : (
                        <div className="moccet-member-default-avatar">
                          <i className="fa-solid fa-user"></i>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {channels.find(c => c.id === activeChannelId)?.members?.length > 3 && (
                  <div className="moccet-member-count">+{channels.find(c => c.id === activeChannelId)?.members?.length - 3} more</div>
                )}
              </div>
            </div>
          </div>
          <div className="moccet-header-actions">
            <div className="moccet-header-button" onClick={() => setShowAgentDirectory(true)}>
              <i className="fa-solid fa-robot"></i>
              <div className="moccet-tooltip">Agent Directory</div>
            </div>
            <div className="moccet-header-button">
              <i className="fa-solid fa-magnifying-glass"></i>
              <div className="moccet-tooltip">Search</div>
            </div>
            <div className="moccet-header-button">
              <i className="fa-solid fa-comment-dots"></i>
              <div className="moccet-tooltip">Threads</div>
              <div className="moccet-notification-dot"></div>
            </div>
            <div className="moccet-header-button moccet-mobile-menu" onClick={() => setShowChannelsSidebar(!showChannelsSidebar)}>
              <i className="fa-solid fa-bars"></i>
            </div>
          </div>
        </div>
        
        {/* Chat Area */}
        <div className="moccet-chat-area">
          {/* Messages Container */}
          <div className="moccet-messages-container">
            {loading && channelMessages.length === 0 ? (
              <div className="moccet-loading-container">
                <div className="moccet-loading-spinner">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
                <div className="moccet-loading-text">Loading messages...</div>
              </div>
            ) : channelMessages.length === 0 ? (
              <div className="moccet-empty-messages">
                <div className="moccet-empty-icon">
                  <i className="fa-solid fa-comments"></i>
                </div>
                <div className="moccet-empty-text">No messages yet. Start the conversation!</div>
              </div>
            ) : (
              <>
                {channelMessages.map((message) => {
                  const isCurrentUser = message.senderId === currentUser?.uid || message.userId === currentUser?.uid;
                  const messageTime = message.createdAt?.toDate ? 
                    new Date(message.createdAt.toDate()).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    }) : 'Just now';
                  
                  return (
                    <div key={message.id} className={`moccet-message ${!isCurrentUser ? 'moccet-ai-message' : ''}`}>
                      <div className={`moccet-message-avatar ${!isCurrentUser ? 'moccet-ai-agent-avatar' : ''}`}>
                        {message.senderAvatar || message.sender?.photoURL ? (
                          <img src={message.senderAvatar || message.sender?.photoURL} alt="Avatar" />
                        ) : (
                          <div className="moccet-message-default-avatar">
                            <i className="fa-solid fa-user"></i>
                          </div>
                        )}
                      </div>
                      <div className="moccet-message-content">
                        <div className="moccet-message-header">
                          <div className="moccet-message-sender">
                            {message.senderName || message.sender?.displayName || 'Unknown User'}
                          </div>
                          <div className="moccet-message-time">{messageTime}</div>
                          {message.status === 'sending' && (
                            <div className="moccet-message-status">Sending...</div>
                          )}
                        </div>
                        <div className="moccet-message-text">
                          {message.content?.split('\n').map((line, i) => (
                            <p key={i}>{line}</p>
                          )) || <p>{message.content}</p>}
                        </div>
                  
                  {message.hasFile && (
                    <div className="moccet-file-preview">
                      <div className="moccet-file-icon">
                        <i className="fa-solid fa-file-lines"></i>
                      </div>
                      <div className="moccet-file-info">
                        <div className="moccet-file-name">Project_Status_Update.doc</div>
                        <div className="moccet-file-meta">Document • 32 KB • Just now</div>
                      </div>
                      <div className="moccet-file-actions">
                        <div className="moccet-file-action-btn">
                          <i className="fa-solid fa-eye"></i>
                        </div>
                        <div className="moccet-file-action-btn">
                          <i className="fa-solid fa-download"></i>
                        </div>
                        <div className="moccet-file-action-btn">
                          <i className="fa-solid fa-share"></i>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {message.hasInsight && (
                    <div className="moccet-ai-insight">
                      <div className="moccet-ai-insight-title">
                        <i className="fa-solid fa-lightbulb"></i>
                        Suggestion
                      </div>
                      <div className="moccet-ai-insight-content">
                        Consider including specific milestones and target dates for the development phase to help set clear expectations for the team.
                      </div>
                    </div>
                  )}
                  
                  {message.smartActions && (
                    <div className="moccet-ai-smart-actions">
                      {message.smartActions.map((action, i) => (
                        <div key={i} className="moccet-smart-action-btn">
                          <i className={`fa-solid ${i === 0 ? 'fa-file-lines' : i === 1 ? 'fa-calendar-check' : i === 2 ? 'fa-robot' : 'fa-rotate'}`}></i>
                          {action}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="moccet-message-actions">
                    <div className="moccet-message-action-btn" title="Reply in Thread">
                      <i className="fa-solid fa-reply"></i>
                    </div>
                    <div className="moccet-message-action-btn" title="React">
                      <i className="fa-solid fa-face-smile"></i>
                    </div>
                    <div className="moccet-message-action-btn" title="More Actions">
                      <i className="fa-solid fa-ellipsis"></i>
                    </div>
                  </div>
                  
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="moccet-message-reactions">
                            {Object.entries(
                              message.reactions.reduce((acc, reaction) => {
                                if (!acc[reaction.emoji]) {
                                  acc[reaction.emoji] = { count: 0, userReacted: false };
                                }
                                acc[reaction.emoji].count++;
                                if (reaction.userId === currentUser?.uid) {
                                  acc[reaction.emoji].userReacted = true;
                                }
                                return acc;
                              }, {})
                            ).map(([emoji, data]) => (
                              <div
                                key={emoji}
                                className={`moccet-message-reaction ${data.userReacted ? 'moccet-active' : ''}`}
                                onClick={() => handleReactionToggle(message.id, emoji)}
                              >
                                {emoji} <span className="moccet-reaction-count">{data.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            
            {showTypingIndicator && (
              <div className="moccet-typing-indicator">
                <div className="moccet-typing-dot"></div>
                <div className="moccet-typing-dot"></div>
                <div className="moccet-typing-dot"></div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="moccet-input-area-container">
            {showContextPanel && (
              <div className="moccet-context-panel">
                <div className="moccet-context-panel-header">
                  <div className="moccet-context-panel-title">
                    <i className="fa-solid fa-brain"></i>
                    Working Context
                  </div>
                  <div className="moccet-context-panel-close" onClick={() => setShowContextPanel(false)}>
                    <i className="fa-solid fa-xmark"></i>
                  </div>
                </div>
                <div className="moccet-context-items">
                  <div className="moccet-context-item">
                    <i className="fa-solid fa-file-lines"></i>
                    Project_Status_Update.doc
                  </div>
                  <div className="moccet-context-item">
                    <i className="fa-solid fa-list-check"></i>
                    Development Tasks
                  </div>
                  <div className="moccet-context-item">
                    <i className="fa-solid fa-calendar"></i>
                    Project Timeline
                  </div>
                  <div className="moccet-context-item">
                    <i className="fa-solid fa-plus"></i>
                    Add Context
                  </div>
                </div>
              </div>
            )}
            
            <div className="moccet-input-tools">
              <div className="moccet-tools-left">
                <div className="moccet-tool-button">
                  <i className="fa-solid fa-font"></i>
                  <div className="moccet-tooltip">Format</div>
                </div>
                <div className="moccet-tool-button">
                  <i className="fa-solid fa-paperclip"></i>
                  <div className="moccet-tooltip">Attach</div>
                </div>
                <div className="moccet-tool-button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                  <i className="fa-regular fa-face-smile"></i>
                  <div className="moccet-tooltip">Emoji</div>
                </div>
                <div className="moccet-tool-button">
                  <i className="fa-solid fa-code"></i>
                  <div className="moccet-tooltip">Code</div>
                </div>
              </div>
              <div className="moccet-tools-right">
                <button className="moccet-ai-assist-btn">
                  <i className="fa-solid fa-wand-magic-sparkles moccet-icon"></i>
                  AI Assist
                </button>
              </div>
            </div>
            
            <div className="moccet-input-container">
              <textarea 
                ref={inputRef}
                className="moccet-input-editor" 
                placeholder="Type a message or use / for commands..." 
                rows="1"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
              />
              <div className="moccet-voice-input-button">
                <i className="fa-solid fa-microphone"></i>
              </div>
              <button 
                className="moccet-send-button" 
                onClick={handleSendMessage} 
                disabled={!inputValue.trim() || !activeChannelId || !activeWorkspaceId}
              >
                <i className="fa-solid fa-paper-plane"></i>
              </button>
            </div>
            <div className="moccet-keyboard-shortcut">Press Enter to send, Shift+Enter for new line</div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="moccet-emoji-picker">
                <div className="moccet-emoji-picker-header">
                  <div className="moccet-emoji-picker-title">Choose an emoji</div>
                  <div className="moccet-emoji-picker-close" onClick={() => setShowEmojiPicker(false)}>
                    <i className="fa-solid fa-xmark"></i>
                  </div>
                </div>
                <div className="moccet-emoji-grid">
                  {emojis.map((emoji, i) => (
                    <div key={i} className="moccet-emoji-item" onClick={() => handleEmojiSelect(emoji)}>
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Smart Commands */}
            {showSmartCommands && (
              <div className="moccet-smart-commands">
                <div className="moccet-command-list">
                  {smartCommandsList.map((cmd, i) => (
                    <div key={i} className={`moccet-command-item ${i === 0 ? 'moccet-active' : ''}`}>
                      <div className="moccet-command-icon">
                        <i className={`fa-solid ${cmd.icon}`}></i>
                      </div>
                      <div className="moccet-command-details">
                        <div className="moccet-command-name">{cmd.name}</div>
                        <div className="moccet-command-description">{cmd.desc}</div>
                      </div>
                      <div className="moccet-command-shortcut">{cmd.shortcut}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="moccet-modal">
          <div className="moccet-modal-content" style={{ maxWidth: '500px' }}>
            <div className="moccet-modal-header">
              <div className="moccet-modal-title">Create New Channel</div>
              <div className="moccet-modal-close" onClick={() => {
                setShowCreateChannel(false);
                setNewChannelName('');
                setNewChannelType('public');
              }}>×</div>
            </div>
            <div className="moccet-modal-body">
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="e.g. project-updates"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>Lowercase letters, numbers, and hyphens only</small>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Channel Type</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                    fontSize: '14px'
                  }}
                >
                  <option value="public">Public - Anyone in the workspace can join</option>
                  <option value="private">Private - Invite only</option>
                </select>
              </div>
            </div>
            <div className="moccet-modal-footer">
              <button className="moccet-btn moccet-btn-secondary" onClick={() => {
                setShowCreateChannel(false);
                setNewChannelName('');
                setNewChannelType('public');
              }}>Cancel</button>
              <button 
                className="moccet-btn moccet-btn-primary" 
                onClick={async () => {
                  if (!newChannelName.trim() || !activeWorkspaceId) return;
                  
                  try {
                    const channelData = {
                      workspaceId: activeWorkspaceId,
                      name: newChannelName,
                      description: `${newChannelType === 'private' ? 'Private' : 'Public'} channel for ${newChannelName}`,
                      type: newChannelType,
                      createdBy: currentUser.uid,
                      members: [currentUser.uid],
                      admins: [currentUser.uid]
                    };
                    
                    console.log('[MoccetChat] Creating channel:', channelData);
                    const newChannel = await firestoreService.createChannel(channelData);
                    console.log('[MoccetChat] Channel created:', newChannel);
                    
                    // Refresh channels list to ensure it's up to date
                    await refreshChannels();
                    
                    // Switch to the new channel
                    setActiveChannelId(newChannel.id);
                    
                    // Close modal and reset
                    setShowCreateChannel(false);
                    setNewChannelName('');
                    setNewChannelType('public');
                    
                    alert(`Channel #${newChannelName} created successfully!`);
                  } catch (error) {
                    console.error('[MoccetChat] Error creating channel:', error);
                    alert(`Failed to create channel: ${error.message}`);
                  }
                }}
                disabled={!newChannelName.trim() || !activeWorkspaceId}
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Agent Directory Modal */}
      {showAgentDirectory && (
        <div className="moccet-modal">
          <div className="moccet-modal-content">
            <div className="moccet-modal-header">
              <div className="moccet-modal-title">Agent Directory</div>
              <div className="moccet-modal-close" onClick={() => setShowAgentDirectory(false)}>×</div>
            </div>
            <div className="moccet-modal-body">
              <div className="moccet-agent-directory">
                <div className="moccet-agent-directory-header">
                  <div className="moccet-agent-directory-title">
                    <i className="fa-solid fa-robot"></i>
                    Available Agents
                  </div>
                  <div className="moccet-agent-directory-actions">
                    <div className="moccet-agent-action">
                      <i className="fa-solid fa-plus"></i>
                    </div>
                    <div className="moccet-agent-action">
                      <i className="fa-solid fa-filter"></i>
                    </div>
                  </div>
                </div>
                <div className="moccet-agent-directory-list">
                  <div className="moccet-agent-item">
                    <div className="moccet-agent-avatar moccet-calendar-agent">
                      <i className="fa-solid fa-calendar"></i>
                    </div>
                    <div className="moccet-agent-info">
                      <div className="moccet-agent-name">Calendar Agent</div>
                      <div className="moccet-agent-status">Available</div>
                    </div>
                    <div className="moccet-agent-capabilities">5 skills</div>
                  </div>
                  <div className="moccet-agent-item">
                    <div className="moccet-agent-avatar moccet-search-agent">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <div className="moccet-agent-info">
                      <div className="moccet-agent-name">Research Agent</div>
                      <div className="moccet-agent-status">Available</div>
                    </div>
                    <div className="moccet-agent-capabilities">8 skills</div>
                  </div>
                  <div className="moccet-agent-item">
                    <div className="moccet-agent-avatar moccet-analytics-agent">
                      <i className="fa-solid fa-chart-simple"></i>
                    </div>
                    <div className="moccet-agent-info">
                      <div className="moccet-agent-name">Analytics Agent</div>
                      <div className="moccet-agent-status">Available</div>
                    </div>
                    <div className="moccet-agent-capabilities">4 skills</div>
                  </div>
                  <div className="moccet-agent-item">
                    <div className="moccet-agent-avatar moccet-code-agent">
                      <i className="fa-solid fa-code"></i>
                    </div>
                    <div className="moccet-agent-info">
                      <div className="moccet-agent-name">Code Agent</div>
                      <div className="moccet-agent-status">Available</div>
                    </div>
                    <div className="moccet-agent-capabilities">6 skills</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="moccet-modal-footer">
              <button className="moccet-btn moccet-btn-secondary" onClick={() => setShowAgentDirectory(false)}>Cancel</button>
              <button className="moccet-btn moccet-btn-primary">Add Selected</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="moccet-modal">
          <div className="moccet-modal-content" style={{ maxWidth: '500px' }}>
            <div className="moccet-modal-header">
              <div className="moccet-modal-title">Profile</div>
              <div className="moccet-modal-close" onClick={() => setShowProfileModal(false)}>×</div>
            </div>
            <div className="moccet-modal-body">
              <div className="moccet-profile-section">
                <div className="moccet-profile-avatar-large">
                  {userProfile?.photoURL ? (
                    <img src={userProfile.photoURL} alt="Profile" />
                  ) : (
                    <div className="moccet-profile-avatar-placeholder">
                      <i className="fa-solid fa-user"></i>
                    </div>
                  )}
                </div>
                
                <div className="moccet-profile-info">
                  <div className="moccet-profile-field">
                    <label>Display Name</label>
                    <div className="moccet-profile-value">{userProfile?.displayName || currentUser?.displayName || 'Not set'}</div>
                  </div>
                  
                  <div className="moccet-profile-field">
                    <label>Email</label>
                    <div className="moccet-profile-value">{currentUser?.email}</div>
                  </div>
                  
                  <div className="moccet-profile-field">
                    <label>User ID</label>
                    <div className="moccet-profile-value">{currentUser?.uid}</div>
                  </div>
                  
                  <div className="moccet-profile-field">
                    <label>Email Verified</label>
                    <div className="moccet-profile-value">
                      {currentUser?.emailVerified ? (
                        <span style={{ color: '#10b981' }}>
                          <i className="fa-solid fa-check-circle"></i> Verified
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444' }}>
                          <i className="fa-solid fa-times-circle"></i> Not Verified
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="moccet-profile-field">
                    <label>Account Created</label>
                    <div className="moccet-profile-value">
                      {currentUser?.metadata?.creationTime ? 
                        new Date(currentUser.metadata.creationTime).toLocaleDateString() : 
                        'Unknown'}
                    </div>
                  </div>
                  
                  <div className="moccet-profile-field">
                    <label>Last Sign In</label>
                    <div className="moccet-profile-value">
                      {currentUser?.metadata?.lastSignInTime ? 
                        new Date(currentUser.metadata.lastSignInTime).toLocaleDateString() : 
                        'Unknown'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="moccet-modal-footer">
              <button className="moccet-btn moccet-btn-primary" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoccetChat;