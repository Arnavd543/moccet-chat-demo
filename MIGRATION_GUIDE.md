# MoccetChat Firebase Migration Guide

## Overview
We've implemented a surgical update approach to migrate from the static UI to Firebase-connected functionality.

## File Structure
- `MoccetChat.jsx` - Current working version (Firebase-connected)
- `MoccetChat.original.jsx` - Original static UI backup
- `MoccetChat.firebase.jsx` - Firebase version (identical to current MoccetChat.jsx)
- `config/featureFlags.js` - Feature toggle configuration

## How to Switch Between Versions

### Method 1: Feature Toggle (Development Only)
In development mode, you'll see a toggle button in the bottom-right corner:
- 🔥 Firebase - Currently using Firebase version
- 📄 Original - Currently using original static version

Click to switch between versions.

### Method 2: Environment Variable
Set in your `.env` file:
```
REACT_APP_USE_FIREBASE_CHAT=true  # Use Firebase version
REACT_APP_USE_FIREBASE_CHAT=false # Use original version
```

### Method 3: Code Change
Edit `config/featureFlags.js`:
```javascript
USE_FIREBASE_CHAT: true  // or false
```

## Features Migrated
✅ Real-time messages from Firestore
✅ Dynamic channel lists
✅ User authentication integration
✅ Typing indicators
✅ Message reactions
✅ Presence system
✅ Direct messages
✅ Loading states

## Rollback Strategy
If you need to rollback to the original version:
1. Set `USE_FIREBASE_CHAT: false` in feature flags
2. Or click the toggle button in development
3. Or rename files:
   ```bash
   mv src/MoccetChat.jsx src/MoccetChat.firebase.jsx
   mv src/MoccetChat.original.jsx src/MoccetChat.jsx
   ```

## Testing Checklist
- [ ] Messages load from Firebase
- [ ] Can send new messages
- [ ] Channels populate correctly
- [ ] User profile shows correctly
- [ ] Reactions work
- [ ] Typing indicators appear
- [ ] Dark mode works
- [ ] Mobile responsive

## Gradual Migration Path
You can enable individual features in `featureFlags.js`:
```javascript
FIREBASE_MESSAGES: true,
FIREBASE_CHANNELS: true,
FIREBASE_PRESENCE: true,
FIREBASE_TYPING: true,
FIREBASE_REACTIONS: true,
FIREBASE_DMS: true,
```

This allows testing specific features while keeping others on mock data.