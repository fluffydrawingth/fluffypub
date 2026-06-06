import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'customer' | 'artist' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  bio?: string;
  artistSlug?: string;
  favorites?: string[];
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true, token: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
  resetPassword: async () => ({ success: false }),
  updatePassword: async () => ({ success: false }),
});

const TOKEN_KEY = 'fluffy_token';
const USER_KEY = 'fluffy_user';
const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';

// Decode JWT payload without verifying signature
function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) { setUser(null); setLoading(false); return; }

    // Try stored user first
    const stored = sessionStorage.getItem(USER_KEY);
    if (stored) {
      try {
        const u = JSON.parse(stored);
        // Force admin role for admin email
        if (u.email === ADMIN_EMAIL) u.role = 'admin';
        setUser(u);
        setLoading(false);
        return;
      } catch {}
    }

    // Try /api/auth?action=me
    try {
      const r = await fetch('/api/auth?action=me', { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) {
        const u = await r.json();
        if (u.email === ADMIN_EMAIL) u.role = 'admin';
        sessionStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
        setLoading(false);
        return;
      }
    } catch {}

    // Fallback: decode JWT to get basic user info
    const payload = decodeJwt(t);
    if (payload?.sub && payload?.email) {
      const email = payload.email;
      const role: UserRole = email === ADMIN_EMAIL ? 'admin' : 'customer';
      const u: AuthUser = { id: payload.sub, email, name: payload.user_metadata?.name || email.split('@')[0], role };
      sessionStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => { refreshUser(); }, []);

  const login = async (email: string, password: string) => {
    try {
      const r = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        // Force admin role for admin email
        if (d.user && d.user.email === ADMIN_EMAIL) d.user.role = 'admin';
        sessionStorage.setItem(TOKEN_KEY, d.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(d.user));
        setToken(d.token);
        setUser(d.user);
        return { success: true };
      }
      return { success: false, error: d.error || 'Login failed' };
    } catch { return { success: false, error: 'Connection error.' }; }
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'customer') => {
    try {
      const r = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const d = await r.json();
      if (r.ok && d.success) return { success: true };
      return { success: false, error: d.error || 'Registration failed' };
    } catch { return { success: false, error: 'Connection error.' }; }
  };

  const logout = async () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) await fetch('/api/auth?action=logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/#/reset-password`;
      const r = await fetch('/api/auth?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectTo }),
      });
      const d = await r.json();
      if (r.ok) return { success: true };
      return { success: false, error: d.error || 'Failed to send reset email.' };
    } catch { return { success: false, error: 'Connection error.' }; }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const t = sessionStorage.getItem(TOKEN_KEY);
      const r = await fetch('/api/auth?action=update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ password: newPassword }),
      });
      const d = await r.json();
      if (r.ok) return { success: true };
      return { success: false, error: d.error || 'Failed to update password.' };
    } catch { return { success: false, error: 'Connection error.' }; }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout, refreshUser, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
