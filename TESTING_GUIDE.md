# Moccet Chat Demo - Complete Testing Guide

This comprehensive guide covers all features implemented in Phases 1, 2, and 3. Follow this checklist to ensure the app is fully functional with no bugs.

## Prerequisites

1. **Start Firebase Emulators** (for local development):
   ```bash
   firebase emulators:start
   ```

2. **Start the React App**:
   ```bash
   npm start
   ```

3. **Environment Setup**:
   - Ensure `.env.development` is properly configured
   - Set `REACT_APP_USE_FIREBASE_EMULATOR=true` for local testing
   - Set `REACT_APP_USE_FIREBASE_EMULATOR=false` for production Firebase

## Initial Setup Issues & Solutions

### No Workspaces/Channels on First Load
1. Look for the **"Create Default Workspace"** button (blue button in channels sidebar)
2. Click it to create your first workspace with default channels
3. If you don't see the channels sidebar, click the **hamburger menu icon** (☰) at the bottom of the left navigation bar

### Google Sign-In Not Working
1. Navigate to `/debug-google` for detailed diagnostics
2. Most common fix: Enable Google sign-in in Firebase Console
3. Check browser console for specific error codes

## Complete Feature Testing Checklist

### Phase 1: Authentication & Security

#### 1.1 User Registration ✓
- [ ] Navigate to `/register`
- [ ] Enter email, password, and confirm password
- [ ] Verify password requirements are enforced
- [ ] Submit form and verify redirect to onboarding
- [ ] Check browser console for any errors

#### 1.2 Onboarding Flow ✓
- [ ] **Step 1**: Enter display name and bio
- [ ] **Step 2**: Select department and job title
- [ ] **Step 3**: Upload avatar (test with image file)
- [ ] **Step 3**: Select timezone
- [ ] Click "Get Started" and verify redirect to main chat
- [ ] Verify user profile data is saved (check avatar in sidebar)

#### 1.3 Email Verification ✓
- [ ] Check for email verification banner at top of chat
- [ ] If using emulators, verification email won't send (this is normal)
- [ ] In production, check email inbox

#### 1.4 Login Testing ✓
- [ ] Log out by clicking your avatar in the bottom-left sidebar
- [ ] Navigate to `/login`
- [ ] Test with correct credentials
- [ ] Test with incorrect credentials (should show error)
- [ ] Test "Remember me" functionality

#### 1.5 Google Sign-In ✓
- [ ] Click "Sign in with Google" button
- [ ] If fails, visit `/debug-google` for diagnostics
- [ ] Complete Google authentication flow
- [ ] Verify user is logged in and profile is created

#### 1.6 Password Reset ✓
- [ ] From login page, click "Forgot password?"
- [ ] Enter registered email
- [ ] Check for success message
- [ ] In emulators, check console for reset link

#### 1.7 Session Management ✓
- [ ] Open app in two different browsers
- [ ] Login with same account in both
- [ ] Verify both sessions work independently
- [ ] Leave app idle for 30 minutes
- [ ] Verify auto-logout occurs

### Phase 2: Core Messaging & Real-time Features

#### 2.1 Workspace & Channel Setup ✓
- [ ] If no channels visible, click hamburger menu (☰) in sidebar
- [ ] If no workspace exists, click "Create Default Workspace"
- [ ] Verify default channels appear (general, random)
- [ ] Click between channels to switch

#### 2.2 Channel Creation ✓
- [ ] Click "+" button next to "Pinned Spaces"
- [ ] Enter channel name (e.g., "test-channel")
- [ ] Select Public or Private
- [ ] Click "Create Channel"
- [ ] Verify new channel appears in list
- [ ] Click new channel to make it active

#### 2.3 Message Sending ✓
- [ ] Type a message in the input field
- [ ] Press Enter to send
- [ ] Verify message appears immediately
- [ ] Check message shows your name and avatar
- [ ] Send multiple messages rapidly
- [ ] Verify all messages appear in correct order

#### 2.4 Message Formatting ✓
- [ ] Send a multi-line message (Shift+Enter for new line)
- [ ] Send a message with emojis 😀🎉🚀
- [ ] Send a very long message (test text wrapping)
- [ ] Send special characters and symbols

#### 2.5 Message Actions ✓
- [ ] **Edit**: Hover over your message → Click edit icon
- [ ] Modify the message and save
- [ ] Verify message updates in real-time
- [ ] **Delete**: Hover over your message → Click delete icon
- [ ] Confirm deletion
- [ ] Verify message is removed

#### 2.6 Reactions ✓
- [ ] Hover over any message
- [ ] Click the emoji button that appears
- [ ] Select a reaction
- [ ] Verify reaction appears with count
- [ ] Click same reaction again to remove
- [ ] Add multiple different reactions
- [ ] Verify reaction counts update correctly

#### 2.7 Typing Indicators ✓
- [ ] Open app in two browser windows side-by-side
- [ ] Start typing in one window
- [ ] Verify "User is typing..." appears in other window
- [ ] Stop typing and wait 3 seconds
- [ ] Verify typing indicator disappears

#### 2.8 Presence System ✓
- [ ] Check green dot next to your avatar (online status)
- [ ] Open in incognito/private window with different account
- [ ]

 See online status for both users
- [ ] Close one browser tab
- [ ] Verify status changes to offline
- [ ] Switch browser tabs (alt+tab away)
- [ ] Verify status changes to "away"

