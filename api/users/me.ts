import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res);
    if (!user) return;
    return json(res, 200, user);
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { name, bio } = req.body || {};
    const updates: any = { updated_at: new Date().toISOString() };
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
}
