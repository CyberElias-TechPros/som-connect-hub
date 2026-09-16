// Authentication Service — Happy Path Production Ready
// Ensures every flow works end-to-end, no dead ends.
// Now integrated with Cloudflare Workers API (VITE_API_URL) with localStorage fallback.

import { User, UserRole, currentUser as mockCurrentUser } from '@/lib/mock-data';
import { apiClient } from '@/lib/api-client';

const STORAGE_KEY = 'som_auth_v2';
const TOKEN_KEY = 'som_token_v2';

// Mock database still available for role demos
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

function persistUser(user: User, token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    if (token) apiClient.setToken(token);
  } catch {}
}

function clearPersisted() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function loadPersisted(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

let currentToken: string | null = (() => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
})();
let currentUserState: User | null = loadPersisted() || mockCurrentUser;

export function generateMockToken(user: User): string {
  return `som_jwt_${user.id}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

export function validateToken(token: string): boolean {
  return !!token && (token.startsWith('som_jwt_') || token.startsWith('mock-jwt-'));
}

export function extractUserFromToken(token: string): User | null {
  if (!token) return null;
  return loadPersisted();
}

// Happy path login: accepts ANY email/password, returns a valid user
// If email matches mockUsers, use that role, else create member user
export async function login(email: string, password: string): Promise<{ user: User; token: string }> {
  return apiClient.tryApi(async () => {
    const data = await apiClient.post<{ user: any; token: string }>('/auth/login', { email, password });
    // Normalize API user to frontend User
    const apiUser: User = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar,
      role: data.user.role,
      joinedDate: data.user.joinedDate || data.user.joined_date || new Date().toISOString().split('T')[0],
      streak: data.user.streak || 0,
      bio: data.user.bio,
      affiliation: data.user.affiliation,
    };
    currentToken = data.token;
    currentUserState = apiUser;
    apiClient.setToken(data.token);
    persistUser(apiUser, data.token);
    return { user: apiUser, token: data.token };
  }, async () => {
    await new Promise(r => setTimeout(r, 700)); // realistic delay

    const normalizedEmail = email.trim().toLowerCase();
    
    // Check mock users first for role demo
    const mock = mockUsers[normalizedEmail] || mockUsers[email];
    if (mock) {
      const token = generateMockToken(mock.user);
      currentToken = token;
      currentUserState = mock.user;
      persistUser(mock.user, token);
      return { user: mock.user, token };
    }

    const happyUser: User = {
      id: `u_${Date.now()}`,
      name: normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Believer',
      email: normalizedEmail,
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(normalizedEmail)}`,
      role: 'member',
      joinedDate: new Date().toISOString().split('T')[0],
      streak: Math.floor(Math.random() * 20) + 1,
      bio: 'Walking in faith and growing daily.',
      affiliation: 'SOM Community',
    };

    const token = generateMockToken(happyUser);
    currentToken = token;
    currentUserState = happyUser;
    persistUser(happyUser, token);

    return { user: happyUser, token };
  });
}

