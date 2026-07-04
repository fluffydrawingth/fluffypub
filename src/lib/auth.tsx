import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'customer' | 'artist' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  username?: string;
  bio?: string;
  artistSlug?: string;
  artistId?: string | null;
  affiliate_enabled?: boolean;
  favorites?: string[];
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: (options?: { force?: boolean }) => Promise<AuthUser | null>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthCtx>({
  user: null, loading: true, token: null,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  refreshUser: async () => null,
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

// Read cached user from localStorage synchronously (used for instant initial state)
function readCachedUser(): AuthUser | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t || !decodeJwt(t)) return null; // no token or expired
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const u: AuthUser = JSON.parse(raw);
    if (u.email === ADMIN_EMAIL) u.role = 'admin';
    return u;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Initialize from localStorage so returning users never see a loading spinner.
  // The background /me verify below still runs to catch expired tokens or role changes.
  const [user, setUser] = useState<AuthUser | null>(() => readCachedUser());
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  // loading=true only when there's a token but no cached user (e.g. very first login device)
  const [loading, setLoading] = useState<boolean>(() => {
    const t = localStorage.getItem(TOKEN_KEY);
    return !!t && !readCachedUser();
  });

  const refreshUser = async (_options?: { force?: boolean }): Promise<AuthUser | null> => {
    const t = localStorage.getItem(TOKEN_KEY);
    if (!t) { setUser(null); setLoading(false); return null; }

    // Always fetch fresh from API (never return stale localStorage cache)
    // This ensures profile saves persist immediately
    try {
      // cache:'no-store' + a cache-busting param guarantee a fresh profile every time,
      // so a just-approved artist/affiliate is never served a stale cached /me response.
      const r = await fetch(`/api/auth?action=me&_=${Date.now()}`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: 'no-store',
      });
      if (r.ok) {
        const u = await r.json();
        if (u.artist_id !== undefined && u.artistId === undefined) u.artistId = u.artist_id;
        if (u.email === ADMIN_EMAIL) u.role = 'admin';
        // Temporary access debug — confirm the live permission source of truth.
        console.debug('[auth/me]', { id: u.id, email: u.email, role: u.role, artist_id: u.artistId ?? u.artist_id ?? null, affiliate_enabled: !!u.affiliate_enabled });
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        setUser(u);
        setLoading(false);
        return u;
      }
    } catch {}

    // Fallback: the /me fetch failed (transient error / cold start). Do NOT downgrade
    // the role — the JWT's user_metadata.role is the original signup value ('customer'),
    // so trusting it here would silently demote an approved artist. Prefer the cached
    // user (which may correctly be 'artist'/'admin'); only fall back to the JWT when
    // there is no cache at all.
    const payload = decodeJwt(t);
    if (payload?.sub && payload?.email) {
      let u: AuthUser | null = null;
      try {
        const cached = localStorage.getItem(USER_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.id === payload.sub) u = parsed;
        }
      } catch {}
      if (!u) {
        const email = payload.email;
        const role: UserRole = email === ADMIN_EMAIL ? 'admin' : 'customer';
        u = { id: payload.sub, email, name: payload.user_metadata?.name || email.split('@')[0], role };
      }
      if (u.email === ADMIN_EMAIL) u.role = 'admin';
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setUser(u);
      setLoading(false);
      return u;
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
    }
    setLoading(false);
    return null;
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
        localStorage.setItem(TOKEN_KEY, d.token);
        localStorage.setItem(USER_KEY, JSON.stringify(d.user));
        setToken(d.token);
        setUser(d.user);
        // Pull the complete, authoritative profile (role, artistId, affiliate_enabled)
        // so permissions are correct even if the login response is missing a field.
        await refreshUser();
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
    const t = localStorage.getItem(TOKEN_KEY);
    if (t) await fetch('/api/auth?action=logout', { method: 'POST', headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    try {
      // Must be just the origin — Supabase appends #access_token=...&type=recovery as a hash,
      // so adding /#/reset-password would create an invalid double-hash URL.
      const redirectTo = window.location.origin;
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
      const t = localStorage.getItem(TOKEN_KEY);
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
