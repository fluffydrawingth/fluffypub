const { requireAuth, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  return json(res, 200, user);
};
