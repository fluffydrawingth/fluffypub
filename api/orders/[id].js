const { supabase, requireAuth, json } = require('../_lib');
module.exports = async function handler(req, res) {
  const { id } = req.query;
  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { status, tracking_number, shipping_provider } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (tracking_number) updates.tracking_number = tracking_number;
    if (shipping_provider) updates.shipping_provider = shipping_provider;
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) return json(res, 404, { error: 'Order not found' });
    return json(res, 200, data);
  }
  return json(res, 405, { error: 'Method not allowed' });
};
