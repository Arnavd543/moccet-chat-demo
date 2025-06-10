import React, { useState, useRef, useEffect } from 'react';
import './MoccetChat.css';
import { useAuth } from './contexts/AuthContext';
import { useMessage } from './contexts/MessageContext';
import { firestoreService } from './services/firestore';
import { realtimeService } from './services/realtime';
import { usePresence } from './hooks/usePresence';
import aiService from './services/aiService';
import AIAnalytics from './components/AIAnalytics';
import AIContextMenu from './components/AIContextMenu';

/**
 * MoccetChat - Main chat interface component
 * 
 * This is the primary component that renders the entire chat application interface.
 * It manages workspaces, channels, messages, and all user interactions.
 * 
 * @component
 * @returns {JSX.Element} The complete chat application interface
 */
const MoccetChat = () => {
  // ============ Authentication & User Context ============
  const { currentUser, userProfile, logout } = useAuth();
  
  // ============ UI State Management ============
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [showChannelsSidebar, setShowChannelsSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSmartCommands, setShowSmartCommands] = useState(false);
  const [showAgentDirectory, setShowAgentDirectory] = useState(false);
  const [showContextPanel, setShowContextPanel] = useState(true);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAIAnalytics, setShowAIAnalytics] = useState(false);
  
  // ============ Data State Management ============
  const [inputValue, setInputValue] = useState('');
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [channels, setChannels] = useState([]);
  const [directMessages, setDirectMessages] = useState([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('public');
  const [stagedAttachments, setStagedAttachments] = useState([]);
  
  // ============ AI State Management ============
  const [isAIMode, setIsAIMode] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [commandSuggestions, setCommandSuggestions] = useState([]);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, position: null, message: null });
  
  // ============ Message Context & Operations ============
  const messageContext = useMessage();
  const { 
    messages, 
    loadingStates,
    sendMessage, 
    uploadFileAndSend,
    subscribeToChannel,
    unsubscribeFromChannel
  } = messageContext;
  
  // Get loading state for active channel
  const loading = loadingStates[activeChannelId] || false;
  
  // Get messages for active channel with memoization for performance
  const currentMessages = React.useMemo(() => messages[activeChannelId] || [], [messages, activeChannelId]);
  
  // ============ Presence & Real-time Features ============
  // Track user presence in the active channel
  usePresence(activeChannelId);
  
  // ============ Refs for DOM Elements ============
  const messagesEndRef = useRef(null);    // Auto-scroll to bottom
  const inputRef = useRef(null);          // Message input field
  const typingTimeoutRef = useRef(null);  // Typing indicator timeout
  const fileInputRef = useRef(null);      // Hidden file input
  
  // ============ File Upload State ============
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // ============ Constants ============
  // Available emojis for the emoji picker
  const emojis = ['😊', '😂', '🙂', '😍', '😎', '🤔', '🤗', '🤫', '😮', '😥', '😴', '😫', '🤯', '🥳', '😇', '👍', '👎', '👏', '🙏', '🔥', '❤️', '🚀', '🎉', '💯'];

  // ============ Utility Functions ============
  /**
   * Formats a timestamp into a human-readable relative time
   * @param {Date|Timestamp} timestamp - The timestamp to format
   * @returns {string} Formatted time string (e.g., "2m", "3h", "5d")
   */
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

  // ============ Effects & Initialization ============
  /**
   * Initialize workspace and channels when component mounts
   * Creates default workspace if none exists
   */
  useEffect(() => {
    const initializeWorkspace = async () => {
      if (!currentUser) return;
      
      setIsInitializing(true);
      try {
        console.log('Initializing workspace for user:', currentUser.uid);
        
        // Get user's workspaces
        const userWorkspaces = await firestoreService.getUserWorkspaces(currentUser.uid);
        console.log('User workspaces:', userWorkspaces);
        console.log('Number of workspaces:', userWorkspaces.length);
        console.log('Workspace details:', JSON.stringify(userWorkspaces, null, 2));
        
        // Filter out invalid workspaces
        const validWorkspaces = userWorkspaces.filter(ws => ws && ws.id);
        console.log('Valid workspaces:', validWorkspaces.length);
        setWorkspaces(validWorkspaces);
        
        // If no workspaces exist, create a default one
        if (validWorkspaces.length === 0) {
          console.log('[MoccetChat] No workspaces found, creating default workspace...');
          const newWorkspace = await firestoreService.createWorkspace({
            name: 'My Workspace',
            description: 'Default workspace',
            ownerId: currentUser.uid,
            members: [currentUser.uid],
            admins: [currentUser.uid]
          });
          validWorkspaces.push(newWorkspace);
          setWorkspaces([newWorkspace]);
        }
        
        if (validWorkspaces.length > 0) {
          const defaultWorkspace = validWorkspaces[0];
          setActiveWorkspaceId(defaultWorkspace.id);
          console.log('Active workspace:', defaultWorkspace.id);
          
          // Get channels for the workspace
          const workspaceChannels = await firestoreService.getChannels(defaultWorkspace.id, currentUser.uid);
          console.log('Workspace channels:', workspaceChannels);
          setChannels(workspaceChannels);
          
          // Set the first channel as active
          if (workspaceChannels.length > 0) {
            const firstChannel = workspaceChannels[0];
            console.log('[MoccetChat] Setting initial active channel:', {
              channelId: firstChannel.id,
              channelName: firstChannel.name
            });
            setActiveChannelId(firstChannel.id);
          } else {
            console.log('[MoccetChat] No channels found in workspace');
            setActiveChannelId(null);
          }
        }
        
        // Get direct messages
        const dms = await firestoreService.getDirectMessages(currentUser.uid);
        setDirectMessages(dms);
      } catch (error) {
        console.error('Error initializing workspace:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeWorkspace();
  }, [currentUser]);
  
  // Load channels when workspace changes
  useEffect(() => {
    const loadChannels = async () => {
      if (!activeWorkspaceId || !currentUser) return;
      
      try {
        console.log('Loading channels for workspace:', activeWorkspaceId);
        const workspaceChannels = await firestoreService.getChannels(activeWorkspaceId, currentUser.uid);
        console.log('Loaded channels:', workspaceChannels);
        setChannels(workspaceChannels);
        
        // If no active channel but channels exist, select the first one
        if (!activeChannelId && workspaceChannels.length > 0) {
          const firstChannel = workspaceChannels[0];
          setActiveChannelId(firstChannel.id);
        }
      } catch (error) {
        console.error('Error loading channels:', error);
      }
    };
    
    loadChannels();
  }, [activeWorkspaceId, currentUser, activeChannelId]);
  
  // Subscribe to messages when channel changes
  useEffect(() => {
    console.log('[MoccetChat] Channel subscription effect triggered:', {
      activeChannelId,
      hasSubscribeFunction: !!subscribeToChannel,
      hasSetActiveChannel: false
    });
    
    if (!activeChannelId || !subscribeToChannel) {
      console.log('[MoccetChat] Missing required props, skipping subscription:', {
        activeChannelId,
        hasSubscribeToChannel: !!subscribeToChannel
      });
      return;
    }
    
    console.log('[MoccetChat] Subscribing to channel:', activeChannelId);
    // Don't log channel details to avoid dependency warning
    
    // Subscribe to channel messages
    subscribeToChannel(activeChannelId);
    
    // Clear input when switching channels
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    return () => {
      console.log('[MoccetChat] Cleanup: unsubscribing from channel:', activeChannelId);
      if (unsubscribeFromChannel) {
        unsubscribeFromChannel(activeChannelId);
      }
    };
  }, [activeChannelId, subscribeToChannel, unsubscribeFromChannel]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to typing indicators
  useEffect(() => {
    if (!activeChannelId || !currentUser) return;

    const unsubscribe = realtimeService.subscribeToTyping(activeChannelId, (typingUsers) => {
      // typingUsers is an object with userIds as keys
      const otherUsersTyping = Object.keys(typingUsers).filter(userId => userId !== currentUser.uid);
      setShowTypingIndicator(otherUsersTyping.length > 0);
    });

    return () => unsubscribe();
  }, [activeChannelId, currentUser]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('[MoccetChat] Messages changed, scrolling to bottom. Message count:', currentMessages.length);
    scrollToBottom();
  }, [currentMessages]);

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

  /**
   * Toggles between light and dark theme
   */
  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  /**
   * Handles message input changes
   * - Shows smart commands when "/" is typed
   * - Auto-resizes textarea
   * - Manages typing indicators
   * - Detects AI commands
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Check for AI triggers
    const aiTrigger = aiService.checkAITrigger(value);
    setIsAIMode(aiTrigger.triggered);
    
    // Get command suggestions if typing a command
    if (value.startsWith('/')) {
      const suggestions = aiService.getCommandSuggestions(value);
      setCommandSuggestions(suggestions);
      setShowSmartCommands(suggestions.length > 0);
    } else {
      setShowSmartCommands(false);
      setCommandSuggestions([]);
    }
    
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
          userName: currentUser.displayName || currentUser.email,
          userPhoto: currentUser.photoURL
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

  /**
   * Handles sending messages with or without attachments
   * - Validates channel and workspace
   * - Handles file uploads if attachments are staged
   * - Processes AI commands if detected
   * - Clears input and typing indicators after sending
   */
  const handleSendMessage = async () => {
    const hasContent = inputValue.trim();
    const hasAttachments = stagedAttachments.length > 0;
    
    if ((hasContent || hasAttachments) && activeChannelId && activeWorkspaceId) {
      try {
        // Validate channel exists
        const channelExists = channels.some(c => c.id === activeChannelId);
        if (!channelExists) {
          console.error('[MoccetChat] Active channel not found in channels list:', {
            activeChannelId,
            availableChannels: channels.map(c => ({ id: c.id, name: c.name }))
          });
          alert('Invalid channel selected. Please select a valid channel.');
          return;
        }
        
        // Clear typing indicator
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        realtimeService.setTypingStatus(activeChannelId, currentUser.uid, false);
        
        // Check if this is an AI command
        if (isAIMode && hasContent) {
          setIsAIResponding(true);
          
          try {
            // First, send the user's message
            await sendMessage(activeChannelId, inputValue.trim(), activeWorkspaceId);
            
            // Clear input immediately
            setInputValue('');
            if (inputRef.current) {
              inputRef.current.style.height = 'auto';
            }
            
            // Process AI command
            const aiTrigger = aiService.checkAITrigger(inputValue.trim());
            const activeChannel = channels.find(c => c.id === activeChannelId);
            
            // Process smart commands with context
            let processedQuery = aiTrigger.query;
            if (aiTrigger.command && aiTrigger.command !== 'ai' && aiTrigger.command !== 'mention') {
              processedQuery = aiService.processSmartCommand(
                aiTrigger.command,
                aiTrigger.query,
                currentMessages
              );
            }
            
            // Send to AI service
            const aiResponse = await aiService.sendMessage(
              processedQuery,
              currentMessages.slice(-10), // Last 10 messages for context
              {
                channelId: activeChannelId,
                channelName: activeChannel?.name,
                workspaceId: activeWorkspaceId
              },
              aiTrigger.command || 'ai' // Pass the command for analytics
            );
            
            // Format and send AI response
            const formattedResponse = aiService.formatAIResponse(
              aiResponse.content,
              aiResponse.usage
            );
            
            // Send AI response as a message
            await sendMessage(
              activeChannelId,
              formattedResponse.content,
              activeWorkspaceId,
              {
                isAI: true,
                senderName: 'Moccet Assistant',
                senderAvatar: '/moccet-ai-avatar.png',
                usage: aiResponse.usage,
                cached: aiResponse.cached
              }
            );
            
          } catch (error) {
            console.error('[MoccetChat] AI Error:', error);
            
            // Send error message
            let errorMessage = 'Sorry, I encountered an error processing your request.';
            if (error.code === 'RATE_LIMIT') {
              errorMessage = `Rate limit exceeded. Please try again in ${error.retryAfter} seconds.`;
            } else if (error.code === 'TIMEOUT') {
              errorMessage = 'The AI request timed out. Please try again.';
            } else if (error.code === 'NETWORK') {
              errorMessage = 'No internet connection. Please check your network and try again.';
            }
            
            await sendMessage(
              activeChannelId,
              errorMessage,
              activeWorkspaceId,
              {
                isAI: true,
                senderName: 'Moccet Assistant',
                senderAvatar: '/moccet-ai-avatar.png',
                isError: true
              }
            );
          } finally {
            setIsAIResponding(false);
            setIsAIMode(false);
          }
          
          return; // Exit early for AI commands
        }
        
        console.log('[MoccetChat] Preparing to send message:', {
          channelId: activeChannelId,
          channelName: channels.find(c => c.id === activeChannelId)?.name,
          workspaceId: activeWorkspaceId,
          content: inputValue.trim(),
          contentLength: inputValue.trim().length,
          attachmentCount: stagedAttachments.length,
          currentUser: currentUser.uid
        });
        
        // If we have attachments, upload them first
        if (hasAttachments) {
          for (const attachment of stagedAttachments) {
            try {
              // Update UI to show uploading
              setStagedAttachments(prev => 
                prev.map(att => att.id === attachment.id 
                  ? { ...att, uploading: true } 
                  : att
                )
              );
              
              // Upload and send each file with the message content
              await uploadFileAndSend(
                activeChannelId,
                activeWorkspaceId,
                attachment.file,
                hasContent ? inputValue.trim() : '', // Include message if present
                (progress) => {
                  // Update progress
                  setStagedAttachments(prev => 
                    prev.map(att => att.id === attachment.id 
                      ? { ...att, progress: progress.progress } 
                      : att
                    )
                  );
                }
              );
            } catch (error) {
              console.error('Error uploading attachment:', error);
              setStagedAttachments(prev => 
                prev.map(att => att.id === attachment.id 
                  ? { ...att, uploading: false, error: error.message } 
                  : att
                )
              );
              throw error;
            }
          }
          
          // Clear staged attachments after successful upload
          setStagedAttachments([]);
        } else {
          // No attachments, just send the message
          console.log('[MoccetChat] Calling sendMessage...');
          const result = await sendMessage(activeChannelId, inputValue.trim(), activeWorkspaceId);
          if (result) {
            console.log('[MoccetChat] Message sent successfully:', {
              messageId: result.id,
              channelId: result.channelId,
              content: result.content?.substring(0, 50)
            });
          } else {
            console.error('[MoccetChat] Message send returned no result');
          }
        }
        
        setInputValue('');
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
      } catch (error) {
        console.error('[MoccetChat] Error sending message:', error);
        alert(`Failed to send message: ${error.message}`);
      }
    } else {
      console.warn('[MoccetChat] Cannot send message:', {
        hasContent,
        hasAttachments,
        hasChannelId: !!activeChannelId,
        hasWorkspaceId: !!activeWorkspaceId,
        activeChannelId
      });
    }
  };

  /**
   * Handles keyboard events in message input
   * @param {KeyboardEvent} e - Keyboard event
   */
  const handleKeyPress = (e) => {
    // Handle Escape to cancel AI mode
    if (e.key === 'Escape' && isAIMode) {
      e.preventDefault();
      setIsAIMode(false);
      setInputValue('');
      return;
    }
    
    // Handle Ctrl+Space for AI assist
    if (e.key === ' ' && e.ctrlKey) {
      e.preventDefault();
      setInputValue('/ai ');
      const aiTrigger = aiService.checkAITrigger('/ai ');
      setIsAIMode(aiTrigger.triggered);
      return;
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Handles emoji selection from picker
   * @param {string} emoji - Selected emoji
   */
  const handleEmojiSelect = (emoji) => {
    setInputValue(inputValue + emoji);
    setShowEmojiPicker(false);
    inputRef.current.focus();
  };

  /**
   * Handles file selection from file input
   * Stages files for upload instead of immediate sending
   * @param {Event} e - File input change event
   */
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  /**
   * Processes files for upload
   * @param {File[]} files - Array of files to process
   */
  const handleFiles = async (files) => {
    if (!activeChannelId || !activeWorkspaceId) return;

    // Stage the files instead of uploading immediately
    const newAttachments = files.map(file => ({
      file,
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploading: false,
      progress: 0,
      error: null
    }));

    setStagedAttachments(prev => [...prev, ...newAttachments]);
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove staged attachment
  const removeStagedAttachment = (id) => {
    setStagedAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // Paste handler
  const handlePaste = (e) => {
    const items = Array.from(e.clipboardData.items);
    const files = items
      .filter(item => item.kind === 'file')
      .map(item => item.getAsFile())
      .filter(file => file !== null);

    if (files.length > 0) {
      handleFiles(files);
    }
  };


  const closeLightbox = () => {
    setShowLightbox(false);
    setLightboxImage(null);
  };

  // Handle channel creation
  const handleCreateChannel = async () => {
    console.log('Create channel clicked:', {
      channelName: newChannelName,
      channelType: newChannelType,
      workspaceId: activeWorkspaceId,
      currentUser: currentUser?.uid
    });
    
    if (!newChannelName.trim() || !activeWorkspaceId || !currentUser) {
      alert(`Cannot create channel: ${!newChannelName.trim() ? 'No name' : !activeWorkspaceId ? 'No workspace' : 'Not logged in'}`);
      return;
    }
    
    try {
      const newChannel = await firestoreService.createChannel({
        workspaceId: activeWorkspaceId,
        name: newChannelName.trim(),
        description: `${newChannelName} channel`,
        type: newChannelType,
        createdBy: currentUser.uid,
        members: [currentUser.uid],
        admins: [currentUser.uid]
      });
      
      console.log('[MoccetChat] New channel created:', newChannel);
      
      // Reload channels from Firestore to ensure consistency
      const updatedChannels = await firestoreService.getChannels(activeWorkspaceId, currentUser.uid);
      console.log('[MoccetChat] Reloaded channels after creation:', updatedChannels.map(c => ({ id: c.id, name: c.name })));
      setChannels(updatedChannels);
      
      // Find the newly created channel in the updated list
      const createdChannel = updatedChannels.find(c => c.id === newChannel.id);
      if (createdChannel) {
        // Set it as active
        setActiveChannelId(createdChannel.id);
        console.log('[MoccetChat] Set active channel to:', createdChannel.id);
      } else {
        console.error('[MoccetChat] Could not find newly created channel in updated list');
      }
      
      // Reset form
      setNewChannelName('');
      setNewChannelType('public');
      setShowCreateChannel(false);
    } catch (error) {
      console.error('Error creating channel:', error);
      alert('Failed to create channel: ' + error.message);
    }
  };

  // Handle context menu for messages
  const handleMessageContextMenu = (e, message) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      message
    });
  };

  // Handle AI action from context menu
  const handleAIAction = async (action, message) => {
    try {
      const result = await aiService.processMessageAction(action, message, {
        channelInfo: {
          channelId: activeChannelId,
          channelName: channels.find(c => c.id === activeChannelId)?.name,
          workspaceId: activeWorkspaceId
        }
      });

      // Send the AI result as a new message
      await sendMessage(
        activeChannelId,
        `**${action.charAt(0).toUpperCase() + action.slice(1)} Result:**\n\n${result}`,
        activeWorkspaceId,
        {
          isAI: true,
          senderName: 'Moccet Assistant',
          senderAvatar: '/moccet-ai-avatar.svg',
          replyTo: message.id
        }
      );
    } catch (error) {
      console.error('Error processing AI action:', error);
      alert('Failed to process AI action: ' + error.message);
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
          
          <div className="moccet-nav-item" onClick={() => setShowChannelsSidebar(!showChannelsSidebar)} title="Toggle Channels">
            <i className="fa-solid fa-bars"></i>
            <div className="moccet-tooltip">Toggle Channels</div>
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
        <div className="moccet-add-button" onClick={() => setShowChannelsSidebar(!showChannelsSidebar)}>
          <i className="fa-solid fa-bars"></i>
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
              <div className="moccet-section-action" onClick={() => setShowCreateChannel(true)}>
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
                <span style={{color: '#6b7280', fontSize: '14px'}}>No channels yet</span>
              </li>
            ) : (
              channels.map(channel => (
                <li 
                  key={channel.id} 
                  className={`moccet-channel-item ${activeChannelId === channel.id ? 'moccet-active' : ''}`}
                  onClick={() => {
                    console.log('[MoccetChat] Channel clicked:', {
                      channelId: channel.id,
                      channelName: channel.name,
                      currentActiveChannel: activeChannelId
                    });
                    
                    // Update local state
                    setActiveChannelId(channel.id);
                    console.log('[MoccetChat] Channel selection complete');
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
                <span style={{color: '#6b7280', fontSize: '14px'}}>No conversations yet</span>
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
                {(() => {
                  const activeChannel = channels.find(c => c.id === activeChannelId);
                  const channelName = activeChannel?.name || (activeChannelId ? `Channel ${activeChannelId.substring(0, 8)}` : 'Select a channel');
                  return channelName;
                })()}
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
            <div className="moccet-header-button" onClick={() => setShowAIAnalytics(true)}>
              <i className="fa-solid fa-chart-line"></i>
              <div className="moccet-tooltip">AI Analytics</div>
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
        <div 
          className="moccet-chat-area"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag and Drop Overlay */}
          {isDragging && (
            <div className="moccet-drag-overlay">
              <div className="moccet-drag-content">
                <i className="fa-solid fa-cloud-arrow-up"></i>
                <h3>Drop files to upload</h3>
                <p>Images, documents, videos up to 100MB</p>
              </div>
            </div>
          )}
          
          {/* Messages Container */}
          <div className="moccet-messages-container">
            {loading && currentMessages.length === 0 ? (
              <div className="moccet-loading-container">
                <div className="moccet-loading-spinner">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
                <div className="moccet-loading-text">Loading messages...</div>
              </div>
            ) : currentMessages.length === 0 ? (
              <div className="moccet-empty-messages">
                <p style={{textAlign: 'center', color: '#6b7280', marginTop: '2rem'}}>
                  No messages yet. Start a conversation!
                </p>
              </div>
            ) : (
              <>
                {currentMessages.filter(message => message.id).map((message) => {
                  const isCurrentUser = message.userId === currentUser?.uid || message.senderId === currentUser?.uid;
                  const isAI = message.isAI || message.userId === 'moccet-ai';
                  const messageTime = message.createdAt?.toDate ? 
                    new Date(message.createdAt.toDate()).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    }) : 'Just now';
                  
                  // Determine message classes
                  const messageClasses = [
                    'moccet-message',
                    isAI && 'ai-message',
                    message.isError && 'ai-error'
                  ].filter(Boolean).join(' ');
                  
                  return (
                    <div key={message.id} style={{
                      display: 'flex',
                      justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                      marginBottom: '16px',
                      width: '100%'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        maxWidth: '70%',
                        flexDirection: isCurrentUser ? 'row-reverse' : 'row'
                      }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: isAI ? 'transparent' : '#e5e7eb'
                        }}>
                          {isAI ? (
                            <img 
                              src="/moccet-ai-avatar.svg" 
                              alt="AI Avatar" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : message.senderAvatar || message.sender?.photoURL ? (
                            <img 
                              src={message.senderAvatar || message.sender?.photoURL} 
                              alt="Avatar" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isCurrentUser ? '#7c3aed' : '#6b7280',
                              color: 'white'
                            }}>
                              <i className="fa-solid fa-user" style={{ fontSize: '14px' }}></i>
                            </div>
                          )}
                        </div>
                        <div 
                          className={messageClasses} 
                          style={{
                            background: isAI ? undefined : (isCurrentUser ? '#7c3aed' : 'white'),
                            color: isAI ? undefined : (isCurrentUser ? 'white' : '#111827'),
                            padding: '12px 16px',
                            borderRadius: '12px',
                            boxShadow: isAI ? undefined : '0 1px 2px rgba(0, 0, 0, 0.1)',
                            border: isAI ? undefined : (isCurrentUser ? 'none' : '1px solid #e5e7eb'),
                            minWidth: '100px',
                            cursor: 'context-menu'
                          }}
                          onContextMenu={(e) => handleMessageContextMenu(e, message)}
                        >
                          <div className="moccet-message-header" style={{
                            fontSize: '12px',
                            opacity: isAI ? 1 : 0.8,
                            marginBottom: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isAI && <i className="fa-solid fa-robot" style={{ fontSize: '12px' }}></i>}
                              {message.senderName || message.sender?.displayName || message.sender?.email || 'Unknown User'}
                            </div>
                            <div>{messageTime}</div>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            lineHeight: '1.5',
                            wordBreak: 'break-word'
                          }}>
                            {message.content}
                          </div>
                          
                          {/* Display AI usage info if available */}
                          {isAI && message.aiUsage && (
                            <div style={{
                              fontSize: '11px',
                              opacity: 0.6,
                              marginTop: '8px',
                              display: 'flex',
                              gap: '12px'
                            }}>
                              <span>Tokens: {message.aiUsage.total_tokens}</span>
                              {message.cached && <span>Cached</span>}
                            </div>
                          )}
                          
                          {/* Display attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="moccet-message-attachments" style={{ marginTop: '8px' }}>
                              {message.attachments.map((attachment, idx) => {
                                const isImage = attachment.type?.startsWith('image/');
                                
                                if (isImage) {
                                  return (
                                    <div key={idx} className="moccet-message-attachment" style={{ marginBottom: '8px' }}>
                                      <img 
                                        src={attachment.url} 
                                        alt={attachment.name}
                                        style={{
                                          maxWidth: '300px',
                                          maxHeight: '300px',
                                          borderRadius: '8px',
                                          cursor: 'pointer',
                                          display: 'block'
                                        }}
                                        onClick={() => window.open(attachment.url, '_blank')}
                                      />
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div key={idx} className="moccet-message-attachment" style={{ marginBottom: '8px' }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '12px',
                                        background: 'rgba(0,0,0,0.05)',
                                        borderRadius: '8px',
                                        gap: '12px'
                                      }}>
                                        <div style={{
                                          width: '40px',
                                          height: '40px',
                                          background: '#7c3aed',
                                          borderRadius: '8px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'white'
                                        }}>
                                          <i className="fa-solid fa-file"></i>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>{attachment.name}</div>
                                          <div style={{ fontSize: '12px', opacity: 0.7 }}>
                                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                          </div>
                                        </div>
                                        <a 
                                          href={attachment.url} 
                                          download={attachment.name}
                                          style={{
                                            padding: '6px 12px',
                                            background: '#7c3aed',
                                            color: 'white',
                                            borderRadius: '4px',
                                            textDecoration: 'none',
                                            fontSize: '12px'
                                          }}
                                        >
                                          Download
                                        </a>
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          )}
                          
                          {/* Message status indicator */}
                          {isCurrentUser && message.status && (
                            <div style={{
                              fontSize: '10px',
                              marginTop: '4px',
                              textAlign: 'right',
                              opacity: 0.7
                            }}>
                              {message.status === 'sending' && (
                                <span><i className="fa-solid fa-clock"></i> Sending...</span>
                              )}
                              {message.status === 'sent' && (
                                <span><i className="fa-solid fa-check"></i> Sent</span>
                              )}
                              {message.status === 'failed' && (
                                <span style={{ color: '#ef4444' }}><i className="fa-solid fa-xmark"></i> Failed</span>
                              )}
                            </div>
                          )}
                        </div>
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
            
            {/* Staged Attachments */}
            {stagedAttachments.length > 0 && (
              <div className="moccet-staged-attachments">
                {stagedAttachments.map(attachment => (
                  <div key={attachment.id} className="moccet-staged-attachment">
                    <div className="moccet-attachment-icon">
                      <i className="fa-solid fa-file"></i>
                    </div>
                    <div className="moccet-attachment-info">
                      <div className="moccet-attachment-name">{attachment.name}</div>
                      <div className="moccet-attachment-size">
                        {(attachment.size / 1024 / 1024).toFixed(2)} MB
                        {attachment.uploading && ` • ${attachment.progress}%`}
                        {attachment.error && ` • Error: ${attachment.error}`}
                      </div>
                    </div>
                    {!attachment.uploading && (
                      <button 
                        className="moccet-attachment-remove"
                        onClick={() => removeStagedAttachment(attachment.id)}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            <div className="moccet-input-tools">
              <div className="moccet-tools-left">
                <div className="moccet-tool-button">
                  <i className="fa-solid fa-font"></i>
                  <div className="moccet-tooltip">Format</div>
                </div>
                <div className="moccet-tool-button" onClick={() => fileInputRef.current?.click()}>
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
                <button 
                  className="moccet-ai-assist-btn"
                  onClick={() => {
                    setInputValue('/ai ');
                    const aiTrigger = aiService.checkAITrigger('/ai ');
                    setIsAIMode(aiTrigger.triggered);
                    inputRef.current?.focus();
                  }}
                >
                  <i className="fa-solid fa-wand-magic-sparkles moccet-icon"></i>
                  AI Assist
                </button>
              </div>
            </div>
            
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
              multiple
              accept="image/*,video/*,application/*,text/*"
            />
            
            {/* Upload progress */}
            {uploadProgress && (
              <div className="moccet-upload-progress">
                <div className="moccet-upload-info">
                  <i className="fa-solid fa-file"></i>
                  <span className="moccet-upload-filename">{uploadProgress.name}</span>
                  <span className="moccet-upload-speed">{uploadProgress.speed} KB/s</span>
                </div>
                <div className="moccet-progress-bar">
                  <div 
                    className="moccet-progress-fill" 
                    style={{ width: `${uploadProgress.progress}%` }}
                  />
                </div>
                <button 
                  className="moccet-upload-cancel"
                  onClick={() => setUploadProgress(null)}
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            )}
            
            {/* AI Mode Indicator */}
            {isAIMode && (
              <div className="moccet-ai-mode-indicator">
                <i className="fa-solid fa-robot"></i>
                <span>AI Mode Active</span>
              </div>
            )}
            
            {/* AI Responding Indicator */}
            {isAIResponding && (
              <div className="moccet-ai-responding">
                <div className="moccet-ai-responding-spinner">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                </div>
                <span>Moccet is thinking...</span>
              </div>
            )}
            
            <div className={`moccet-input-container ${isAIMode ? 'ai-mode' : ''} ${isAIResponding ? 'ai-responding' : ''}`}>
              <textarea 
                ref={inputRef}
                className="moccet-input-editor" 
                placeholder={isAIMode ? "Ask Moccet anything..." : "Type a message or use / for commands..."} 
                rows="1"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onPaste={handlePaste}
                disabled={isAIResponding}
              />
              <div className="moccet-voice-input-button">
                <i className="fa-solid fa-microphone"></i>
              </div>
              <button 
                className={`moccet-send-button ${stagedAttachments.length > 0 ? 'has-attachments' : ''} ${isAIMode ? 'ai-mode' : ''}`}
                onClick={handleSendMessage} 
                disabled={(!inputValue.trim() && stagedAttachments.length === 0) || !activeChannelId || !activeWorkspaceId || isAIResponding}
                title={isAIMode ? 'Send to AI' : (stagedAttachments.length > 0 ? `Send with ${stagedAttachments.length} attachment(s)` : 'Send message')}
              >
                <i className={`fa-solid ${isAIMode ? 'fa-robot' : 'fa-paper-plane'}`}></i>
                {stagedAttachments.length > 0 && (
                  <span className="moccet-attachment-count">{stagedAttachments.length}</span>
                )}
              </button>
            </div>
            <div className="moccet-keyboard-shortcut">
              {isAIMode ? 'AI Mode: Press Enter to send, Esc to cancel' : 'Press Enter to send, Shift+Enter for new line, Ctrl+Space for AI'}
            </div>
            
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
            
            {/* Smart Commands / AI Suggestions */}
            {showSmartCommands && (
              <div className="moccet-smart-commands">
                <div className="moccet-command-list">
                  {commandSuggestions.map((cmd, i) => (
                    <div 
                      key={i} 
                      className={`moccet-command-item ${i === 0 ? 'moccet-active' : ''}`}
                      onClick={() => {
                        setInputValue(cmd.command + ' ');
                        const aiTrigger = aiService.checkAITrigger(cmd.command + ' ');
                        setIsAIMode(aiTrigger.triggered);
                        setShowSmartCommands(false);
                        inputRef.current?.focus();
                      }}
                    >
                      <div className="moccet-command-icon">
                        <i className={`fa-solid ${cmd.command === '/ai' ? 'fa-robot' : cmd.command === '/summarize' ? 'fa-list' : cmd.command === '/translate' ? 'fa-language' : cmd.command === '/explain' ? 'fa-lightbulb' : cmd.command === '/action-items' ? 'fa-tasks' : 'fa-compress'}`}></i>
                      </div>
                      <div className="moccet-command-details">
                        <div className="moccet-command-name">{cmd.command}</div>
                        <div className="moccet-command-description">{cmd.description}</div>
                      </div>
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
      
      {/* Image Lightbox */}
      {showLightbox && lightboxImage && (
        <div className="moccet-lightbox" onClick={closeLightbox}>
          <div className="moccet-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="moccet-lightbox-close" onClick={closeLightbox}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <img src={lightboxImage.url} alt={lightboxImage.name} />
            <div className="moccet-lightbox-info">
              <div className="moccet-lightbox-filename">{lightboxImage.name}</div>
              <a 
                href={lightboxImage.url} 
                download={lightboxImage.name} 
                className="moccet-lightbox-download"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="fa-solid fa-download"></i> Download
              </a>
            </div>
          </div>
        </div>
      )}
      
      {/* Channel Creation Modal */}
      {showCreateChannel && (
        <div className="moccet-modal">
          <div className="moccet-modal-content">
            <div className="moccet-modal-header">
              <div className="moccet-modal-title">Create Channel</div>
              <div className="moccet-modal-close" onClick={() => setShowCreateChannel(false)}>×</div>
            </div>
            <div className="moccet-modal-body">
              <div className="moccet-form-group">
                <label>Channel Name</label>
                <input
                  type="text"
                  className="moccet-input"
                  placeholder="e.g., design-team"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
                />
              </div>
              <div className="moccet-form-group">
                <label>Channel Type</label>
                <div className="moccet-radio-group">
                  <label className={`moccet-radio ${newChannelType === 'public' ? 'moccet-radio-selected' : ''}`}>
                    <input
                      type="radio"
                      name="channelType"
                      value="public"
                      checked={newChannelType === 'public'}
                      onChange={(e) => {
                        console.log('Radio changed to:', e.target.value);
                        setNewChannelType(e.target.value);
                      }}
                    />
                    <div className="moccet-radio-content">
                      <div className="moccet-radio-label">
                        <i className="fa-solid fa-hashtag"></i> Public
                      </div>
                      <span className="moccet-radio-desc">Anyone in the workspace can join</span>
                    </div>
                  </label>
                  <label className={`moccet-radio ${newChannelType === 'private' ? 'moccet-radio-selected' : ''}`}>
                    <input
                      type="radio"
                      name="channelType"
                      value="private"
                      checked={newChannelType === 'private'}
                      onChange={(e) => {
                        console.log('Radio changed to:', e.target.value);
                        setNewChannelType(e.target.value);
                      }}
                    />
                    <div className="moccet-radio-content">
                      <div className="moccet-radio-label">
                        <i className="fa-solid fa-lock"></i> Private
                      </div>
                      <span className="moccet-radio-desc">Only invited members can join</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
            <div className="moccet-modal-footer" style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '20px',
              borderTop: '1px solid rgba(0,0,0,0.1)'
            }}>
              <button 
                className="moccet-btn moccet-btn-secondary" 
                onClick={() => setShowCreateChannel(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button 
                className="moccet-btn moccet-btn-primary" 
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: newChannelName.trim() ? '#6366f1' : '#ccc',
                  color: 'white',
                  cursor: newChannelName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create Channel
              </button>
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
      
      {/* AI Analytics Modal */}
      <AIAnalytics
        workspaceId={activeWorkspaceId}
        isOpen={showAIAnalytics}
        onClose={() => setShowAIAnalytics(false)}
      />
      
      {/* AI Context Menu */}
      <AIContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        message={contextMenu.message}
        onClose={() => setContextMenu({ isOpen: false, position: null, message: null })}
        onAction={handleAIAction}
      />
    </div>
  );
};

export default MoccetChat;