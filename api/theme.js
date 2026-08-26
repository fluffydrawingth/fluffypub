const { supabase, requireAuth, json, jsonPublic } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    // Identical response for every caller (no admin variant) — safe to
    // edge-cache. Matches the client's own cfetch(..., TTL_LONG) 5-minute
    // window, see src/lib/api.ts.
    const { data } = await supabase.from('theme').select('config').eq('id', 1).single();
    return jsonPublic(res, 200, data?.config || {}, 300);
  }
  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('theme').update({ config: req.body, updated_at: new Date().toISOString() }).eq('id', 1).select('config').single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data.config);
  }
  return json(res, 405, { error: 'Method not allowed' });
};
