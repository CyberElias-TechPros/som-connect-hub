import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/lib/mock-data';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: UserRole[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [], 
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, hasAnyPermission, hasRole } = useAuth();
  const location = useLocation();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if user has required roles
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    return <Navigate to="/" replace />;
  }

  // Check if user has required permissions
  if (requiredPermissions.length > 0 && !hasAnyPermission(requiredPermissions as any)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin'] as UserRole[]}>
      {children}
    </ProtectedRoute>
  );
}

export function PastorRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['pastor', 'admin'] as UserRole[]}>
      {children}
    </ProtectedRoute>
  );
}

export function MemberRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['member', 'pastor', 'admin'] as UserRole[]}>
      {children}
    </ProtectedRoute>
  );
}

export function PremiumContent({ children, isPremium }: { children: React.ReactNode; isPremium: boolean }) {
  const { canAccessContent } = useAuth();

  if (isPremium && !canAccessContent(isPremium)) {
    return (
      <div className="text-center py-8">
        <h3 className="text-xl font-semibold mb-2">Premium Content</h3>
        <p className="text-muted-foreground">This content is available to premium members only.</p>
      </div>
    );
  }

  return <>{children}</>;
}