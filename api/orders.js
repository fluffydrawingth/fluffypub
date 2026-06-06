// /api/orders?action=list|my|artist|pay&id=xxx
const { supabase, requireAuth, getUser, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { action, id } = req.query;

  // GET /api/orders?action=my
  if (req.method === 'GET' && action === 'my') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const safe = (data || []).map(o => ({ ...o, items: o.items.map((i) => ({ ...i, digital_download_url: o.payment_status === 'paid' ? i.digital_download_url : null, download_instruction: o.payment_status === 'paid' ? i.download_instruction : null })) }));
    return json(res, 200, safe);
  }

  // GET /api/orders?action=artist
  if (req.method === 'GET' && action === 'artist') {
    const user = await requireAuth(req, res, ['artist']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const filtered = (data || []).filter(o => o.items.some(i => i.artistId === user.id)).map(o => ({ ...o, items: o.items.filter(i => i.artistId === user.id) }));
    return json(res, 200, filtered);
  }

  // GET /api/orders (admin all)
  if (req.method === 'GET' && !action) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  // POST /api/orders (create)
  if (req.method === 'POST' && !action) {
    const { items, customerName, customerEmail, customerPhone, shippingAddress, promoCode } = req.body || {};
    if (!items?.length || !customerName || !customerEmail) return json(res, 400, { error: 'items, name, email required' });
    const ids = items.map(i => i.productId);
    const { data: products } = await supabase.from('products').select('id,title,price,image,artist_id,type,digital_download_url,download_instruction').in('id', ids).eq('active', true);
    if (!products || products.length !== ids.length) return json(res, 400, { error: 'One or more products unavailable.' });
    let subtotal = 0;
    const orderItems = products.map(p => { subtotal += parseFloat(p.price); return { productId: p.id, title: p.title, price: p.price, image: p.image, artistId: p.artist_id, type: p.type || 'digital' }; });
    let discount = 0;
    if (promoCode?.toUpperCase() === 'FLUFFY15') discount = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;
    const hasPhysical = orderItems.some(i => i.type === 'physical');
    if (hasPhysical && (!customerPhone || !shippingAddress)) return json(res, 400, { error: 'Phone and shipping address required for physical products.' });
    const authUser = await getUser(req);
    const { data: order, error } = await supabase.from('orders').insert({ user_id: authUser?.id || null, guest_email: authUser ? null : customerEmail, customer_name: customerName, customer_email: customerEmail, customer_phone: customerPhone || null, shipping_address: shippingAddress || null, items: orderItems, subtotal: Math.round(subtotal * 100) / 100, discount, total, promo_code: promoCode || null, status: 'pending_payment', payment_status: 'pending', type: hasPhysical ? 'physical' : 'digital' }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, order);
  }

  // POST /api/orders?action=pay&id=xxx (admin marks as paid)
  if (req.method === 'POST' && action === 'pay' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    const { data, error } = await supabase.from('orders').update({ payment_status: 'paid', status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return json(res, 404, { error: 'Order not found' });
    if (order.type === 'digital') {
      const productIds = order.items.map(i => i.productId);
      const { data: products } = await supabase.from('products').select('id,digital_download_url,download_instruction').in('id', productIds);
      const enrichedItems = order.items.map(item => { const p = products?.find(x => x.id === item.productId); return { ...item, digital_download_url: p?.digital_download_url || null, download_instruction: p?.download_instruction || null }; });
      await supabase.from('orders').update({ items: enrichedItems }).eq('id', id);
      data.items = enrichedItems;
    }
    return json(res, 200, data);
  }

  // PUT /api/orders?id=xxx (admin update status/tracking)
  if (req.method === 'PUT' && id) {
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
