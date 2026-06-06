const { supabase, requireAuth, json } = require('../_lib');
module.exports = async function handler(req, res) {
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
  return json(res, 405, { error: 'Method not allowed' });
};
