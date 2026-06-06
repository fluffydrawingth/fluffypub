const { supabase, requireAuth, json } = require('../_lib');

module.exports = async function handler(req, res) {
  const { slug } = req.query;

  if (req.method === 'GET') {
    const isUuid = /^[0-9a-f-]{36}$/.test(slug);
    let query = supabase.from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,description,image,cover_image_url,type,pages,rating,reviews,tags,featured,bestseller,is_new,active,status,shipping_required,created_at');
    query = isUuid ? query.eq('id', slug) : query.eq('slug', slug);
    const { data, error } = await query.single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    // Strip private fields from public
    const { digital_download_url, download_instruction, ...publicData } = data;
    return json(res, 200, publicData);
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;
    const { data: product } = await supabase.from('products').select('artist_id').eq('id', slug).single();
    if (!product) return json(res, 404, { error: 'Not found' });
    if (user.role === 'artist' && product.artist_id !== user.id) return json(res, 403, { error: 'Forbidden' });

    const allowed = ['title','price','original_price','category','description','image','cover_image_url','type','pages','tags','active','status','physical_stock','shipping_required'];
    if (user.role === 'admin') allowed.push('featured','bestseller','is_new','digital_download_url','download_instruction','artist_id','artist_name');

    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

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
};
