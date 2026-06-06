const { supabase, requireAuth, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Public: only published active products
    const { data, error } = await supabase
      .from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,description,image,cover_image_url,type,pages,rating,reviews,tags,featured,bestseller,is_new,active,status,shipping_required,created_at')
      .eq('active', true).eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;

    const {
      title, price, category, description = '', image = '🎨',
      cover_image_url, type = 'digital', pages = 0, tags = [],
      original_price, status = 'published', digital_download_url,
      download_instruction, physical_stock = 0, shipping_required = false,
      artist_id, artist_name: bodyArtistName,
    } = req.body || {};

    if (!title || !price || !category) return json(res, 400, { error: 'title, price, category required' });

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

    // Admin can assign to any artist, artist uses their own id
    const finalArtistId = user.role === 'admin' && artist_id ? artist_id : user.id;
    const { data: artistProfile } = await supabase.from('profiles').select('name, artist_slug').eq('id', finalArtistId).single();

    const { data, error } = await supabase.from('products').insert({
      title, slug,
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      artist_id: finalArtistId,
      artist_name: bodyArtistName || artistProfile?.name || '',
      artist_slug: artistProfile?.artist_slug || '',
      category, description, image,
      cover_image_url: cover_image_url || null,
      type, pages: parseInt(pages) || 0, tags,
      status, is_new: true, active: true,
      digital_download_url: digital_download_url || null,
      download_instruction: download_instruction || null,
      physical_stock: parseInt(physical_stock) || 0,
      shipping_required: Boolean(shipping_required),
    }).select().single();

    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
};
