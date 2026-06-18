// /api/products, /api/products?id=xxx
const { supabase, requireAuth, getUser, json } = require('./_lib');

const PRODUCT_SELECT = 'id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,categories,description,description_th,description_en,rich_description,image,cover_image_url,type,is_physical,is_digital,pages,rating,reviews,tags,search_keywords,featured,bestseller,is_new,active,status,shipping_required,shipping_note,digital_download_url,download_instruction,physical_stock,variants,title_th,title_en,price_thb,price_usd,r2_key,r2_file_name,file_size,file_type,created_at,artist_physical_royalty_thb,digital_platform_fee_thb,digital_platform_fee_usd';

module.exports = async function handler(req, res) {
  const id = req.query.id;

  // GET /api/products?mine=1 — artist's own products (any status, incl. pending/rejected)
  if (req.method === 'GET' && req.query.mine) {
    const user = await requireAuth(req, res, ['artist']);
    if (!user) return;
    const effectiveArtistId = user.artist_id || user.id;
    const { data, error } = await supabase.from('products').select(PRODUCT_SELECT).eq('artist_id', effectiveArtistId).order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET all products
  if (req.method === 'GET' && !id) {
    const isAdmin = req.query.admin === '1';
    const selectCols = isAdmin ? PRODUCT_SELECT : 'id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,categories,description,description_th,description_en,rich_description,image,cover_image_url,type,is_physical,is_digital,pages,rating,reviews,tags,search_keywords,featured,bestseller,is_new,active,status,shipping_required,shipping_note,digital_download_url,download_instruction,physical_stock,variants,title_th,title_en,price_thb,price_usd,r2_key,r2_file_name,file_size,file_type,created_at';
    // Admin sees all active products regardless of status (draft, pending, published).
    // Public sees only active+published.
    let q = supabase.from('products').select(selectCols).eq('active', true).order('created_at', { ascending: false });
    if (!isAdmin) q = q.eq('status', 'published');
    const { data, error } = await q;
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  // GET single product by id or slug
  if (req.method === 'GET' && id) {
    const isUuid = /^[0-9a-f-]{36}$/.test(id);
    const query = isUuid
      ? supabase.from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,categories,description,description_th,description_en,rich_description,image,cover_image_url,type,is_physical,is_digital,pages,rating,reviews,tags,search_keywords,featured,bestseller,is_new,active,status,shipping_required,shipping_note,digital_download_url,download_instruction,physical_stock,variants,title_th,title_en,price_thb,price_usd,r2_key,r2_file_name,file_size,file_type,created_at').eq('id', id)
      : supabase.from('products').select('id,title,slug,price,original_price,artist_id,artist_name,artist_slug,category,categories,description,description_th,description_en,rich_description,image,cover_image_url,type,is_physical,is_digital,pages,rating,reviews,tags,search_keywords,featured,bestseller,is_new,active,status,shipping_required,shipping_note,digital_download_url,download_instruction,physical_stock,variants,title_th,title_en,price_thb,price_usd,r2_key,r2_file_name,file_size,file_type,created_at').eq('slug', id);
    const { data, error } = await query.single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  // POST create
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['artist', 'admin']);
    if (!user) return;
    const { title, price, category, categories, description = '', rich_description, image = '🎨', cover_image_url, type, is_physical = false, is_digital = true, pages = 0, tags = [], original_price, status = 'published', digital_download_url, download_instruction, physical_stock = 0, shipping_required = false, shipping_note = '', artist_id } = req.body || {};
    // derive type from checkboxes if not provided
    // DB constraint: type only allows 'digital' or 'physical'
    // Use is_physical/is_digital boolean fields for 'both' products
    const finalType = type && (type === 'digital' || type === 'physical') ? type
      : is_physical ? 'physical' : 'digital';
    if (!title || !price || !category) return json(res, 400, { error: 'title, price, category required' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    const finalArtistId = user.role === 'admin' && artist_id ? artist_id : user.id;
    // Artists are stored in profiles table (role='artist')
    // Use artist_slug as display name if set, otherwise use name
    const { data: artistProfile } = await supabase
      .from('profiles')
      .select('name, artist_slug')
      .eq('id', finalArtistId)
      .single();
    // Use artist.name as display name (e.g. "Fluffy Drawing"), slug only for URL routing
    const artistName = artistProfile?.name || artistProfile?.artist_slug || '';
    const artistSlug = artistProfile?.artist_slug || '';
    const { search_keywords } = req.body;
    const { data, error } = await supabase.from('products').insert({ title, slug, price: parseFloat(price), original_price: original_price ? parseFloat(original_price) : null, artist_id: finalArtistId, artist_name: artistName, artist_slug: artistSlug, category, categories: categories && categories.length ? categories : (category ? [category] : []), description, rich_description: rich_description || null, image, cover_image_url: cover_image_url || null, type: finalType, is_physical: Boolean(is_physical), is_digital: Boolean(is_digital), pages: parseInt(pages) || 0, tags, search_keywords: search_keywords || null, status, is_new: true, active: true, digital_download_url: digital_download_url || null, download_instruction: download_instruction || null, physical_stock: parseInt(physical_stock) || 0, shipping_required: Boolean(shipping_required), shipping_note: shipping_note || '', variants: [] }).select().single();
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
    const allowed = ['title','price','original_price','category','categories','description','description_th','description_en','rich_description','image','cover_image_url','type','is_physical','is_digital','pages','tags','search_keywords','active','status','physical_stock','shipping_required','shipping_note','variants','title_th','title_en','price_thb','price_usd'];
    if (user.role === 'admin') allowed.push('featured','bestseller','is_new','digital_download_url','download_instruction','artist_id','artist_name','r2_key','r2_file_name','file_size','file_type','artist_physical_royalty_thb','digital_platform_fee_thb','digital_platform_fee_usd');
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    // Recalculate type string from boolean fields
    if (updates.is_physical !== undefined || updates.is_digital !== undefined) {
      const ip = updates.is_physical !== undefined ? Boolean(updates.is_physical) : false;
      const id = updates.is_digital !== undefined ? Boolean(updates.is_digital) : true;
      // DB only allows 'digital' or 'physical'; use is_physical/is_digital for 'both'
      updates.type = ip ? 'physical' : 'digital';
    }
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
