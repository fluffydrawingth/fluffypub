import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, getUser, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;

    const { title, price, category, description = '', image = '🎨', type = 'digital', pages = 0, tags = [], original_price } = req.body || {};
    if (!title || !price || !category) return json(res, 400, { error: 'title, price, category required' });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    const { data, error } = await supabase.from('products').insert({
      title, slug, price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      artist_id: user.id, artist_name: user.name, artist_slug: user.artist_slug || '',
      category, description, image, type, pages: parseInt(pages) || 0, tags,
      is_new: true, active: true,
    }).select().single();

    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
}
