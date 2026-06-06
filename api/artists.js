const { supabase, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const { data: artists } = await supabase.from('profiles').select('id,name,artist_slug,bio').eq('role', 'artist');
  const { data: products } = await supabase.from('products').select('artist_id').eq('active', true);
  const result = (artists || []).map(a => ({ ...a, productCount: (products || []).filter(p => p.artist_id === a.id).length }));
  return json(res, 200, result);
};
