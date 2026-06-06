// /api/orders
const { supabase, requireAuth, getUser, json } = require('./_lib');

async function sendEmail(to, subject, html) {
  // Simple email via Supabase edge or just log for now
  // In production, integrate with SendGrid/Resend via env
  console.log('EMAIL TO:', to, 'SUBJECT:', subject);
}

module.exports = async function handler(req, res) {
  const { action, id } = req.query;

  // GET my orders
  if (req.method === 'GET' && action === 'my') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const safe = (data || []).map(o => ({
      ...o,
      items: (o.items || []).map(i => ({
        ...i,
        digital_download_url: o.payment_status === 'paid' ? i.digital_download_url : null,
        download_instruction: o.payment_status === 'paid' ? i.download_instruction : null,
      }))
    }));
    return json(res, 200, safe);
  }

  // GET single order by ref
  if (req.method === 'GET' && action === 'ref' && id) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
    if (error || !data) return json(res, 404, { error: 'Order not found' });
    // Shipping: 25 THB for 1 physical book, free for 2+
    const physicalCount = orderItems.filter(i => i.type === 'physical' || i.type === 'both').length;
    const shipping_thb = physicalCount === 1 ? 25 : 0;
    const grand_total_thb = final_thb + shipping_thb;
    const authUser = await getUser(req);
    // Allow if owner or admin
    if (data.user_id && authUser?.id !== data.user_id && authUser?.role !== 'admin') {
      // Allow by guest email match
      if (authUser?.email !== data.customer_email && data.guest_email !== authUser?.email) {
        return json(res, 403, { error: 'Forbidden' });
      }
    }
    return json(res, 200, data);
  }

  // GET artist orders
  if (req.method === 'GET' && action === 'artist') {
    const user = await requireAuth(req, res, ['artist']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const filtered = (data || []).filter(o => (o.items||[]).some(i => i.artistId === user.id))
      .map(o => ({ ...o, items: (o.items||[]).filter(i => i.artistId === user.id) }));
    return json(res, 200, filtered);
  }

  // GET all (admin)
  if (req.method === 'GET' && !action) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  // POST create order
  if (req.method === 'POST' && !action) {
    const { items, customerName, customerEmail, customerPhone, shippingAddress, promoCode, total_thb, total_usd } = req.body || {};
    if (!items?.length || !customerName || !customerEmail) return json(res, 400, { error: 'items, name, email required' });
    const ids = items.map(i => i.productId);
    const { data: products } = await supabase.from('products').select('id,title,price,price_thb,price_usd,image,artist_id,type,is_physical,is_digital,digital_download_url,download_instruction').in('id', ids).eq('active', true);
    if (!products || products.length !== ids.length) return json(res, 400, { error: 'One or more products unavailable.' });

    let subtotal_usd = 0, subtotal_thb = 0;
    const orderItems = products.map(p => {
      const reqItem = items.find(i => i.productId === p.id) || {};
      const usdPrice = parseFloat(p.price_usd || p.price || 0);
      const thbPrice = parseFloat(p.price_thb || (usdPrice * 35)) || 0;
      subtotal_usd += usdPrice;
      subtotal_thb += thbPrice;
      return { productId: p.id, title: p.title, price: usdPrice, price_thb: thbPrice, image: p.image, artistId: p.artist_id, type: p.type || (p.is_physical ? 'physical' : 'digital'), variant: reqItem.variant || null };
    });

    let discount_pct = 0;
    if (promoCode?.toUpperCase() === 'FLUFFY15') discount_pct = 0.15;
    const final_usd = Math.round(subtotal_usd * (1 - discount_pct) * 100) / 100;
    const final_thb = Math.round(subtotal_thb * (1 - discount_pct));
    const hasPhysical = orderItems.some(i => i.type === 'physical' || i.type === 'both');

    // Shipping: 25 THB for 1 physical book, free for 2+
    const physicalCount = orderItems.filter(i => i.type === 'physical' || i.type === 'both').length;
    const shipping_thb = physicalCount === 1 ? 25 : 0;
    const grand_total_thb = final_thb + shipping_thb;
    const authUser = await getUser(req);
    const { data: order, error } = await supabase.from('orders').insert({
      user_id: authUser?.id || null,
      guest_email: authUser ? null : customerEmail,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_address: shippingAddress || null,
      items: orderItems,
      subtotal: subtotal_usd,
      subtotal_thb,
      discount: Math.round(subtotal_usd * discount_pct * 100) / 100,
      total: final_usd,
      total_thb: total_thb || grand_total_thb,
      total_amount: total_thb || grand_total_thb,
      shipping_thb: shipping_thb,
      grand_total_thb: grand_total_thb,
      total_amount: total_thb || final_thb,
      promo_code: promoCode || null,
      status: 'pending_payment',
      payment_status: 'pending',
      type: hasPhysical ? 'physical' : 'digital',
    }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, order);
  }

  // POST upload slip
  if (req.method === 'POST' && action === 'slip' && id) {
    const { slip_url } = req.body || {};
    if (!slip_url) return json(res, 400, { error: 'slip_url required' });
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    const { data, error } = await supabase.from('orders').update({
      slip_url,
      slip_uploaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || 'fluffydrawing.th@gmail.com';
    await sendEmail(adminEmail, `💳 Payment slip uploaded — Order #${id.slice(-8).toUpperCase()}`,
      `<p>Customer <strong>${order.customer_name}</strong> uploaded a payment slip for Order #${id.slice(-8).toUpperCase()}.</p><p>Amount: ฿${order.total_thb || order.total_amount || order.total}</p><p>Slip: <a href="${slip_url}">${slip_url}</a></p>`
    );
    return json(res, 200, data);
  }

  // POST mark paid (admin)
  if (req.method === 'POST' && action === 'pay' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    let enrichedItems = order.items || [];
    if (order.type === 'digital') {
      const productIds = enrichedItems.map(i => i.productId);
      const { data: products } = await supabase.from('products').select('id,digital_download_url,download_instruction').in('id', productIds);
      enrichedItems = enrichedItems.map(item => {
        const p = products?.find(x => x.id === item.productId);
        return { ...item, digital_download_url: p?.digital_download_url || null, download_instruction: p?.download_instruction || null };
      });
    }
    const { data, error } = await supabase.from('orders').update({
      payment_status: 'paid', status: 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: enrichedItems,
    }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // PUT update status/tracking (admin)
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

  // DELETE order (admin)
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
