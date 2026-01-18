// RBAC Permissions System for SOM Connect
// Defines roles, permissions, and access control rules

export type UserRole = 'guest' | 'member' | 'pastor' | 'admin';

// Define all available permissions
export type Permission = 
  // Content access
  | 'content.view.public'
  | 'content.view.premium'
  | 'content.download'
  | 'content.favorite'
  | 'content.share'
  
  // Community features
  | 'community.view'
  | 'community.post'
  | 'community.comment'
  | 'community.like'
  | 'community.create.group'
  | 'community.manage.group'
  
  // Q&A Sessions
  | 'qa.view'
  | 'qa.ask.question'
  | 'qa.upvote.question'
  | 'qa.answer.question'
  | 'qa.manage.session'
  
  // Uploads and content creation
  | 'upload.content'
  | 'upload.manage'
  | 'upload.approve'
  
  // User management
  | 'user.view.profile'
  | 'user.edit.profile'
  | 'user.manage.roles'
  | 'user.view.all'
  | 'user.ban'
  
  // Subscription management
  | 'subscription.view'
  | 'subscription.manage'
  | 'subscription.view.all'
  
  // Admin features
  | 'admin.dashboard'
  | 'admin.moderation'
  | 'admin.stats'
  | 'admin.settings'
  
  // System features
  | 'system.notifications'
  | 'system.settings'
  | 'system.help';

// Define role permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  guest: [
    'content.view.public',
    'community.view',
    'qa.view',
    'user.view.profile',
    'system.notifications',
    'system.help',
  ],
  
  member: [
    'content.view.public',
    'content.view.premium',
    'content.download',
    'content.favorite',
    'content.share',
    'community.view',
    'community.post',
    'community.comment',
    'community.like',
    'qa.view',
    'qa.ask.question',
    'qa.upvote.question',
    'user.view.profile',
    'user.edit.profile',
    'subscription.view',
    'subscription.manage',
    'system.notifications',
    'system.settings',
    'system.help',
  ],
  
  pastor: [
    'content.view.public',
    'content.view.premium',
    'content.download',
    'content.favorite',
    'content.share',
    'community.view',
    'community.post',
    'community.comment',
    'community.like',
    'community.create.group',
    'community.manage.group',
    'qa.view',
    'qa.ask.question',
    'qa.upvote.question',
    'qa.answer.question',
    'upload.content',
    'upload.manage',
    'user.view.profile',
    'user.edit.profile',
    'subscription.view',
    'subscription.manage',
    'system.notifications',
    'system.settings',
    'system.help',
  ],
  
  admin: [
    'content.view.public',
    'content.view.premium',
    'content.download',
    'content.favorite',
    'content.share',
    'community.view',
    'community.post',
    'community.comment',
    'community.like',
    'community.create.group',
    'community.manage.group',
    'qa.view',
    'qa.ask.question',
    'qa.upvote.question',
    'qa.answer.question',
    'qa.manage.session',
    'upload.content',
    'upload.manage',
    'upload.approve',
    'user.view.profile',
    'user.edit.profile',
    'user.manage.roles',
    'user.view.all',
    'user.ban',
    'subscription.view',
    'subscription.manage',
    'subscription.view.all',
    'admin.dashboard',
    'admin.moderation',
    'admin.stats',
    'admin.settings',
    'system.notifications',
    'system.settings',
    'system.help',
  ],
};

// Check if a user has a specific permission
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
}

// Check if a user has any of the required permissions
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

// Check if a user has all required permissions
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

// Get all permissions for a role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Check if a role can access a specific route
export function canAccessRoute(role: UserRole, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    '/admin': ['admin.dashboard'],
    '/admin/moderation': ['admin.moderation'],
    '/admin/users': ['user.manage.roles'],
    '/upload': ['upload.content'],
    '/submissions': ['upload.manage'],
    '/subscription': ['subscription.manage'],
    '/payment': ['subscription.manage'],
    '/profile/edit': ['user.edit.profile'],
    '/community': ['community.view'],
    '/qa': ['qa.view'],
    '/library': ['content.view.public'],
  };
  
  const requiredPermissions = routePermissions[route] || [];
  return requiredPermissions.length === 0 || hasAnyPermission(role, requiredPermissions);
}

// Check if content is accessible based on user role and content properties
export function canAccessContent(role: UserRole, isPremium: boolean): boolean {
  if (!isPremium) {
    return hasPermission(role, 'content.view.public');
  }
  return hasPermission(role, 'content.view.premium');
}