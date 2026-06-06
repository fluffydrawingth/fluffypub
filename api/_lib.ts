import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service role client — bypasses RLS, used only in server-side API routes
export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper: extract Bearer token from Authorization header
export function getToken(req: any): string | null {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Helper: validate token and return session user
export async function getUser(req: any) {
  const token = getToken(req);
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  // Get profile for role info
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, bio, artist_slug, favorites')
    .eq('id', user.id)
    .single();
  return profile;
}

// Helper: standard JSON response
export function json(res: any, status: number, data: any) {
  res.status(status).json(data);
}

// Helper: require auth, return user or send 401/403
export async function requireAuth(req: any, res: any, roles?: string[]) {
  const user = await getUser(req);
  if (!user) { json(res, 401, { error: 'Not authenticated' }); return null; }
  if (roles && !roles.includes(user.role)) { json(res, 403, { error: 'Forbidden' }); return null; }
  return user;
}
