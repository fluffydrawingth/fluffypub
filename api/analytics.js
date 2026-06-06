const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const [ordersRes, usersRes, productsRes] = await Promise.all([
    supabase.from('orders').select('total,total_thb,payment_status,status,created_at'),
    supabase.from('profiles').select('role'),
    supabase.from('products').select('id').eq('active', true),
  ]);

  const orders = ordersRes.data || [];
  const users = usersRes.data || [];
  const today = new Date(); today.setHours(0,0,0,0);
  const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0);

  // Revenue in THB (prefer total_thb, fallback to total*35)
  const revenue_thb = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((s, o) => s + (parseFloat(o.total_thb) || parseFloat(o.total) * 35 || 0), 0);
  const revenue_usd = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((s, o) => s + (parseFloat(o.total) || 0), 0);

  return json(res, 200, {
    revenue_thb: Math.round(revenue_thb),
    revenue_usd: Math.round(revenue_usd * 100) / 100,
    revenue: Math.round(revenue_usd * 100) / 100, // legacy
    ordersToday: orders.filter(o => new Date(o.created_at) >= today).length,
    ordersThisMonth: orders.filter(o => new Date(o.created_at) >= thisMonth).length,
    totalOrders: orders.length,
    totalProducts: (productsRes.data || []).length,
    totalCustomers: users.filter(u => u.role === 'customer').length,
    totalArtists: users.filter(u => u.role === 'artist').length,
    byStatus: {
      pending_payment: orders.filter(o => o.status === 'pending_payment').length,
      paid: orders.filter(o => o.status === 'paid').length,
      packing: orders.filter(o => o.status === 'packing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    },
  });
};
