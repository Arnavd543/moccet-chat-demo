// Debug script for workspace joining issues
// Run this in the browser console

async function debugWorkspaceJoin(workspaceId) {
  console.log('=== Debugging Workspace Join ===');
  console.log('Workspace ID:', workspaceId);
  console.log('Workspace ID length:', workspaceId.length);
  console.log('Workspace ID trimmed:', workspaceId.trim());
  console.log('Trimmed length:', workspaceId.trim().length);
  
  // Check if user is authenticated
  const auth = firebase.auth();
  const user = auth.currentUser;
  console.log('Current user:', user ? user.email : 'Not authenticated');
  console.log('User ID:', user ? user.uid : 'N/A');
  
  if (!user) {
    console.error('User not authenticated!');
    return;
  }
  
  // Try to fetch the workspace directly
  try {
    console.log('\n--- Attempting to fetch workspace ---');
    const db = firebase.firestore();
    const workspaceRef = db.collection('workspaces').doc(workspaceId.trim());
    console.log('Workspace path:', workspaceRef.path);
    
    const workspaceDoc = await workspaceRef.get();
    console.log('Document exists:', workspaceDoc.exists);
    
    if (workspaceDoc.exists) {
      const data = workspaceDoc.data();
      console.log('Workspace data:', {
        id: workspaceDoc.id,
        name: data.name,
        members: data.members,
        ownerId: data.ownerId,
        createdAt: data.createdAt
      });
      
      // Check if user is already a member
      if (data.members && data.members.includes(user.uid)) {
        console.log('✓ User is already a member of this workspace');
      } else {
        console.log('✗ User is NOT a member of this workspace');
      }
    } else {
      console.error('✗ Workspace document does not exist!');
      
      // Try to list all workspaces to see what's available
      console.log('\n--- Listing all workspaces ---');
      try {
        const workspacesSnapshot = await db.collection('workspaces').get();
        console.log('Total workspaces:', workspacesSnapshot.size);
        workspacesSnapshot.forEach(doc => {
          console.log(`- ${doc.id}: ${doc.data().name}`);
        });
      } catch (listError) {
        console.error('Error listing workspaces:', listError);
      }
    }
  } catch (error) {
    console.error('Error fetching workspace:', {
      message: error.message,
      code: error.code,
      details: error
    });
    
    if (error.code === 'permission-denied') {
      console.error('✗ Permission denied - check Firestore rules');
    }
  }
  
  // Check if using emulator
  const settings = db._settings || {};
  console.log('\n--- Environment ---');
  console.log('Using emulator:', settings.host ? `Yes (${settings.host})` : 'No (Production)');
  
  console.log('\n=== End Debug ===');
}

// Usage: Copy a workspace ID and run:
// debugWorkspaceJoin('YOUR_WORKSPACE_ID_HERE')

console.log('Debug function loaded. Run: debugWorkspaceJoin("workspace-id")');