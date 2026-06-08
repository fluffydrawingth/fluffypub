const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { slug, id } = req.query;

  // GET single page by slug (public — published only)
  if (req.method === 'GET' && slug) {
    const { data, error } = await supabase
      .from('pages')
      .select('id,title,slug,content,image_url,status,created_at,updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error || !data) return json(res, 404, { error: 'Page not found' });
    return json(res, 200, data);
  }

  // GET all pages (admin)
  if (req.method === 'GET') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase
      .from('pages')
      .select('id,title,slug,content,image_url,status,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[pages GET]', error.message);
      return json(res, 400, { error: error.message });
    }
    return json(res, 200, data || []);
  }

  // POST create
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { title, slug, content, image_url, status = 'draft' } = req.body || {};
    if (!title || !slug) return json(res, 400, { error: 'title and slug required' });
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data, error } = await supabase
      .from('pages')
      .insert({ title, slug: cleanSlug, content: content || '', image_url: image_url || null, status })
      .select('id,title,slug,content,image_url,status,created_at,updated_at')
      .single();
    if (error) {
      console.error('[pages POST]', error.message, error.details, error.hint);
      return json(res, 400, { error: error.message, hint: error.hint });
    }
    return json(res, 201, data);
  }

  // PUT update
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { title, slug, content, image_url, status } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (title     !== undefined) updates.title     = title;
    if (slug      !== undefined) updates.slug      = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (content   !== undefined) updates.content   = content;
    if (image_url !== undefined) updates.image_url = image_url;
    if (status    !== undefined) updates.status    = status;
    const { data, error } = await supabase
      .from('pages')
      .update(updates)
      .eq('id', id)
      .select('id,title,slug,content,image_url,status,created_at,updated_at')
      .single();
    if (error) {
      console.error('[pages PUT]', error.message, error.details, error.hint);
      return json(res, 400, { error: error.message, hint: error.hint });
    }
    return json(res, 200, data);
  }

  // DELETE
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
