import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { hasPermission, ROLES, PERMISSIONS } from '../config/roles';
import { rateLimiter } from '../services/rateLimiter';

const SecurityContext = createContext({});

export const useSecurity = () => useContext(SecurityContext);

export const SecurityProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(ROLES.MEMBER);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role and workspace
  useEffect(() => {
    const fetchUserSecurity = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Get user's workspace membership
        // For now, we'll use a default workspace
        const defaultWorkspaceId = 'default-workspace';
        setWorkspaceId(defaultWorkspaceId);

        // Get user's role in the workspace
        const memberDoc = await getDoc(
          doc(firestore, `workspaces/${defaultWorkspaceId}/members`, currentUser.uid)
        );

        if (memberDoc.exists()) {
          setUserRole(memberDoc.data().role || ROLES.MEMBER);
        } else {
          // Create default membership
          setUserRole(ROLES.MEMBER);
        }
      } catch (error) {
        console.error('Error fetching user security:', error);
        setUserRole(ROLES.MEMBER);
      }

      setLoading(false);
    };

    fetchUserSecurity();
  }, [currentUser]);

  // Check if user has permission
  const checkPermission = (permission) => {
    return hasPermission(userRole, permission);
  };

  // Check rate limit before action
  const checkRateLimit = async (action) => {
    if (!currentUser) return { allowed: false, message: 'Not authenticated' };
    
    try {
      const result = await rateLimiter.checkLimit(currentUser.uid, action);
      return result;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { allowed: true, remaining: 0 };
    }
  };

  // Audit log function
  const logAction = async (action, details = {}) => {
    if (!currentUser || !workspaceId) return;

    try {
      const auditLog = {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        action,
        details,
        timestamp: new Date().toISOString(),
        workspaceId,
        userRole,
        ip: 'client-ip', // Would be set by Cloud Function in production
        userAgent: navigator.userAgent
      };

      // In production, this would be a Cloud Function call
      console.log('Audit log:', auditLog);
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  // Security utility functions
  const security = {
    // Channel operations
    canCreateChannel: () => checkPermission(PERMISSIONS.CREATE_CHANNELS),
    canDeleteChannel: () => checkPermission(PERMISSIONS.DELETE_CHANNELS),
    canManageChannel: () => checkPermission(PERMISSIONS.MANAGE_CHANNELS),
    
    // Message operations
    canDeleteAnyMessage: () => checkPermission(PERMISSIONS.DELETE_ANY_MESSAGE),
    canPinMessage: () => checkPermission(PERMISSIONS.PIN_MESSAGES),
    
    // User operations
    canInviteUsers: () => checkPermission(PERMISSIONS.INVITE_USERS),
    canRemoveUsers: () => checkPermission(PERMISSIONS.REMOVE_USERS),
    canManageRoles: () => checkPermission(PERMISSIONS.MANAGE_ROLES),
    
    // Moderation operations
    canMuteUsers: () => checkPermission(PERMISSIONS.MUTE_USERS),
    canBanUsers: () => checkPermission(PERMISSIONS.BAN_USERS),
    canViewAuditLog: () => checkPermission(PERMISSIONS.VIEW_AUDIT_LOG),
    
    // Workspace operations
    canManageWorkspace: () => checkPermission(PERMISSIONS.MANAGE_WORKSPACE),
    canDeleteWorkspace: () => checkPermission(PERMISSIONS.DELETE_WORKSPACE),
    
    // Check if user is admin
    isAdmin: () => [ROLES.SUPER_ADMIN, ROLES.WORKSPACE_ADMIN, ROLES.WORKSPACE_OWNER].includes(userRole),
    isModerator: () => userRole === ROLES.MODERATOR || security.isAdmin(),
  };

  const value = {
    userRole,
    workspaceId,
    checkPermission,
    checkRateLimit,
    logAction,
    security,
    loading,
    ROLES,
    PERMISSIONS
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};