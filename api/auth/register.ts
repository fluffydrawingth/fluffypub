import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { name, email, password, role = 'customer' } = req.body || {};
  if (!name || !email || !password) return json(res, 400, { error: 'Name, email and password required.' });
  if (!['customer', 'artist'].includes(role)) return json(res, 400, { error: 'Invalid role.' });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, role } },
  });

  if (error) {
    if (error.message.includes('already registered')) return json(res, 409, { error: 'Email already registered.' });
    return json(res, 400, { error: error.message });
  }

  return json(res, 201, {
    success: true,
    token: data.session?.access_token,
    user: {
      id: data.user?.id,
      email: data.user?.email,
      name,
      role,
    },
  });
}
