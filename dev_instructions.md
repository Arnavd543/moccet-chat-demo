# Moccet Chat - Developer Instructions

This document provides a comprehensive guide for developers working on the Moccet Chat application. It covers the architecture, key components, data flow, and development best practices.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
├─────────────────────────────────────────────────────────────┤
│  Context Providers (Auth, Message, Security)                │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (Firestore, Realtime, Storage)              │
├─────────────────────────────────────────────────────────────┤
│                     Firebase Backend                         │
│  ┌─────────────┬──────────────┬────────────┬─────────────┐ │
│  │    Auth     │  Firestore   │  Realtime  │   Storage   │ │
│  │             │   Database   │  Database  │             │ │
│  └─────────────┴──────────────┴────────────┴─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
moccet-chat-demo/
├── public/                     # Static assets
├── src/
│   ├── components/            # React components
│   │   ├── auth/             # Authentication components
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── ForgotPassword.js
│   │   │   ├── EmailVerification.js
│   │   │   ├── Onboarding.js
│   │   │   └── ProtectedRoute.js
│   │   └── ...
│   ├── config/               # Configuration files
│   │   ├── firebase.js       # Firebase initialization
│   │   ├── constants.js      # App constants
│   │   ├── featureFlags.js   # Feature toggles
│   │   ├── roles.js          # RBAC definitions
│   │   └── appCheck.js       # Firebase App Check
│   ├── contexts/             # React contexts
│   │   ├── AuthContext.js    # Authentication state
│   │   ├── MessageContext.js # Message management
│   │   └── SecurityContext.js # Security & permissions
│   ├── hooks/                # Custom React hooks
│   │   └── usePresence.js    # User presence tracking
│   ├── models/               # Data models
│   │   └── index.js          # Model definitions
│   ├── services/             # Firebase service layer
│   │   ├── firestore.js      # Firestore operations
│   │   ├── firestoreSimple.js # Simplified Firestore helpers
│   │   ├── realtime.js       # Realtime database operations
│   │   ├── storage.js        # File storage operations
│   │   └── rateLimiter.js    # Rate limiting service
│   ├── utils/                # Utility functions
│   ├── App.js                # Main app component
│   ├── MoccetChat.js         # Main chat interface
│   └── index.js              # App entry point
├── .env.example              # Environment variables template
├── firebase.json             # Firebase configuration
├── firestore.rules           # Firestore security rules
├── database.rules.json       # Realtime DB security rules
└── storage.rules             # Storage security rules
```

## 🔑 Key Components

### 1. **MoccetChat.js** - Main Chat Interface
The core component that renders the entire chat interface.

**Key Features:**
- Workspace and channel management
- Real-time message display
- File upload handling
- User presence tracking
- Theme switching
- Modal management (create channel, profile, etc.)

**State Management:**
```javascript
// UI State
isDarkTheme, showChannelsSidebar, showEmojiPicker, etc.

// Data State
activeChannelId, activeWorkspaceId, workspaces, channels, directMessages

// File Upload State
stagedAttachments, uploadProgress

