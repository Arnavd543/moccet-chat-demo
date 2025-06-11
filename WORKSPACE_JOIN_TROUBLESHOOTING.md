# Workspace Join Troubleshooting Guide

## Common Issues and Solutions

### 1. "Workspace not found" Error

**Symptoms:**
- Error message: "Workspace not found. Please check the ID and try again."
- User B cannot join workspace created by User A

**Debugging Steps:**

1. **Check Browser Console (F12)**
   - Look for `[WorkspaceSelector]` and `[FirestoreService]` logs
   - Check the exact workspace ID being used
   - Look for any Firebase errors

2. **Verify Workspace ID**
   - Open console in the creator's browser
   - The workspace ID is logged when created
   - Ensure no extra spaces or characters when copying

3. **Run Debug Script**
   ```javascript
   // In browser console, paste the debug script from debug-workspace-join.js
   // Then run:
   debugWorkspaceJoin('YOUR_WORKSPACE_ID_HERE')
   ```

### 2. Permission Denied Errors

**If you see `permission-denied` errors:**

1. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

2. **Check Authentication**
   - Ensure user is logged in
   - Check if email is verified (if required)

3. **Verify Rules Allow Read**
   The rules should allow any signed-in user to read workspaces:
   ```
   allow read: if isSignedIn();
   ```

### 3. Firebase Emulator vs Production

**Check which environment you're using:**

1. **In Browser Console:**
   ```javascript
   firebase.firestore()._settings
   ```
   - If `host` is set, you're using emulator
   - If not, you're using production

2. **Ensure Consistency:**
   - Both users must be on the same environment
   - If using emulator, both need `REACT_APP_USE_FIREBASE_EMULATOR=true`

### 4. Workspace ID Issues

**Common problems:**
- Extra spaces before/after ID
- Case sensitivity (IDs are case-sensitive)
- Special characters or line breaks

**Solution:**
1. Use the UI helper that shows the exact ID being used
2. The ID length should match what was created (usually 20 characters)

### 5. Quick Fixes to Try

1. **Refresh both browsers**
2. **Clear browser cache and cookies**
3. **Try in incognito/private mode**
4. **Restart Firebase emulator** (if using)
5. **Check network connectivity**

### 6. Verify Workspace Exists

In the workspace creator's browser console:
```javascript
// Check if workspace exists
const db = firebase.firestore();
const workspaceId = 'YOUR_WORKSPACE_ID';
db.collection('workspaces').doc(workspaceId).get()
  .then(doc => {
    if (doc.exists) {
      console.log('Workspace exists:', doc.data());
    } else {
      console.log('Workspace does not exist!');
    }
  });
```

### 7. Manual Workspace Join (Emergency)

If the UI isn't working, try manually in console:
```javascript
// Get current user
const user = firebase.auth().currentUser;
if (!user) {
  console.error('Not logged in!');
  return;
}

// Join workspace manually
const workspaceId = 'YOUR_WORKSPACE_ID';
const db = firebase.firestore();

// Add user to workspace members array
db.collection('workspaces').doc(workspaceId).update({
  members: firebase.firestore.FieldValue.arrayUnion(user.uid)
}).then(() => {
  console.log('Joined workspace!');
  window.location.reload(); // Refresh to load workspace
}).catch(error => {
  console.error('Error:', error);
});
```

## Getting Help

When reporting issues, provide:
1. Browser console logs
2. Network tab screenshots (filtered by "firestore")
3. The exact workspace ID being used
4. Output from the debug script
5. Which environment (emulator vs production)
6. Browser and OS information