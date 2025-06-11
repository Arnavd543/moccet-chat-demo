# Testing Workspace Join/Create Functionality

## Overview
The workspace functionality allows users to either create a new workspace or join an existing one using a workspace ID. This enables teams to collaborate in separate environments.

## Testing Steps

### 1. Create a New Workspace (User A)

1. **Start the application**
   ```bash
   npm start
   ```

2. **Register a new account** (if not already registered)
   - Go to http://localhost:3001
   - Click "Sign Up" 
   - Enter email: `usera@test.com`
   - Create a password
   - Complete registration

3. **Create a workspace**
   - After login, if you have no workspaces, you'll automatically see the workspace selector
   - Click "Create Workspace"
   - Enter a workspace name (e.g., "Test Team")
   - Click "Create Workspace"

4. **Copy the workspace ID**
   - After creation, you'll see a success screen with the workspace ID
   - Click the "Copy" button to copy the workspace ID
   - Save this ID to share with other users
   - Click "Enter Workspace" to proceed

### 2. Join an Existing Workspace (User B)

1. **Open a new browser window** (incognito/private mode recommended)
   
2. **Register a second account**
   - Go to http://localhost:3001
   - Click "Sign Up"
   - Enter email: `userb@test.com`
   - Create a password
   - Complete registration

3. **Join the workspace**
   - After login, you'll see the workspace selector
   - Click "Join Workspace"
   - Paste the workspace ID from User A
   - Click "Join Workspace"

4. **Verify workspace access**
   - You should now be in the same workspace as User A
   - You'll automatically join the #general channel
   - You can now chat with User A

### 3. Test Messaging Between Users

1. **User A**: Send a message in the #general channel
2. **User B**: Should see the message appear in real-time
3. **User B**: Reply to the message
4. **User A**: Should see User B's reply

### 4. Test Additional Features

- **Create channels**: Either user can create new channels
- **File sharing**: Test uploading and sharing files
- **AI commands**: Try `/ai hello` to test AI integration
- **Voice/Video calls**: Click the phone/video icons to test WebRTC calls

## Troubleshooting

### "Workspace not found" error
- Verify the workspace ID is copied correctly (no extra spaces)
- Check that the workspace was created successfully
- Ensure Firestore rules are deployed: `firebase deploy --only firestore:rules`

### Can't see messages from other user
- Verify both users are in the same workspace
- Check both users are in the same channel
- Refresh the browser if needed

### Permission errors
- Ensure you're logged in
- Check browser console for specific error messages
- Verify Firestore rules allow the operation

## Testing with Firebase Emulator

If using Firebase emulator:
```bash
# Terminal 1 - Start Firebase emulator
firebase emulators:start

# Terminal 2 - Start Vercel dev server (for AI features)
vercel dev

# Terminal 3 - Start React app
npm start
```

## Workspace Management

### View Workspace ID
After joining a workspace, the workspace ID is displayed in the browser console when the workspace loads.

### Multiple Workspaces
Currently, the app loads the first workspace automatically. Future updates will add a workspace switcher.

### Workspace Permissions
- **Owner**: Full control (created the workspace)
- **Admin**: Can manage channels and members
- **Member**: Can chat and join channels

## Security Notes

1. Workspace IDs should be treated as semi-private
2. Only share workspace IDs with trusted team members
3. Future updates will add invite links with expiration