// User State (from context)
currentUser, userProfile
```

### 2. **Context Providers**

#### AuthContext.js
Manages authentication state and user profiles.

**Key Functions:**
- `signup()` - Register new users
- `login()` - Email/password authentication
- `signInWithGoogle()` - Google OAuth
- `logout()` - Sign out and cleanup
- `updateUserProfile()` - Update user data
- `managePresence()` - Track online status

#### MessageContext.js
Handles all message-related operations.

**Key Functions:**
- `sendMessage()` - Send text messages
- `uploadFileAndSend()` - Send messages with attachments
- `subscribeToChannel()` - Real-time message subscription
- `addReaction()` / `removeReaction()` - Message reactions
- `editMessage()` / `deleteMessage()` - Message management

#### SecurityContext.js
Manages permissions and role-based access control.

**Key Functions:**
- `checkPermission()` - Verify user permissions
- `checkRateLimit()` - Prevent spam/abuse
- `logAction()` - Audit logging
- Various permission checks (canCreateChannel, canDeleteMessage, etc.)

### 3. **Service Layer**

#### firestore.js
Primary interface for Firestore database operations.

**Key Collections:**
- `workspaces` - Workspace documents
- `channels` - Channel documents with subcollections for messages
- `users` - User profiles
- `directMessages` - DM conversations

**Key Functions:**
- Workspace CRUD operations
- Channel management
- Message operations with pagination
- User profile management

#### realtime.js
Handles real-time features using Firebase Realtime Database.

**Key Features:**
- Typing indicators
- User presence/online status
- Real-time updates that don't fit Firestore's model

#### storage.js
Manages file uploads and downloads.

**Key Features:**
- File validation (size, type)
- Progress tracking
- Secure URL generation
- File categorization (images, documents, etc.)

## 🔄 Data Flow

### Message Sending Flow
```
1. User types message in MoccetChat component
2. handleSendMessage() called on Enter key
3. MessageContext.sendMessage() invoked
4. firestoreService.sendMessage() writes to Firestore
5. Real-time listener updates all connected clients
6. Messages re-render in UI
```

### File Upload Flow
```
1. User selects/drops files
2. Files staged in local state
3. On send, uploadFileAndSend() called
4. storageService.uploadFile() uploads to Firebase Storage
5. Attachment metadata saved with message
6. Download URLs generated for display
```

### Authentication Flow
```
1. User submits login/register form
2. AuthContext methods handle Firebase Auth
3. User profile created/updated in Firestore
4. Presence tracking initiated
5. App redirects to main chat interface
```

## 🛠️ Development Guidelines

### State Management
- Use React Context for global state (auth, messages)
- Local component state for UI-specific data
- Avoid prop drilling - use contexts instead

### Firebase Best Practices
- Use batch operations when possible
- Implement proper pagination for large collections
- Cache frequently accessed data
- Use compound queries efficiently
- Always validate data on both client and server (rules)

### Security Considerations
- Never trust client input
- Implement proper Firebase Security Rules
- Use App Check in production
- Validate file uploads
- Implement rate limiting
- Sanitize user-generated content

### Performance Optimization
- Lazy load components where appropriate
- Use React.memo for expensive renders
- Implement virtual scrolling for long message lists
- Optimize Firebase queries
- Cache static assets

## 🚀 Common Development Tasks

### Adding a New Feature
1. Create feature flag in `featureFlags.js`
2. Implement UI components
3. Add necessary Firebase operations to services
4. Update security rules if needed
5. Add proper error handling
6. Test with emulators first

### Adding a New Message Type
1. Update message model in `models/index.js`
2. Add rendering logic in `MoccetChat.js`
3. Update `sendMessage()` in `MessageContext.js`
4. Add validation in Firebase rules
5. Update UI to support new type

### Debugging Tips
- Use React DevTools for component inspection
- Firebase Emulator UI for database inspection
- Network tab for Firebase requests
- Console logging with descriptive prefixes `[ComponentName]`
- Test with multiple user accounts

## 📊 Database Schema

### Firestore Collections

#### workspaces
```javascript
{
  id: string,
  name: string,
  description: string,
  ownerId: string,
  admins: string[],
  members: string[],
  settings: object,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### channels
```javascript
{
  id: string,
  workspaceId: string,
  name: string,
  description: string,
  type: 'public' | 'private',
  createdBy: string,
  admins: string[],
  members: string[],
  pinnedMessages: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### messages (subcollection of channels)
```javascript
{
  id: string,
  channelId: string,
  workspaceId: string,
  userId: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'system',
  attachments: array,
  reactions: array,
  threadCount: number,
  isEdited: boolean,
  isDeleted: boolean,
  createdAt: timestamp,
  updatedAt: timestamp,
  sender: {
    uid: string,
    displayName: string,
    photoURL: string,
    email: string
  }
}
```

### Realtime Database Structure
```
{
  presence: {
    userId: {
      online: boolean,
      lastSeen: timestamp
    }
  },
  typing: {
    channelId: {
      userId: {
        isTyping: boolean,
        userName: string,
        timestamp: number
      }
    }
  }
}
```

## 🔧 Environment Setup

### Required Environment Variables
```env
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_FIREBASE_DATABASE_URL=
REACT_APP_RECAPTCHA_SITE_KEY=
REACT_APP_USE_FIREBASE_EMULATORS=true (for development)
```

### Firebase Emulator Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize emulators
firebase init emulators

# Start emulators
npm run emulators
```

## 🧪 Testing Strategy

### Unit Tests
- Test service functions in isolation
- Mock Firebase dependencies
- Test component logic separately from UI

### Integration Tests
- Test complete user flows
- Use Firebase Emulators
- Test security rules

### E2E Tests
- Test critical paths (login, send message, create channel)
- Test cross-browser compatibility
- Performance testing

## 🚨 Known Issues & Limitations

1. **Message Pagination**: Currently loads 50 messages at a time
2. **File Size Limit**: 100MB per file
3. **Typing Indicators**: Clear after 3 seconds
4. **Presence**: Updates may lag on poor connections
5. **Search**: Not yet implemented
6. **Threads**: Message threading not yet implemented
7. **Voice/Video**: WebRTC integration pending

## 📈 Future Enhancements

1. **AI Assistant Integration**
   - OpenAI/Claude API integration
   - Per-channel AI configuration
   - Smart command processing

2. **Advanced Features**
   - Message search with filters
   - Thread conversations
   - Voice/video calling
   - Screen sharing
   - Message scheduling
   - Rich text editor

3. **Performance Improvements**
   - Virtual scrolling for messages
   - Lazy loading for channels
   - Better caching strategy
   - WebSocket for real-time updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the coding standards
4. Write tests for new features
5. Update documentation
6. Submit a pull request

### Code Style
- Use ES6+ syntax
- Follow React best practices
- Consistent naming conventions
- Comment complex logic
- Keep components focused and small

### Commit Messages
Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Build/tooling updates

## 📞 Support

For development questions:
1. Check this documentation
2. Review existing code examples
3. Check Firebase documentation
4. Open an issue on GitHub