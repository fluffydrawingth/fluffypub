// /api/products, /api/products?id=xxx
const { supabase, requireAuth, getUser, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const id = req.query.id;

  // GET all products
  if (req.method === 'GET' && !id) {
    const { data, error } = await supabase.from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,description,image,cover_image_url,type,pages,rating,reviews,tags,featured,bestseller,is_new,active,status,shipping_required,created_at').eq('active', true).eq('status', 'published').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  // GET single product by id or slug
  if (req.method === 'GET' && id) {
    const isUuid = /^[0-9a-f-]{36}$/.test(id);
    const query = isUuid
      ? supabase.from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,description,image,cover_image_url,type,pages,rating,reviews,tags,featured,bestseller,is_new,active,status,shipping_required,created_at').eq('id', id)
      : supabase.from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,description,image,cover_image_url,type,pages,rating,reviews,tags,featured,bestseller,is_new,active,status,shipping_required,created_at').eq('slug', id);
    const { data, error } = await query.single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  // POST create
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;
    const { title, price, category, description = '', rich_description, image = '🎨', cover_image_url, type, is_physical = false, is_digital = true, pages = 0, tags = [], original_price, status = 'published', digital_download_url, download_instruction, physical_stock = 0, shipping_required = false, shipping_note = '', artist_id } = req.body || {};
    // derive type from checkboxes if not provided
    const finalType = type || (is_physical && is_digital ? 'both' : is_physical ? 'physical' : 'digital');
    if (!title || !price || !category) return json(res, 400, { error: 'title, price, category required' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const finalArtistId = user.role === 'admin' && artist_id ? artist_id : user.id;
    const { data: artistProfile } = await supabase.from('profiles').select('name, artist_slug').eq('id', finalArtistId).single();
    const { data, error } = await supabase.from('products').insert({ title, slug, price: parseFloat(price), original_price: original_price ? parseFloat(original_price) : null, artist_id: finalArtistId, artist_name: artistProfile?.name || '', artist_slug: artistProfile?.artist_slug || '', category, description, image, cover_image_url: cover_image_url || null, type, pages: parseInt(pages) || 0, tags, status, is_new: true, active: true, digital_download_url: digital_download_url || null, download_instruction: download_instruction || null, physical_stock: parseInt(physical_stock) || 0, shipping_required: Boolean(shipping_required) }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // PUT update
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;
    const { data: product } = await supabase.from('products').select('artist_id').eq('id', id).single();
    if (!product) return json(res, 404, { error: 'Not found' });
    if (user.role === 'artist' && product.artist_id !== user.id) return json(res, 403, { error: 'Forbidden' });
    const allowed = ['title','price','original_price','category','description','rich_description','image','cover_image_url','type','is_physical','is_digital','pages','tags','active','status','physical_stock','shipping_required','shipping_note'];
    if (user.role === 'admin') allowed.push('featured','bestseller','is_new','digital_download_url','download_instruction','artist_id','artist_name');
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const { data, error } = await supabase.from('products').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // DELETE
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;
    const { data: product } = await supabase.from('products').select('artist_id').eq('id', id).single();
    if (!product) return json(res, 404, { error: 'Not found' });
    if (user.role === 'artist' && product.artist_id !== user.id) return json(res, 403, { error: 'Forbidden' });
    await supabase.from('products').update({ active: false }).eq('id', id);
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
