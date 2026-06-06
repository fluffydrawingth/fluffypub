// Admin-only: mark order as paid
const { supabase, requireAuth, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  // Only admin can mark orders as paid
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const id = req.query.id || req.body?.id;
  if (!id) return json(res, 400, { error: 'Order id required' });

  // Get the order
  const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
  if (!order) return json(res, 404, { error: 'Order not found' });

  // Determine new status based on order type
  const newStatus = order.type === 'digital' ? 'paid' : 'paid';

  const { data, error } = await supabase.from('orders')
    .update({
      payment_status: 'paid',
      status: newStatus,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id).select().single();

  if (error) return json(res, 404, { error: 'Order not found' });

  // For digital orders, attach download info from products
  if (order.type === 'digital') {
    const productIds = order.items.map((i) => i.productId);
    const { data: products } = await supabase
      .from('products')
      .select('id, title, digital_download_url, download_instruction')
      .in('id', productIds);

    // Enrich order items with download info
    const enrichedItems = order.items.map((item) => {
      const product = products?.find(p => p.id === item.productId);
      return {
        ...item,
        digital_download_url: product?.digital_download_url || null,
        download_instruction: product?.download_instruction || null,
      };
    });

    // Update order with enriched items
    await supabase.from('orders').update({ items: enrichedItems }).eq('id', id);
    data.items = enrichedItems;
  }

  return json(res, 200, data);
};
