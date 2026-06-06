import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const { data: artists } = await supabase.from('profiles').select('id, name, artist_slug, bio').eq('role', 'artist');
  const { data: products } = await supabase.from('products').select('artist_id').eq('active', true);
  const result = (artists || []).map((a: any) => ({
    ...a,
    productCount: (products || []).filter((p: any) => p.artist_id === a.id).length,
  }));
  return json(res, 200, result);
}
