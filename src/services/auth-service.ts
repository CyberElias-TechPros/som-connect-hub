// Authentication Service for SOM Connect
// Handles user authentication, role assignment, and token management

import { User, UserRole } from '@/lib/mock-data';

// Mock user database
const mockUsers: Record<string, { password: string; user: User }> = {
  'david.emmanuel@example.com': {
    password: 'password123',
    user: {
      id: '1',
      name: 'David Emmanuel',
      email: 'david.emmanuel@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      role: 'member',
      joinedDate: '2024-01-15',
      streak: 45,
      bio: 'Passionate about spiritual growth and community building.',
      affiliation: 'Christ Embassy Lagos Zone',
    }
  },
  'pastor@example.com': {
    password: 'pastor123',
    user: {
      id: '2',
      name: 'Pastor Michael',
      email: 'pastor@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      role: 'pastor',
      joinedDate: '2023-06-15',
      streak: 120,
      bio: 'Senior Pastor with 15 years of ministry experience.',
      affiliation: 'Christ Embassy Lagos Zone',
    }
  },
  'admin@example.com': {
    password: 'admin123',
    user: {
      id: '3',
      name: 'Admin User',
      email: 'admin@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      role: 'admin',
      joinedDate: '2022-01-10',
      streak: 365,
      bio: 'System Administrator for SOM Connect.',
      affiliation: 'LoveWorld Inc.',
    }
  }
};

// Mock token storage
let currentToken: string | null = null;
let currentUser: User | null = null;

// Generate a mock JWT token
export function generateMockToken(user: User): string {
  return `mock-jwt-${user.id}-${Date.now()}`;
}

// Validate token (mock implementation)
export function validateToken(token: string): boolean {
  return token && token.startsWith('mock-jwt-');
}

// Extract user from token (mock implementation)
export function extractUserFromToken(token: string): User | null {
  if (!token) return null;
  
  const parts = token.split('-');
  if (parts.length < 3) return null;
  
  const userId = parts[2];
  const user = Object.values(mockUsers).find(u => u.user.id === userId)?.user;
  return user || null;
}

// Login service
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  const userData = mockUsers[email];
  
  if (!userData) {
    throw new Error('User not found');
  }

  if (userData.password !== password) {
    throw new Error('Invalid password');
  }

  const token = generateMockToken(userData.user);
  currentToken = token;
  currentUser = userData.user;

  return { user: userData.user, token };
}

// Register service
export async function register(email: string, password: string, name: string, role: UserRole = 'member'): Promise<{ user: User; token: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (mockUsers[email]) {
    throw new Error('User already exists');
  }

  const newUser: User = {
    id: Date.now().toString(),
    name,
    email,
    avatar: `https://i.pravatar.cc/150?u=${email}`,
    role,
    joinedDate: new Date().toISOString().split('T')[0],
    streak: 0,
  };

  mockUsers[email] = { password, user: newUser };
  
  const token = generateMockToken(newUser);
  currentToken = token;
  currentUser = newUser;

  return { user: newUser, token };
}

// Logout service
export function logout(): void {
  currentToken = null;
  currentUser = null;
}

// Get current user
export function getCurrentUser(): User | null {
  return currentUser;
}

// Get current token
export function getCurrentToken(): string | null {
  return currentToken;
}

// Check if authenticated
export function isAuthenticated(): boolean {
  return !!currentToken && !!currentUser;
}

// Check if user has specific role
export function hasRole(roles: UserRole[]): boolean {
  if (!currentUser) return false;
  return roles.includes(currentUser.role);
}

// Check if user has specific permission
export function hasPermission(permission: string): boolean {
  if (!currentUser) return false;
  
  // This would be replaced with actual permission checking in a real app
  // For now, we'll use a simple mapping
  const rolePermissions: Record<UserRole, string[]> = {
    guest: ['content.view.public', 'community.view'],
    member: ['content.view.public', 'content.view.premium', 'community.post', 'upload.content'],
    pastor: ['content.view.public', 'content.view.premium', 'community.post', 'upload.content', 'upload.approve'],
    admin: ['*'] // All permissions
  };

  const permissions = rolePermissions[currentUser.role] || [];
  return permissions.includes(permission) || permissions.includes('*');
}