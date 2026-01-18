import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, currentUser } from '@/lib/mock-data';
import { hasPermission as checkPermission, hasAnyPermission as checkAnyPermission, canAccessRoute as checkRouteAccess, canAccessContent as checkContentAccess, Permission } from '@/lib/permissions';
import {
  login as authLogin,
  register as authRegister,
  logout as authLogout,
  getCurrentUser,
  isAuthenticated as checkAuth
} from '@/services/auth-service';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  canAccessRoute: (route: string) => boolean;
  canAccessContent: (isPremium: boolean) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(currentUser); // Start with mock user for demo
  const [isLoading, setIsLoading] = useState(false);

  // Check auth state on mount
  useEffect(() => {
    const checkAuthState = () => {
      const currentUser = getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
      }
    };
    
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user, token } = await authLogin(email, password);
      setUser(user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { user, token } = await authRegister(email, password, name);
      setUser(user);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    return checkPermission(user.role, permission);
  };

  const hasAnyPermission = (permissions: Permission[]) => {
    if (!user) return false;
    return checkAnyPermission(user.role, permissions);
  };

  const canAccessRoute = (route: string) => {
    if (!user) return false;
    return checkRouteAccess(user.role, route);
  };

  const canAccessContent = (isPremium: boolean) => {
    if (!user) return false;
    return checkContentAccess(user.role, isPremium);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        hasPermission,
        hasAnyPermission,
        canAccessRoute,
        canAccessContent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
