// /api/users?action=me|list|favorites&productId=xxx
const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { action, productId } = req.query;

  if (action === 'me') {
    if (req.method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;
      return json(res, 200, user);
    }
    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const { name, bio } = req.body || {};
      const updates = { updated_at: new Date().toISOString() };
      if (name) updates.name = name;
      if (bio !== undefined) updates.bio = bio;
      const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id).select().single();
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, data);
    }
  }

  if (action === 'favorites') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).single();
    const current = profile?.favorites || [];
    if (req.method === 'GET') return json(res, 200, current);
    if (req.method === 'POST') {
      const updated = current.includes(productId) ? current : [...current, productId];
      await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
      return json(res, 200, { favorites: updated });
    }
    if (req.method === 'DELETE') {
      const updated = current.filter(id => id !== productId);
      await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
      return json(res, 200, { favorites: updated });
    }
  }

  // GET /api/users (admin list all)
  if (req.method === 'GET' && !action) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('id,email,name,role,artist_slug,created_at').order('created_at');
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
};
