const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;
  const [ordersRes, usersRes, productsRes] = await Promise.all([
    supabase.from('orders').select('total,payment_status,created_at'),
    supabase.from('profiles').select('role'),
    supabase.from('products').select('id').eq('active', true),
  ]);
  const orders = ordersRes.data || [];
  const users = usersRes.data || [];
  const revenue = orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + parseFloat(o.total), 0);
  const today = new Date(); today.setHours(0,0,0,0);
  return json(res, 200, { revenue: Math.round(revenue * 100) / 100, ordersToday: orders.filter(o => new Date(o.created_at) >= today).length, totalOrders: orders.length, totalProducts: (productsRes.data || []).length, totalCustomers: users.filter(u => u.role === 'customer').length, totalArtists: users.filter(u => u.role === 'artist').length });
};
