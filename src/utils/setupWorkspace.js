import { firestoreService } from '../services/firestore';
import { auth } from '../config/firebase';

export const setupWorkspace = async () => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('[SetupWorkspace] No current user');
      return null;
    }

    console.log('[SetupWorkspace] Checking for existing workspaces...');
    
    // Check if user has any workspaces
    const workspaces = await firestoreService.getUserWorkspaces(currentUser.uid);
    
    if (workspaces.length > 0) {
      console.log('[SetupWorkspace] User already has workspaces:', workspaces);
      return workspaces[0];
    }
    
    console.log('[SetupWorkspace] No workspaces found, creating default workspace...');
    
    // Create a default workspace
    const workspace = await firestoreService.createWorkspace({
      name: 'My Workspace',
      description: 'Default workspace',
      ownerId: currentUser.uid,
      members: [currentUser.uid],
      admins: [currentUser.uid]
    });
    
    console.log('[SetupWorkspace] Created workspace:', workspace);
    return workspace;
  } catch (error) {
    console.error('[SetupWorkspace] Error setting up workspace:', error);
    throw error;
  }
};

// Attach to window for console access
if (typeof window !== 'undefined') {
  window.setupWorkspace = setupWorkspace;
  console.log('[SetupWorkspace] Setup utility available at window.setupWorkspace()');
}