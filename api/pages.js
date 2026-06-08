const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { slug, id, homepage } = req.query;

  // GET homepage pages (public — published + show_on_homepage)
  if (req.method === 'GET' && homepage) {
    const { data, error } = await supabase
      .from('pages')
      .select('id,title,slug,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at')
      .eq('status', 'published')
      .eq('show_on_homepage', true)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET all published pages index (public)
  if (req.method === 'GET' && !slug && !id) {
    const user = req.headers.authorization ? (await require('./_lib').getUser(req)) : null;
    let q = supabase
      .from('pages')
      .select('id,title,slug,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at')
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (!user || user.role !== 'admin') q = q.eq('status', 'published');
    const { data, error } = await q;
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET single page by slug (public — published only)
  if (req.method === 'GET' && slug) {
    const { data, error } = await supabase
      .from('pages')
      .select('id,title,slug,content,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error || !data) return json(res, 404, { error: 'Page not found' });
    return json(res, 200, data);
  }

  // POST create
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { title, slug, content, excerpt, image_url, status = 'draft', show_on_homepage = false, sort_order = 0 } = req.body || {};
    if (!title || !slug) return json(res, 400, { error: 'title and slug required' });
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data, error } = await supabase.from('pages')
      .insert({ title, slug: cleanSlug, content: content || '', excerpt: excerpt || null, image_url: image_url || null, status, show_on_homepage, sort_order })
      .select().single();
    if (error) { console.error('[pages POST]', error.message, error.hint); return json(res, 400, { error: error.message, hint: error.hint }); }
    return json(res, 201, data);
  }

  // PUT update
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { title, slug, content, excerpt, image_url, status, show_on_homepage, sort_order } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (title            !== undefined) updates.title            = title;
    if (slug             !== undefined) updates.slug             = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (content          !== undefined) updates.content          = content;
    if (excerpt          !== undefined) updates.excerpt          = excerpt;
    if (image_url        !== undefined) updates.image_url        = image_url;
    if (status           !== undefined) updates.status           = status;
    if (show_on_homepage !== undefined) updates.show_on_homepage = show_on_homepage;
    if (sort_order       !== undefined) updates.sort_order       = sort_order;
    const { data, error } = await supabase.from('pages').update(updates).eq('id', id)
      .select('id,title,slug,content,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at').single();
    if (error) { console.error('[pages PUT]', error.message, error.hint); return json(res, 400, { error: error.message, hint: error.hint }); }
    return json(res, 200, data);
  }

  // DELETE
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
