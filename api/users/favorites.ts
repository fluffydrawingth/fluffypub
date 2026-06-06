import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).single();
  const current: string[] = profile?.favorites || [];

  if (req.method === 'GET') return json(res, 200, current);

  const productId = (req.query.productId as string) || req.body?.productId;

  if (req.method === 'POST') {
    const updated = current.includes(productId) ? current : [...current, productId];
    await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
    return json(res, 200, { favorites: updated });
  }

  if (req.method === 'DELETE') {
    const updated = current.filter((id: string) => id !== productId);
    await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
    return json(res, 200, { favorites: updated });
  }

  return json(res, 405, { error: 'Method not allowed' });
}
