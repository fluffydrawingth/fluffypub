const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { id } = req.query;

  // GET all active categories (public)
  if (req.method === 'GET' && !id) {
    const isAdmin = req.headers.authorization ? true : false;
    let q = supabase.from('categories').select('*').order('sort_order').order('name');
    // Public only sees active; admin sees all
    const user = req.headers.authorization ? (await require('./_lib').getUser(req)) : null;
    if (!user || user.role !== 'admin') q = q.eq('active', true);
    const { data, error } = await q;
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // POST create
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { name, slug, icon, icon_type = 'emoji', active = true, sort_order = 0 } = req.body || {};
    if (!name) return json(res, 400, { error: 'name required' });
    const cleanSlug = (slug || name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data, error } = await supabase.from('categories')
      .insert({ name, slug: cleanSlug, icon: icon || '🎨', icon_type, active, sort_order })
      .select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // PUT update
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { name, slug, icon, icon_type, active, sort_order } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (name       !== undefined) updates.name       = name;
    if (slug       !== undefined) updates.slug       = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (icon       !== undefined) updates.icon       = icon;
    if (icon_type  !== undefined) updates.icon_type  = icon_type;
    if (active     !== undefined) updates.active     = active;
    if (sort_order !== undefined) updates.sort_order = sort_order;
    const { data, error } = await supabase.from('categories').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // DELETE
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
