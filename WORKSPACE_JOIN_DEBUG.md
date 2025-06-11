# Workspace Join Debugging Guide

## Common Issues and Solutions

### 1. Workspace Not Found Error

**Symptoms:**
- "Workspace not found. Please check the ID and try again."
- User cannot join an existing workspace

**Debugging Steps:**

1. **Check Console Logs:**
   - Open browser DevTools (F12 or right-click → Inspect)
   - Go to Console tab
   - Look for logs starting with `[WorkspaceSelector]` or `[FirestoreService]`
   - Check for the exact workspace ID being used

2. **Verify Workspace ID:**
   ```javascript
   // Look for this log pattern:
   [WorkspaceSelector] Attempting to join workspace: {
     rawWorkspaceId: "abc123 ",  // Note any spaces
     trimmedWorkspaceId: "abc123",
     length: 6,
     currentUserId: "user123"
   }
   ```
   - Ensure no extra spaces or special characters
   - Workspace IDs are case-sensitive

3. **Check Firestore Permissions:**
   - Look for errors like `permission-denied`
   - Ensure user is authenticated
   - Check if email is verified (some rules require this)

### 2. Network/Firestore Errors

**Symptoms:**
- Failed network requests in Network tab
- 403/404 errors from Firestore

**Debugging Steps:**

1. **Check Network Tab:**
   - Open DevTools → Network tab
   - Filter by "firestore" or "googleapis"
   - Look for failed requests (red status)
   - Check request/response details

2. **Common Error Codes:**
   - `permission-denied`: User doesn't have access
   - `not-found`: Document doesn't exist
   - `unauthenticated`: User not logged in
   - `resource-exhausted`: Rate limit exceeded

### 3. Authentication Issues

**Symptoms:**
- User appears logged out after joining
- "Not authenticated" errors

**Debugging Steps:**

1. **Verify Authentication State:**
   ```javascript
   // Check these logs:
   [WorkspaceSelector] currentUserId: "user123"
   [FirestoreService] Adding user to workspace: { userId: "user123" }
   ```

2. **Check Firebase Auth:**
   - In Console, run: `firebase.auth().currentUser`
   - Should return user object, not null

### 4. Data Consistency Issues

**Symptoms:**
- Workspace exists but user can't join
- User joins but doesn't see channels

**Debugging Steps:**

1. **Check Firestore Data:**
   - Go to Firebase Console → Firestore
   - Navigate to `workspaces/{workspaceId}`
   - Verify the workspace exists
   - Check `members` array includes user ID after join

2. **Verify Channel Access:**
   ```javascript
   // Look for these logs:
   [WorkspaceSelector] Found channels: [
     { id: "channel1", name: "general" },
     { id: "channel2", name: "random" }
   ]
   ```

## Debug Information to Collect

When reporting issues, please provide:

1. **Console Logs:**
   - All logs with `[WorkspaceSelector]` prefix
   - All logs with `[FirestoreService]` prefix
   - Any error messages

2. **Network Activity:**
   - Screenshot of failed requests
   - Request/response details

3. **User Information:**
   - User ID (found in logs)
   - Workspace ID attempting to join
   - Whether user created the workspace or joining existing

4. **Browser Information:**
   - Browser name and version
   - Any browser extensions that might interfere

## Quick Fixes

1. **Clear Browser Cache:**
   - Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Clear site data in DevTools → Application → Storage

2. **Re-authenticate:**
   - Log out and log back in
   - Ensure email is verified if required

3. **Verify Workspace ID:**
   - Copy ID directly from creator's screen
   - No manual typing to avoid errors
   - Check for case sensitivity

## Testing Workspace Join

To test if workspace joining is working:

1. Create a test workspace as User A
2. Copy the exact workspace ID
3. Log in as User B in incognito/different browser
4. Paste workspace ID exactly as copied
5. Check console for debug logs
6. Verify both users see the same channels

## Contact Support

If issues persist after following this guide:

1. Collect all debug information listed above
2. Take screenshots of errors
3. Note exact steps to reproduce
4. Include timestamp of attempts