import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['artist']);
  if (!user) return;
  // Get orders that contain this artist's products
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .contains('items', [{ artistId: user.id }])
    .order('created_at', { ascending: false });
  if (error) return json(res, 500, { error: error.message });
  // Filter items to only this artist's
  const filtered = (data || []).map((o: any) => ({
    ...o, items: o.items.filter((i: any) => i.artistId === user.id),
  }));
  return json(res, 200, filtered);
}
