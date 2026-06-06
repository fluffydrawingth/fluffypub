import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;
  const { data, error } = await supabase.from('profiles').select('id, email, name, role, artist_slug, created_at').order('created_at');
  if (error) return json(res, 500, { error: error.message });
  return json(res, 200, data);
}