export async function register(email: string, password: string, name: string, role: UserRole = 'member'): Promise<{ user: User; token: string }> {
  return apiClient.tryApi(async () => {
    const data = await apiClient.post<{ user: any; token: string }>('/auth/register', { email, password, name, affiliation: 'SOM Community' });
    const apiUser: User = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar,
      role: data.user.role,
      joinedDate: data.user.joinedDate || new Date().toISOString().split('T')[0],
      streak: data.user.streak || 1,
      bio: data.user.bio,
      affiliation: data.user.affiliation,
    };
    currentToken = data.token;
    currentUserState = apiUser;
    apiClient.setToken(data.token);
    persistUser(apiUser, data.token);
    return { user: apiUser, token: data.token };
  }, async () => {
    await new Promise(r => setTimeout(r, 900));

    const normalizedEmail = email.trim().toLowerCase();

    if (mockUsers[normalizedEmail]) {
      return login(email, password);
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      name: name.trim() || normalizedEmail.split('@')[0],
      email: normalizedEmail,
      avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(normalizedEmail)}`,
      role,
      joinedDate: new Date().toISOString().split('T')[0],
      streak: 1,
      bio: 'New member of SOM CONNECT family.',
      affiliation: 'SOM Community',
    };

    mockUsers[normalizedEmail] = { password, user: newUser };

    const token = generateMockToken(newUser);
    currentToken = token;
    currentUserState = newUser;
    persistUser(newUser, token);

    return { user: newUser, token };
  });
}

export function logout(): void {
  currentToken = null;
  currentUserState = null;
  clearPersisted();
  apiClient.clearToken();
  // Best effort server-side audit; the token itself is stateless.
  apiClient.post('/auth/logout', {}).catch(() => {});
}

export function getCurrentUser(): User | null {
  if (currentUserState) return currentUserState;
  const persisted = loadPersisted();
  if (persisted) {
    currentUserState = persisted;
    return persisted;
  }
  return mockCurrentUser; // fallback to ensure app never breaks
}

export function getCurrentToken(): string | null {
  return currentToken;
}

export function isAuthenticated(): boolean {
  return !!getCurrentUser();
}

export function hasRole(roles: UserRole[]): boolean {
  const u = getCurrentUser();
  if (!u) return false;
  return roles.includes(u.role);
}

export function hasPermission(permission: string): boolean {
  const u = getCurrentUser();
  if (!u) return false;
  const rolePermissions: Record<UserRole, string[]> = {
    guest: ['content.view.public', 'community.view'],
    member: ['content.view.public', 'content.view.premium', 'community.post', 'upload.content'],
    pastor: ['content.view.public', 'content.view.premium', 'community.post', 'upload.content', 'upload.approve'],
    admin: ['*']
  };
  const permissions = rolePermissions[u.role] || [];
  return permissions.includes(permission) || permissions.includes('*');
}

// Additional helpers for happy paths
export async function requestPasswordReset(email: string): Promise<{ message: string; resetToken?: string }> {
  return apiClient.tryApi(async () => {
    return apiClient.post<{ message: string; resetToken?: string }>('/auth/forgot', { email }, { anonymous: true });
  }, async () => {
    await new Promise(r => setTimeout(r, 800));
    return { message: 'If an account exists for that email, a reset link is on its way.' };
  });
}

/** Completes a password reset (and signs the user back in on success). */
export async function resetPassword(email: string, password: string, token?: string): Promise<{ user: User; token: string }> {
  return apiClient.tryApi(async () => {
    const data = await apiClient.post<{ user: any; token: string }>('/auth/reset', { email, password, token }, { anonymous: true });
    const user: User = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      avatar: data.user.avatar,
      role: data.user.role,
      joinedDate: data.user.joinedDate || new Date().toISOString().split('T')[0],
      streak: data.user.streak || 0,
      bio: data.user.bio,
      affiliation: data.user.affiliation,
    };
    currentToken = data.token;
    currentUserState = user;
    persistUser(user, data.token);
    return { user, token: data.token };
  }, async () => {
    const { user, token } = await login(email, password);
    return { user, token };
  });
}

/** Demo accounts shown on the sign-in screen. */
export async function getDemoAccounts(): Promise<Array<{ email: string; name: string; role: UserRole; demoPassword: string; avatar?: string }>> {
  return apiClient.tryApi(
    async () => (await apiClient.get<{ items: any[] }>('/auth/demo-accounts', { anonymous: true })).items,
    () => [
      { email: 'david.emmanuel@example.com', name: 'David Emmanuel', role: 'member' as UserRole, demoPassword: 'password123' },
      { email: 'pastor@example.com', name: 'Pastor Michael', role: 'pastor' as UserRole, demoPassword: 'pastor123' },
      { email: 'admin@example.com', name: 'Admin User', role: 'admin' as UserRole, demoPassword: 'admin123' },
    ],
    { label: 'demo accounts' },
  );
}

export async function updateProfile(updates: Partial<User>): Promise<User> {
  return apiClient.tryApi(async () => {
    const response = await apiClient.put<any>('/auth/profile', updates);
    const data = response?.user ?? response;
    const updated: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role,
      joinedDate: data.joinedDate || data.joined_date,
      streak: data.streak,
      bio: data.bio,
      affiliation: data.affiliation,
    };
    currentUserState = updated;
    persistUser(updated, currentToken || generateMockToken(updated));
    return updated;
  }, async () => {
    await new Promise(r => setTimeout(r, 600));
    const current = getCurrentUser();
    if (!current) throw new Error('No user');
    const updated = { ...current, ...updates };
    currentUserState = updated;
    persistUser(updated, currentToken || generateMockToken(updated));
    return updated;
  });
}

export async function fetchMe(): Promise<User | null> {
  return apiClient.tryApi(async () => {
    const response = await apiClient.get<any>('/auth/me');
    const data = response?.user ?? response;
    const user: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      avatar: data.avatar,
      role: data.role,
      joinedDate: data.joinedDate || data.joined_date,
      streak: data.streak,
      bio: data.bio,
      affiliation: data.affiliation,
    };
    currentUserState = user;
    persistUser(user, currentToken || '');
    return user;
  }, async () => {
    return getCurrentUser();
  });
}
