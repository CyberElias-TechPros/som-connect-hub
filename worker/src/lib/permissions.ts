export type Role = 'guest' | 'member' | 'pastor' | 'admin';

export const RoleHierarchy: Record<Role, number> = {
  guest: 0,
  member: 1,
  pastor: 2,
  admin: 3,
};

export function hasMinRole(userRole: Role, minRole: Role): boolean {
  return RoleHierarchy[userRole] >= RoleHierarchy[minRole];
}

export const Permissions = {
  // Content
  'content.view.public': ['guest','member','pastor','admin'],
  'content.view.premium': ['member','pastor','admin'],
  'content.create': ['pastor','admin'],
  'content.edit': ['pastor','admin'],
  'content.delete': ['admin'],
  'content.approve': ['admin'],

  // Community
  'community.view': ['guest','member','pastor','admin'],
  'community.post': ['member','pastor','admin'],
  'community.moderate': ['pastor','admin'],

  // Q&A
  'qa.view': ['guest','member','pastor','admin'],
  'qa.ask': ['member','pastor','admin'],
  'qa.answer': ['pastor','admin'],
  'qa.create': ['pastor','admin'],

  // Uploads
  'upload.content': ['pastor','admin'],
  'upload.approve': ['admin'],

  // Admin
  'admin.view': ['admin'],
  'admin.users': ['admin'],
  'admin.stats': ['admin'],
  'admin.moderation': ['admin'],

  // Subscriptions
  'subscription.manage': ['member','pastor','admin'],
  'subscription.plans.manage': ['admin'],

  // Tools
  'tools.manage': ['admin'],
} as const;

export function can(role: Role, permission: keyof typeof Permissions): boolean {
  const allowed = Permissions[permission] as readonly string[];
  return (allowed as string[]).includes(role);
}

export function requirePermission(permission: keyof typeof Permissions) {
  return async (c: any, next: any) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!can(user.role as Role, permission)) {
      return c.json({ error: 'Forbidden: requires ' + permission }, 403);
    }
    await next();
  };
}
