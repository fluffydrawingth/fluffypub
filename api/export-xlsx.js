const { supabase, requireAuth, json } = require('./_lib');
const XLSX = require('xlsx');

const SALES_STATUSES = ['paid', 'packing', 'shipped', 'delivered'];

module.exports = async function handler(req, res) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const { month, year } = req.query;
  const now = new Date();
  const filterYear  = year  ? parseInt(year)  : now.getFullYear();
  const filterMonth = month ? parseInt(month) : now.getMonth() + 1;

  const monthStart = new Date(filterYear, filterMonth - 1, 1);
  const monthEnd   = new Date(filterYear, filterMonth, 1);

  const { data: allOrders } = await supabase
    .from('orders')
    .select('id,created_at,customer_name,customer_phone,customer_email,shipping_address,items,subtotal_thb,shipping_thb,total_thb,total_amount,total,payment_status,status,tracking_number,shipping_provider')
    .order('created_at', { ascending: false });

  const monthOrders = (allOrders || []).filter(o => {
    const d = new Date(o.created_at);
    return d >= monthStart && d < monthEnd;
  });

  // ── Sheet 1: Orders ──────────────────────────────────────────────────────
  const ordersRows = [
    ['Order #','Date','Customer','Phone','Email','Address','Products','Variants','Qty','Subtotal THB','Shipping THB','Total THB','Payment Status','Order Status','Tracking'],
  ];
  for (const o of monthOrders) {
    const sa = o.shipping_address || {};
    const addr = typeof sa === 'string' ? sa : [sa.address, sa.province, sa.postal_code, sa.country].filter(Boolean).join(', ');
    const items = Array.isArray(o.items) ? o.items : [];
    const thb = o.total_thb || o.total_amount || Math.round(parseFloat(o.total || '0') * 35);
    ordersRows.push([
      (o.id || '').slice(-8).toUpperCase(),
      new Date(o.created_at).toLocaleString('th-TH'),
      o.customer_name || '',
      o.customer_phone || '',
      o.customer_email || '',
      addr,
      items.map(i => i.title || '').join(' | '),
      items.map(i => i.optionName || i.variantName || i.variant?.name || '').join(' | '),
      items.map(i => i.qty || 1).join(' | '),
      o.subtotal_thb || 0,
      o.shipping_thb || 0,
      thb,
      o.payment_status || '',
      o.status || '',
      o.tracking_number || '',
    ]);
  }

  // ── Sheet 2: Product Sales Summary ───────────────────────────────────────
  const salesOrders = monthOrders.filter(o => SALES_STATUSES.includes(o.status));
  const salesMap = {};
  for (const o of salesOrders) {
    for (const item of (Array.isArray(o.items) ? o.items : [])) {
      const key = `${item.productId||item.product_id||item.title}__${item.optionName||item.variantName||item.variant?.name||''}`;
      if (!salesMap[key]) {
        salesMap[key] = {
          productName: item.title || '',
          artistName: item.artistName || item.artist_name || '',
          variantName: item.optionName || item.variantName || item.variant?.name || '',
          qty: 0, grossSales: 0, orderIds: new Set(),
        };
      }
      const unitPrice = item.price_thb || item.unitPriceTHB || item.priceTHB || 0;
      salesMap[key].qty += (item.qty || 1);
      salesMap[key].grossSales += unitPrice * (item.qty || 1);
      salesMap[key].orderIds.add(o.id);
    }
  }
  const productSales = Object.values(salesMap)
    .map(s => ({ ...s, grossSales: Math.round(s.grossSales), orderCount: s.orderIds.size }))
    .sort((a, b) => b.qty - a.qty);

  const salesRows = [['Product','Artist','Variant','Qty Sold','Gross Sales (THB)','Order Count']];
  for (const s of productSales) {
    salesRows.push([s.productName, s.artistName, s.variantName, s.qty, s.grossSales, s.orderCount]);
  }
  // Totals row
  salesRows.push([
    'TOTAL', '', '',
    productSales.reduce((s, r) => s + r.qty, 0),
    productSales.reduce((s, r) => s + r.grossSales, 0),
    productSales.reduce((s, r) => s + r.orderCount, 0),
  ]);

  // ── Sheet 3: Artist Summary ───────────────────────────────────────────────
  const artistMap = {};
  for (const s of productSales) {
    const key = s.artistName || '(No Artist)';
    if (!artistMap[key]) {
      artistMap[key] = { artistName: key, unitsSold: 0, grossRevenue: 0, orderCount: 0 };
    }
    artistMap[key].unitsSold   += s.qty;
    artistMap[key].grossRevenue += s.grossSales;
    artistMap[key].orderCount  += s.orderCount;
  }
  const artistSummary = Object.values(artistMap).sort((a, b) => b.grossRevenue - a.grossRevenue);

  const artistRows = [['Artist','Units Sold','Gross Revenue (THB)','Royalty Payout (THB)','Platform Share (THB)']];
  for (const a of artistSummary) {
    artistRows.push([a.artistName, a.unitsSold, a.grossRevenue, '', '']);
  }
  // Totals row
  artistRows.push([
    'TOTAL',
    artistSummary.reduce((s, r) => s + r.unitsSold, 0),
    artistSummary.reduce((s, r) => s + r.grossRevenue, 0),
    '', '',
  ]);

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ordersRows),  'Orders');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows),   'Product Sales');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(artistRows),  'Artist Summary');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const mm = String(filterMonth).padStart(2, '0');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="fluffy-report-${filterYear}-${mm}.xlsx"`);
  res.status(200).end(buf);
};
