const { supabase, requireAuth, json } = require('../_lib');
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) return json(res, 500, { error: error.message });
  return json(res, 200, data);
};
