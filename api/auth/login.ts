import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { email, password } = req.body || {};
  if (!email || !password) return json(res, 400, { error: 'Email and password required.' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return json(res, 401, { error: 'Invalid email or password.' });

  // Fetch role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', data.user.id)
    .single();

  return json(res, 200, {
    success: true,
    token: data.session.access_token,
    user: {
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || '',
      role: profile?.role || 'customer',
    },
  });
}