#### 2.9 Real-time Sync ✓
- [ ] Keep two windows open side-by-side
- [ ] Send message in window 1
- [ ] Verify it instantly appears in window 2
- [ ] Edit message in window 2
- [ ] Verify edit appears in window 1
- [ ] Add reaction in window 1
- [ ] Verify reaction appears in window 2

### Phase 3: File Handling & Rich Media

#### 3.1 File Upload via Paperclip ✓
- [ ] Click paperclip icon in message toolbar
- [ ] Select an image file (JPG/PNG)
- [ ] Verify upload progress bar appears
- [ ] Check upload speed and time remaining display
- [ ] Verify image appears in chat after upload
- [ ] Test with multiple files at once

#### 3.2 Drag and Drop ✓
- [ ] Drag an image file from desktop
- [ ] Hover over chat area
- [ ] Verify drop overlay appears ("Drop files to upload")
- [ ] Drop the file
- [ ] Verify upload starts automatically
- [ ] Test dragging multiple files

#### 3.3 Paste from Clipboard ✓
- [ ] Copy an image to clipboard (screenshot or copy from web)
- [ ] Click in message input field
- [ ] Paste (Ctrl/Cmd + V)
- [ ] Verify image uploads automatically

#### 3.4 Image Preview ✓
- [ ] Click on any uploaded image in chat
- [ ] Verify lightbox opens with full-size image
- [ ] Test close button (X)
- [ ] Test clicking outside image to close
- [ ] Test download button in lightbox

#### 3.5 Document Upload ✓
- [ ] Upload a PDF file
- [ ] Verify document preview appears with icon
- [ ] Check file name and size display
- [ ] Test "eye" icon (opens in new tab)
- [ ] Test download icon

#### 3.6 File Type Validation ✓
- [ ] Try uploading an unsupported file type (.exe)
- [ ] Verify error message appears
- [ ] Try uploading a file larger than 100MB
- [ ] Verify size limit error appears

#### 3.7 Upload Progress ✓
- [ ] Upload a large file (10MB+)
- [ ] Verify progress percentage updates
- [ ] Check upload speed display (KB/s)
- [ ] Test cancel button during upload
- [ ] Verify upload can be cancelled

### Additional Features

#### 4.1 Test Panel (Development Only) ✓
- [ ] Look for flask icon (🧪) in bottom-left
- [ ] Click to open test panel
- [ ] Verify current user and channel info display
- [ ] Test "Send Test Message" button
- [ ] Test "Generate 20 Messages" button
- [ ] Verify all test features work

#### 4.2 Dark/Light Theme ✓
- [ ] Click sun/moon icon in top-right corner
- [ ] Verify theme toggles properly
- [ ] Check all UI elements adapt to theme
- [ ] Verify theme preference persists on reload

#### 4.3 Feature Toggle ✓
- [ ] Use toggle to switch between Firebase/Original UI
- [ ] Verify both versions load correctly
- [ ] Ensure Firebase version has all features

#### 4.4 Mobile Responsiveness ✓
- [ ] Resize browser window to mobile size
- [ ] Verify sidebar collapses appropriately
- [ ] Test hamburger menu on mobile
- [ ] Check message layout on small screens

### Performance & Error Testing

#### 5.1 Load Testing ✓
- [ ] Use Test Panel to generate 20 messages
- [ ] Continue adding messages (50+)
- [ ] Verify scrolling remains smooth
- [ ] Check for any performance lag

#### 5.2 Network Errors ✓
- [ ] Disconnect internet/stop emulators
- [ ] Try sending a message
- [ ] Verify appropriate error handling
- [ ] Reconnect and verify recovery

#### 5.3 Console Errors ✓
- [ ] Open browser developer console
- [ ] Perform all above actions
- [ ] Verify no red errors appear
- [ ] Check for any warning messages

#### 5.4 Edge Cases ✓
- [ ] Send empty message (should not send)
- [ ] Upload 0-byte file
- [ ] Create channel with duplicate name
- [ ] Switch channels rapidly
- [ ] Add/remove reactions quickly

## Common Issues & Solutions

### Messages Not Appearing
1. Check if you're in an active channel
2. Verify workspace is created
3. Check browser console for Firestore errors
4. Ensure Firebase emulators are running

### File Upload Failing
1. Check file size (100MB limit, 50MB for images)
2. Verify file type is supported
3. Check Storage emulator is running
4. Look for errors in browser console

### Channels Not Visible
1. Click hamburger menu (☰) in left sidebar
2. Create default workspace if needed
3. Refresh the page
4. Check console for initialization errors

### Typing Indicators Not Working
1. Verify Realtime Database emulator is running
2. Check you're in the same channel
3. Must have 2+ users to see indicators

### Reactions Not Updating
1. Ensure you're logged in
2. Check Firestore rules aren't blocking
3. Verify message has proper ID

## Testing Checklist Summary

- [ ] ✅ All authentication flows work
- [ ] ✅ Workspace and channels can be created
- [ ] ✅ Messages send and display correctly
- [ ] ✅ Edit/delete/reactions function properly
- [ ] ✅ File uploads work via all methods
- [ ] ✅ Images preview in lightbox
- [ ] ✅ Real-time sync works across windows
- [ ] ✅ Presence and typing indicators work
- [ ] ✅ No console errors during testing
- [ ] ✅ Performance is acceptable with many messages

## Final Verification

After completing all tests above, the app should be:
1. **Fully functional** with all Phase 1-3 features
2. **Bug-free** for current implementation
3. **Ready for production** deployment

If any test fails, check:
1. Browser console for specific errors
2. Network tab for failed requests
3. Firebase emulator logs
4. This guide's "Common Issues" section