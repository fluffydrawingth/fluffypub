const { supabase, getToken, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const token = getToken(req);
  if (token) await supabase.auth.admin.signOut(token).catch(() => {});
  return json(res, 200, { success: true });
};
