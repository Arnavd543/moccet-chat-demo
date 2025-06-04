import React, { useState, useRef, useEffect } from 'react';
import './MoccetChat.css';
import { useAuth } from './contexts/AuthContext';
import { useMessage } from './contexts/MessageContext';
import { firestoreService } from './services/firestore';
import { realtimeService } from './services/realtime';
import { usePresence } from './hooks/usePresence';


const MoccetChat = () => {
  // State management
  const { currentUser, userProfile, logout } = useAuth();
  
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showChannelsSidebar, setShowChannelsSidebar] = useState(false);
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
  
  // Message context - use after activeChannelId is set
  const { 
    messages, 
    loading, 
    sendMessage, 
    editMessage, 
    deleteMessage, 
    addReaction, 
    removeReaction,
    loadMoreMessages,
    hasMore,
    setActiveChannel
  } = useMessage();
  
  // Use presence hook
  usePresence(activeChannelId);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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
      
      try {
        // Get user's workspaces
        const userWorkspaces = await firestoreService.getUserWorkspaces();
        setWorkspaces(userWorkspaces);
        
        if (userWorkspaces.length > 0) {
          const defaultWorkspace = userWorkspaces[0];
          setActiveWorkspaceId(defaultWorkspace.id);
          
          // Get channels for the workspace
          const workspaceChannels = await firestoreService.getChannels(defaultWorkspace.id);
          setChannels(workspaceChannels);
          
          // Set the first channel as active
          if (workspaceChannels.length > 0) {
            const firstChannel = workspaceChannels[0];
            setActiveChannelId(firstChannel.id);
            setActiveChannel(firstChannel.id);
          }
        }
        
        // Get direct messages
        const dms = await firestoreService.getDirectMessages();
        setDirectMessages(dms);
      } catch (error) {
        console.error('Error initializing workspace:', error);
      }
    };
    
    initializeWorkspace();
  }, [currentUser]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!activeChannelId || !currentUser) return;

    const unsubscribe = realtimeService.subscribeToTyping(activeChannelId, (typingUsers) => {
      const otherUsersTyping = typingUsers.filter(user => user.userId !== currentUser.uid);
      setShowTypingIndicator(otherUsersTyping.length > 0);
    });

    return () => unsubscribe();
  }, [activeChannelId, currentUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        realtimeService.setTyping(activeChannelId, true);
        
        // Clear typing after 3 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
          realtimeService.setTyping(activeChannelId, false);
        }, 3000);
      } else {
        realtimeService.setTyping(activeChannelId, false);
      }
    }
  };

  // Handle send message
  const handleSendMessage = async () => {
    if (inputValue.trim() && activeChannelId) {
      try {
        // Clear typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        realtimeService.setTyping(activeChannelId, false);
        
        // Send message to Firebase
        await sendMessage(activeChannelId, inputValue.trim());
        setInputValue('');
        inputRef.current.style.height = 'auto';
      } catch (error) {
        console.error('Error sending message:', error);
      }
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
      const message = messages.find(m => m.id === messageId);
      if (!message) return;
      
      const userReaction = message.reactions?.find(
        r => r.emoji === reaction && r.userId === currentUser.uid
      );
      
      if (userReaction) {
        await removeReaction(messageId, userReaction.id);
      } else {
        await addReaction(messageId, reaction);
      }
    } catch (error) {
      console.error('Error toggling reaction:', error);
    }
  };

  return (
    <div className={`moccet-app-container ${isDarkTheme ? 'moccet-dark-theme' : ''}`}>
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
          
          <div className="moccet-nav-item-avatar" onClick={logout} title="Click to logout">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} alt="User Profile" />
            ) : (
              <div className="moccet-default-avatar">
                <i className="fa-solid fa-user"></i>
              </div>
            )}
            <div className="moccet-status-indicator"></div>
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
                    setActiveChannelId(channel.id);
                    setActiveChannel(channel.id);
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
            {loading && messages.length === 0 ? (
              <div className="moccet-loading-container">
                <div className="moccet-loading-spinner">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
                <div className="moccet-loading-text">Loading messages...</div>
              </div>
            ) : (
              <>
                {messages.map((message) => {
                  const isCurrentUser = message.senderId === currentUser?.uid;
                  const messageTime = message.createdAt?.toDate ? 
                    new Date(message.createdAt.toDate()).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    }) : 'Just now';
                  
                  return (
                    <div key={message.id} className={`moccet-message ${!isCurrentUser ? 'moccet-ai-message' : ''}`}>
                      <div className={`moccet-message-avatar ${!isCurrentUser ? 'moccet-ai-agent-avatar' : ''}`}>
                        {message.senderAvatar ? (
                          <img src={message.senderAvatar} alt="Avatar" />
                        ) : (
                          <div className="moccet-message-default-avatar">
                            <i className="fa-solid fa-user"></i>
                          </div>
                        )}
                      </div>
                      <div className="moccet-message-content">
                        <div className="moccet-message-header">
                          <div className="moccet-message-sender">
                            {message.senderName || 'Unknown User'}
                          </div>
                          <div className="moccet-message-time">{messageTime}</div>
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
              <button className="moccet-send-button" onClick={handleSendMessage} disabled={!inputValue.trim()}>
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
    </div>
  );
};

export default MoccetChat;