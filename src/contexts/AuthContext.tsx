import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '@/lib/mock-data';
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
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load persisted user on mount — happy path, always have a user if previously logged in
    const load = () => {
      try {
        const current = getCurrentUser();
        if (current) setUser(current);
      } catch {}
      setIsLoading(false);
    };
    // Small delay for premium loading feel
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { user } = await authLogin(email, password);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const { user } = await authRegister(email, password, name);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const hasPermission = useCallback((permission: Permission) => {
    if (!user) return false;
    return checkPermission(user.role, permission);
  }, [user]);

  const hasAnyPermission = useCallback((permissions: Permission[]) => {
    if (!user) return false;
    return checkAnyPermission(user.role, permissions);
  }, [user]);

  const canAccessRoute = useCallback((route: string) => {
    if (!user) return false;
    return checkRouteAccess(user.role, route);
  }, [user]);

  const canAccessContent = useCallback((isPremium: boolean) => {
    if (!user) return false;
    return checkContentAccess(user.role, isPremium);
  }, [user]);

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
        updateUser,
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
