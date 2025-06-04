# Moccet Chat Troubleshooting Guide

## Message Sending Issues

### Problem: Messages not appearing after sending

1. **Check the Debug Panel**
   - Click the "Debug" button at the bottom right of the screen
   - Verify that Channel ID and Workspace ID are not "None"
   - Check the message count

2. **Use Console Commands**
   ```javascript
   // Check current state
   window.debugPanel.getState()
   
   // Send a test message
   window.debugPanel.sendTest('Test message')
   
   // Try direct write (bypasses app logic)
   window.debugPanel.directWrite('Direct test')
   ```

3. **Verify Firebase Connection**
   ```javascript
   // Test basic connectivity
   window.quickTest.testConnection()
   
   // Test channel read
   window.quickTest.testChannelRead('YOUR_CHANNEL_ID')
   
   // Test message read
   window.quickTest.testMessageRead('YOUR_CHANNEL_ID')
   ```

### Problem: "Missing userId or senderId" error

1. **Check Message Model**
   ```javascript
   // Test message creation
   window.messageTest.testMessageModel()
   ```

2. **Verify User Authentication**
   ```javascript
   // Get current user ID
   window.quickTest.getCurrentUserId()
   ```

### Problem: Channel not recognized

1. **Verify Channel Exists**
   ```javascript
   // Check if channel exists in Firestore
   window.quickTest.testChannelRead('YOUR_CHANNEL_ID')
   ```

2. **Check Channel Subscription**
   - The debug panel will show if you're subscribed to the channel
   - Try clicking "Refresh" in the debug panel

### Problem: Messages appear briefly then disappear

This is usually caused by:
- Optimistic updates being overwritten by empty subscription data
- Permission issues preventing message reads

**Solutions:**
1. Check Firestore security rules
2. Verify the channel subscription is working
3. Use the debug panel to monitor message count

## Common Console Commands

```javascript
// Get current app state
window.debugPanel.getState()

// Debug message context
window.__moccetMessages

// Check active channel
window.__moccetActiveChannelId

// Send test message
window.debugPanel.sendTest('Hello from debug')

// Direct Firestore write (bypasses app logic)
window.quickTest.testDirectWrite(
  window.__moccetActiveChannelId,
  window.quickTest.getCurrentUserId(),
  'Direct message test'
)

// Monitor real-time updates
window.quickTest.testSubscription(window.__moccetActiveChannelId, 30000)
```

## Firebase Emulator Issues

1. **Ensure emulators are running:**
   ```bash
   npm run emulators
   ```

2. **Check emulator UI:**
   - Open http://localhost:4000
   - Verify Firestore and Auth are running
   - Check for any error messages

3. **Clear emulator data:**
   ```bash
   # Stop emulators (Ctrl+C)
   # Restart with clean data
   npm run emulators
   ```

## Development Tips

1. **Enable verbose logging:**
   - All major operations log to console with prefixes like `[MoccetChat]`, `[MessageContext]`, `[FirestoreService]`
   - Filter console by these prefixes to track specific flows

2. **Use the Debug Panel:**
   - Always visible in development
   - Shows real-time state
   - Provides quick test buttons

3. **Monitor Network tab:**
   - Check for failed Firestore requests
   - Look for permission denied errors

4. **Check Redux DevTools:**
   - Install React Developer Tools extension
   - Inspect component state and props

## Security Rules

If you see permission denied errors, ensure your Firestore rules allow:
- User authentication checks
- Message creation with matching userId/senderId
- Channel read/write permissions

Current rules location: `/firestore.rules`