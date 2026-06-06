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
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true, token: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => {},
});

const TOKEN_KEY = 'fluffy_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const apiFetch = (url: string, opts: RequestInit = {}) =>
    fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...((opts.headers as any) || {}) } });

  const refreshUser = async () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) { setUser(null); setLoading(false); return; }
    try {
      const r = await fetch('/api/auth?action=me', { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const u = await r.json(); setUser(u); }
      else { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); }
    } catch { setUser(null); }
    setLoading(false);
  };

  useEffect(() => { refreshUser(); }, []);

  const login = async (email: string, password: string) => {
    try {
      const r = await fetch('/api/auth?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (r.ok && d.success) {
        sessionStorage.setItem(TOKEN_KEY, d.token);
        setToken(d.token); setUser(d.user);
        return { success: true };
      }
      return { success: false, error: d.error || 'Login failed' };
    } catch { return { success: false, error: 'Connection error.' }; }
  };

  const register = async (name: string, email: string, password: string, role: UserRole = 'customer') => {
    try {
      const r = await fetch('/api/auth?action=register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, role }) });
      const d = await r.json();
      if (r.ok && d.success) {
        // Don't auto-login — user must confirm email first
        return { success: true };
      }
      return { success: false, error: d.error || 'Registration failed' };
    } catch { return { success: false, error: 'Connection error.' }; }
  };

  const logout = async () => {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) await fetch('/api/auth?action=logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null); setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, token, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
