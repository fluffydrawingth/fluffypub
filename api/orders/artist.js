const { supabase, requireAuth, json } = require('../_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['artist']);
  if (!user) return;
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return json(res, 500, { error: error.message });
  const filtered = (data || [])
    .filter(o => o.items.some(i => i.artistId === user.id))
    .map(o => ({ ...o, items: o.items.filter(i => i.artistId === user.id) }));
  return json(res, 200, filtered);
};
