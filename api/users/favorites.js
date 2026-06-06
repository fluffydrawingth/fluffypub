const { supabase, requireAuth, json } = require('../_lib');
module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;
  const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).single();
  const current = profile?.favorites || [];
  if (req.method === 'GET') return json(res, 200, current);
  const productId = req.query.productId || req.body?.productId;
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
  return json(res, 405, { error: 'Method not allowed' });
};
