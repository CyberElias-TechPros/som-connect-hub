import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/lib/permissions';

export function usePermissions() {
  const { 
    hasPermission, 
    hasAnyPermission, 
    canAccessRoute, 
    canAccessContent,
    hasRole 
  } = useAuth();

  return {
    hasPermission,
    hasAnyPermission,
    canAccessRoute,
    canAccessContent,
    hasRole,
    
    // Helper methods for common checks
    canViewPremiumContent: () => canAccessContent(true),
    canUploadContent: () => hasPermission('upload.content' as Permission),
    canManageUsers: () => hasPermission('user.manage.roles' as Permission),
    canModerateContent: () => hasPermission('upload.approve' as Permission),
    canAccessAdmin: () => hasRole(['admin']),
    canAccessPastorFeatures: () => hasRole(['pastor', 'admin']),
    canAccessMemberFeatures: () => hasRole(['member', 'pastor', 'admin']),
  };
}