// Role-based permissions system
export const ROLES = {
  SUPER_ADMIN: 'super_admin',     // Full system access
  WORKSPACE_ADMIN: 'admin',       // Manage workspace
  WORKSPACE_OWNER: 'owner',       // Workspace creator
  MODERATOR: 'moderator',         // Manage channels/users
  MEMBER: 'member',               // Regular user
  GUEST: 'guest'                  // Limited access
};

export const PERMISSIONS = {
  // Workspace permissions
  MANAGE_WORKSPACE: 'manage_workspace',
  DELETE_WORKSPACE: 'delete_workspace',
  MANAGE_BILLING: 'manage_billing',
  
  // User permissions
  INVITE_USERS: 'invite_users',
  REMOVE_USERS: 'remove_users',
  MANAGE_ROLES: 'manage_roles',
  
  // Channel permissions
  CREATE_CHANNELS: 'create_channels',
  DELETE_CHANNELS: 'delete_channels',
  MANAGE_CHANNELS: 'manage_channels',
  CREATE_PRIVATE_CHANNELS: 'create_private_channels',
  
  // Message permissions
  DELETE_ANY_MESSAGE: 'delete_any_message',
  PIN_MESSAGES: 'pin_messages',
  
  // Moderation permissions
  MUTE_USERS: 'mute_users',
  BAN_USERS: 'ban_users',
  VIEW_AUDIT_LOG: 'view_audit_log'
};

// Role to permissions mapping
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.WORKSPACE_OWNER]: [
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.DELETE_WORKSPACE,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.REMOVE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.CREATE_CHANNELS,
    PERMISSIONS.DELETE_CHANNELS,
    PERMISSIONS.MANAGE_CHANNELS,
    PERMISSIONS.CREATE_PRIVATE_CHANNELS,
    PERMISSIONS.DELETE_ANY_MESSAGE,
    PERMISSIONS.PIN_MESSAGES,
    PERMISSIONS.VIEW_AUDIT_LOG
  ],
  [ROLES.WORKSPACE_ADMIN]: [
    PERMISSIONS.MANAGE_WORKSPACE,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.REMOVE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.CREATE_CHANNELS,
    PERMISSIONS.DELETE_CHANNELS,
    PERMISSIONS.MANAGE_CHANNELS,
    PERMISSIONS.CREATE_PRIVATE_CHANNELS,
    PERMISSIONS.DELETE_ANY_MESSAGE,
    PERMISSIONS.PIN_MESSAGES,
    PERMISSIONS.MUTE_USERS,
    PERMISSIONS.VIEW_AUDIT_LOG
  ],
  [ROLES.MODERATOR]: [
    PERMISSIONS.MANAGE_CHANNELS,
    PERMISSIONS.DELETE_ANY_MESSAGE,
    PERMISSIONS.PIN_MESSAGES,
    PERMISSIONS.MUTE_USERS,
    PERMISSIONS.VIEW_AUDIT_LOG
  ],
  [ROLES.MEMBER]: [
    PERMISSIONS.CREATE_CHANNELS
  ],
  [ROLES.GUEST]: []
};

export const hasPermission = (userRole, permission) => {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

export const canUserPerformAction = (user, action, resource = null) => {
  // Check user role permissions
  if (hasPermission(user.role, action)) {
    return true;
  }
  
  // Check resource-specific permissions (e.g., channel admin)
  if (resource && resource.admins && resource.admins.includes(user.uid)) {
    return true;
  }
  
  return false;
};