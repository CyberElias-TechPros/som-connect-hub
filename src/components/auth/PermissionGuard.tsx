import React from 'react';
import { usePermissions } from '@/hooks/use-permissions';

interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  permissions?: string[];
  role?: string;
  roles?: string[];
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  permissions = [],
  role,
  roles = [],
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasRole } = usePermissions();

  // Check permission
  if (permission && !hasPermission(permission as any)) {
    return fallback || null;
  }

  // Check multiple permissions
  if (permissions.length > 0 && !hasAnyPermission(permissions as any)) {
    return fallback || null;
  }

  // Check role
  if (role && !hasRole([role as any])) {
    return fallback || null;
  }

  // Check multiple roles
  if (roles.length > 0 && !hasRole(roles as any)) {
    return fallback || null;
  }

  return <>{children}</>;
}

export function AdminOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard roles={['admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function PastorOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard roles={['pastor', 'admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function MemberOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard roles={['member', 'pastor', 'admin']} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function PremiumOnly({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard permission="content.view.premium" fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}

export function ContentGuard({ 
  children, 
  isPremium, 
  fallback 
}: { 
  children: React.ReactNode; 
  isPremium: boolean; 
  fallback?: React.ReactNode; 
}) {
  const { canAccessContent } = usePermissions();

  if (isPremium && !canAccessContent(isPremium)) {
    return fallback || (
      <div className="text-center py-4">
        <p className="text-muted-foreground text-sm">Premium content - upgrade to access</p>
      </div>
    );
  }

  return <>{children}</>;
}