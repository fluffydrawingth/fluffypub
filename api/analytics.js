const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const { month, year, export: exportCsv } = req.query;

  // Fetch ALL orders with full data for export or filtering
  const { data: allOrders } = await supabase
    .from('orders')
    .select('id,created_at,customer_name,customer_phone,customer_email,shipping_address,items,subtotal_thb,shipping_thb,total_thb,total_amount,total,payment_status,status,tracking_number,shipping_provider')
    .order('created_at', { ascending: false });

  const orders = allOrders || [];

  // Determine month range
  const now = new Date();
  const filterYear  = year  ? parseInt(year)  : now.getFullYear();
  const filterMonth = month ? parseInt(month) : now.getMonth() + 1; // 1-12

  const monthStart = new Date(filterYear, filterMonth - 1, 1);
  const monthEnd   = new Date(filterYear, filterMonth, 1);

  const monthOrders = orders.filter(o => {
    const d = new Date(o.created_at);
    return d >= monthStart && d < monthEnd;
  });

  // CSV Export
  if (exportCsv) {
    const rows = [
      ['Order Number','Date','Customer Name','Phone','Email','Address','Products','Variants','Quantity','Subtotal THB','Shipping THB','Total THB','Payment Status','Order Status','Tracking Number'],
    ];
    for (const o of monthOrders) {
      const sa = o.shipping_address || {};
      const addr = typeof sa === 'string' ? sa : [sa.address, sa.province, sa.postal_code, sa.country].filter(Boolean).join(', ');
      const items = o.items || [];
      const products  = items.map((i) => i.title || '').join(' | ');
      const variants  = items.map((i) => i.optionName || i.variant?.name || '').join(' | ');
      const quantities = items.map((i) => i.qty || 1).join(' | ');
      const thb = o.total_thb || o.total_amount || (parseFloat(o.total || '0') * 35);
      rows.push([
        (o.id || '').slice(-8).toUpperCase(),
        new Date(o.created_at).toLocaleString('th-TH'),
        o.customer_name || '',
        o.customer_phone || '',
        o.customer_email || '',
        addr,
        products,
        variants,
        quantities,
        String(o.subtotal_thb || 0),
        String(o.shipping_thb || 0),
        String(thb),
        o.payment_status || '',
        o.status || '',
        o.tracking_number || '',
      ]);
    }
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${filterYear}-${String(filterMonth).padStart(2,'0')}.csv"`);
    res.status(200).end('\uFEFF' + csv); // BOM for Thai chars in Excel
    return;
  }

  // Stats for selected month
  const paid = monthOrders.filter(o => o.payment_status === 'paid');
  const revenue_thb = paid.reduce((s, o) => s + (parseFloat(o.total_thb) || parseFloat(o.total_amount) || (parseFloat(o.total || '0') * 35) || 0), 0);

  const today = new Date(); today.setHours(0,0,0,0);
  const [usersRes, productsRes] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('products').select('id').eq('active', true),
  ]);

  return json(res, 200, {
    month: filterMonth,
    year: filterYear,
    revenue_thb: Math.round(revenue_thb),
    ordersToday: orders.filter(o => new Date(o.created_at) >= today).length,
    ordersThisMonth: monthOrders.length,
    totalOrders: orders.length,
    totalProducts: (productsRes.data || []).length,
    totalCustomers: (usersRes.data || []).filter(u => u.role === 'customer').length,
    totalArtists:   (usersRes.data || []).filter(u => u.role === 'artist').length,
    byStatus: {
      pending_payment: monthOrders.filter(o => o.status === 'pending_payment').length,
      paid:            monthOrders.filter(o => o.status === 'paid').length,
      packing:         monthOrders.filter(o => o.status === 'packing').length,
      shipped:         monthOrders.filter(o => o.status === 'shipped').length,
      delivered:       monthOrders.filter(o => o.status === 'delivered').length,
      cancelled:       monthOrders.filter(o => o.status === 'cancelled').length,
    },
    recentOrders: monthOrders.slice(0, 8),
  });
};
