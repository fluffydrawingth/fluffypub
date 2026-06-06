const { supabase, requireAuth, json } = require('../_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;
  const { data, error } = await supabase.from('profiles').select('id, email, name, role, artist_slug, created_at').order('created_at');
  if (error) return json(res, 500, { error: error.message });
  return json(res, 200, data);
};
