import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query as { slug: string };

  if (req.method === 'GET') {
    // Try by slug first, then by id
    let query = supabase.from('products').select('*');
    const isUuid = /^[0-9a-f-]{36}$/.test(slug);
    query = isUuid ? query.eq('id', slug) : query.eq('slug', slug);
    const { data, error } = await query.eq('active', true).single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;

    // Get product to check ownership
    const { data: product } = await supabase.from('products').select('artist_id').eq('id', slug).single();
    if (!product) return json(res, 404, { error: 'Not found' });
    if (user.role === 'artist' && product.artist_id !== user.id) return json(res, 403, { error: 'Forbidden' });

    const allowed = ['title','price','original_price','category','description','image','type','pages','tags','active'];
    if (user.role === 'admin') allowed.push('featured','bestseller','is_new');

    const updates: any = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('products').update(updates).eq('id', slug).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;

    const { data: product } = await supabase.from('products').select('artist_id').eq('id', slug).single();
    if (!product) return json(res, 404, { error: 'Not found' });
    if (user.role === 'artist' && product.artist_id !== user.id) return json(res, 403, { error: 'Forbidden' });

    await supabase.from('products').update({ active: false }).eq('id', slug);
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
}
