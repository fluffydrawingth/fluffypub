const { supabase, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { name, email, password, role = 'customer' } = req.body || {};
  if (!name || !email || !password) return json(res, 400, { error: 'Name, email and password required.' });
  if (!['customer', 'artist'].includes(role)) return json(res, 400, { error: 'Invalid role.' });
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role } } });
  if (error) {
    if (error.message.includes('already registered')) return json(res, 409, { error: 'Email already registered.' });
    return json(res, 400, { error: error.message });
  }
  return json(res, 201, {
    success: true,
    token: data.session?.access_token,
    user: { id: data.user?.id, email: data.user?.email, name, role },
  });
};
