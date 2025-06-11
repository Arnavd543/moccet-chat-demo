import React, { useState } from 'react';
import './WorkspaceSelector.css';
import { firestoreService } from '../services/firestore';
import { useAuth } from '../contexts/AuthContext';

const WorkspaceSelector = ({ onWorkspaceSelected }) => {
  const [mode, setMode] = useState('choose'); // 'choose', 'create', 'join', 'created'
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [createdWorkspace, setCreatedWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  // Validate workspace ID format (Firebase document IDs)
  const validateWorkspaceId = (id) => {
    if (!id || typeof id !== 'string') return false;
    const trimmed = id.trim();
    // Firestore document IDs must be non-empty strings
    // and cannot contain forward slashes
    if (trimmed.length === 0 || trimmed.includes('/')) return false;
    return true;
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const workspace = await firestoreService.createWorkspace({
        name: workspaceName.trim(),
        description: `${workspaceName} workspace`,
        ownerId: currentUser.uid,
        members: [currentUser.uid],
        admins: [currentUser.uid],
        createdAt: new Date(),
        settings: {
          allowPublicJoin: true,
          requireInvite: false
        }
      });

      console.log('[WorkspaceSelector] Workspace created successfully:', {
        id: workspace.id,
        name: workspace.name,
        sharableId: workspace.id
      });

      // Show the created workspace details
      setCreatedWorkspace(workspace);
      setMode('created');
    } catch (error) {
      console.error('Error creating workspace:', error);
      setError('Failed to create workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!workspaceId.trim()) {
      setError('Please enter a workspace ID');
      return;
    }

    // Validate workspace ID format
    if (!validateWorkspaceId(workspaceId)) {
      setError('Invalid workspace ID format. Please check and try again.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const trimmedWorkspaceId = workspaceId.trim();
      console.log('[WorkspaceSelector] Attempting to join workspace:', {
        rawWorkspaceId: workspaceId,
        trimmedWorkspaceId: trimmedWorkspaceId,
        length: trimmedWorkspaceId.length,
        currentUserId: currentUser?.uid
      });
      
      // Get workspace
      const workspace = await firestoreService.getWorkspace(trimmedWorkspaceId);
      
      if (!workspace) {
        console.error('[WorkspaceSelector] Workspace not found:', trimmedWorkspaceId);
        setError('Workspace not found. Please check the ID and try again.');
        return;
      }
      
      console.log('[WorkspaceSelector] Found workspace:', {
        id: workspace.id,
        name: workspace.name,
        members: workspace.members?.length || 0,
        currentMembers: workspace.members
      });

      // Add user to workspace (this will automatically add them to public channels)
      console.log('[WorkspaceSelector] Adding user to workspace...');
      await firestoreService.joinWorkspace(workspace.id, currentUser.uid);
      console.log('[WorkspaceSelector] User added to workspace and public channels successfully');

      console.log('[WorkspaceSelector] Workspace join complete, calling onWorkspaceSelected');
      onWorkspaceSelected(workspace);
    } catch (error) {
      console.error('[WorkspaceSelector] Error joining workspace:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        workspaceId: workspaceId.trim()
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to join workspace. ';
      if (error.code === 'permission-denied') {
        errorMessage += 'You do not have permission to join this workspace.';
      } else if (error.code === 'not-found') {
        errorMessage += 'The workspace ID is invalid.';
      } else if (error.message?.includes('Workspace not found')) {
        errorMessage += 'The workspace does not exist.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyWorkspaceId = (id) => {
    navigator.clipboard.writeText(id);
    alert('Workspace ID copied to clipboard!');
  };

  if (mode === 'choose') {
    return (
      <div className="workspace-selector">
        <div className="workspace-selector-container">
          <h1>Welcome to Moccet</h1>
          <p>Join an existing workspace or create a new one</p>

          <div className="workspace-options">
            <button 
              className="workspace-option create"
              onClick={() => setMode('create')}
            >
              <i className="fa-solid fa-plus-circle"></i>
              <h3>Create Workspace</h3>
              <p>Start a new workspace for your team</p>
            </button>

            <button 
              className="workspace-option join"
              onClick={() => setMode('join')}
            >
              <i className="fa-solid fa-users"></i>
              <h3>Join Workspace</h3>
              <p>Join an existing workspace with an ID</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="workspace-selector">
        <div className="workspace-selector-container">
          <button className="back-button" onClick={() => setMode('choose')}>
            <i className="fa-solid fa-arrow-left"></i> Back
          </button>

          <h1>Create a New Workspace</h1>
          <p>Your workspace is where your team communicates</p>

          <div className="workspace-form">
            <label>Workspace Name</label>
            <input
              type="text"
              placeholder="e.g., My Team, Project Alpha"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateWorkspace()}
              disabled={loading}
            />

            {error && <div className="error-message">{error}</div>}

            <button 
              className="submit-button"
              onClick={handleCreateWorkspace}
              disabled={loading || !workspaceName.trim()}
            >
              {loading ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="workspace-selector">
        <div className="workspace-selector-container">
          <button className="back-button" onClick={() => setMode('choose')}>
            <i className="fa-solid fa-arrow-left"></i> Back
          </button>

          <h1>Join a Workspace</h1>
          <p>Enter the workspace ID shared by your team</p>

          <div className="workspace-form">
            <label>Workspace ID</label>
            <input
              type="text"
              placeholder="e.g., abc123xyz"
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                // Clear error when user types
                if (error) setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinWorkspace()}
              disabled={loading}
              style={{
                borderColor: error && !validateWorkspaceId(workspaceId) ? '#ef4444' : undefined
              }}
            />

            {error && <div className="error-message">{error}</div>}
            
            {workspaceId && (
              <div className="help-text" style={{ marginTop: '8px', background: '#e0e7ff', color: '#4338ca' }}>
                <i className="fa-solid fa-check-circle"></i>
                Workspace ID: <strong>{workspaceId.trim()}</strong> ({workspaceId.trim().length} chars)
              </div>
            )}

            <button 
              className="submit-button"
              onClick={handleJoinWorkspace}
              disabled={loading || !workspaceId.trim()}
            >
              {loading ? 'Joining...' : 'Join Workspace'}
            </button>

            <div className="help-text">
              <i className="fa-solid fa-info-circle"></i>
              Ask your team admin for the workspace ID
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'created' && createdWorkspace) {
    return (
      <div className="workspace-selector">
        <div className="workspace-selector-container">
          <h1>Workspace Created!</h1>
          <p>Your workspace "{createdWorkspace.name}" has been created successfully.</p>
          
          <div className="workspace-id-display">
            <label>Share this Workspace ID with your team:</label>
            <div className="workspace-id-box">
              <code>{createdWorkspace.id}</code>
              <button 
                className="copy-button"
                onClick={() => copyWorkspaceId(createdWorkspace.id)}
              >
                <i className="fa-solid fa-copy"></i> Copy
              </button>
            </div>
          </div>
          
          <div className="help-text">
            <i className="fa-solid fa-info-circle"></i>
            Team members can join this workspace using the ID above
          </div>
          
          <button 
            className="submit-button"
            onClick={() => onWorkspaceSelected(createdWorkspace)}
          >
            Enter Workspace
          </button>
        </div>
      </div>
    );
  }
};

export default WorkspaceSelector;