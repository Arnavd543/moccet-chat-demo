import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  addDoc,
  query, 
  where, 
  serverTimestamp,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { firestore } from '../config/firebase';

export const createSimpleWorkspace = async (userId) => {
  try {
    console.log('Creating simple workspace for user:', userId);
    
    // Create workspace document
    const workspaceData = {
      name: 'My Workspace',
      description: 'Default workspace',
      ownerId: userId,
      members: [userId],
      admins: [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      channelCount: 0,
      memberCount: 1,
      plan: 'free'
    };
    
    console.log('Adding workspace to Firestore...');
    const docRef = await addDoc(collection(firestore, 'workspaces'), workspaceData);
    console.log('Workspace created with ID:', docRef.id);
    
    // Create general channel
    const channelData = {
      workspaceId: docRef.id,
      name: 'general',
      description: 'General discussion',
      type: 'public',
      createdBy: userId,
      members: [userId],
      admins: [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('Creating general channel...');
    const channelRef = await addDoc(collection(firestore, 'channels'), channelData);
    console.log('Channel created with ID:', channelRef.id);
    
    return {
      id: docRef.id,
      ...workspaceData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  } catch (error) {
    console.error('Error in createSimpleWorkspace:', error);
    throw error;
  }
};

export const deleteAllUserWorkspaces = async (userId) => {
  try {
    console.log('Deleting all workspaces for user:', userId);
    
    // Get all workspaces where user is the owner
    const workspacesQuery = query(
      collection(firestore, 'workspaces'),
      where('ownerId', '==', userId)
    );
    
    const workspacesSnapshot = await getDocs(workspacesQuery);
    console.log(`Found ${workspacesSnapshot.size} workspaces to delete`);
    
    // Delete in smaller batches to avoid hitting limits
    for (const workspaceDoc of workspacesSnapshot.docs) {
      const workspaceId = workspaceDoc.id;
      const workspaceData = workspaceDoc.data();
      console.log('Deleting workspace:', workspaceId, 'owned by:', workspaceData.ownerId);
      
      // First delete all channels in this workspace
      const channelsQuery = query(
        collection(firestore, 'channels'),
        where('workspaceId', '==', workspaceId)
      );
      
      const channelsSnapshot = await getDocs(channelsQuery);
      console.log(`Found ${channelsSnapshot.size} channels to delete in workspace ${workspaceId}`);
      
      // Delete channels one by one
      for (const channelDoc of channelsSnapshot.docs) {
        try {
          await deleteDoc(channelDoc.ref);
          console.log('Deleted channel:', channelDoc.id);
        } catch (error) {
          console.error('Error deleting channel:', channelDoc.id, error);
        }
      }
      
      // Then delete the workspace
      try {
        await deleteDoc(workspaceDoc.ref);
        console.log('Deleted workspace:', workspaceId);
      } catch (error) {
        console.error('Error deleting workspace:', workspaceId, error);
        throw error;
      }
    }
    
    console.log('All workspaces deleted successfully');
    
  } catch (error) {
    console.error('Error deleting workspaces:', error);
    throw error;
  }
};

// Alternative: Mark workspaces as archived instead of deleting
export const archiveAllUserWorkspaces = async (userId) => {
  try {
    console.log('Archiving all workspaces for user:', userId);
    
    // Get all workspaces where user is the owner
    const workspacesQuery = query(
      collection(firestore, 'workspaces'),
      where('ownerId', '==', userId),
      where('isArchived', '!=', true)
    );
    
    const workspacesSnapshot = await getDocs(workspacesQuery);
    console.log(`Found ${workspacesSnapshot.size} workspaces to archive`);
    
    const batch = writeBatch(firestore);
    
    workspacesSnapshot.forEach(doc => {
      batch.update(doc.ref, {
        isArchived: true,
        archivedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    console.log('All workspaces archived successfully');
    
  } catch (error) {
    console.error('Error archiving workspaces:', error);
    throw error;
  }
};