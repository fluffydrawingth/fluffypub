// /api/orders
const { supabase, requireAuth, getUser, json } = require('./_lib');

async function sendEmail(to, subject, html) {
  // Use Resend API if configured, otherwise log
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.EMAIL_FROM || 'noreply@fluffypub.vercel.app';
  if (!RESEND_KEY) {
    console.log('[EMAIL] No RESEND_API_KEY. Would send to:', to, 'Subject:', subject);
    return;
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
      body: JSON.stringify({ from: `Fluffy Pub <${FROM}>`, to, subject, html }),
    });
  } catch(e) { console.error('Email send failed:', e.message); }
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
    const { items, customerName, customerEmail, customerPhone, shippingAddress, promoCode, total_thb, shipping_thb: shippingFromCart, subtotal_thb } = req.body || {};
    if (!items?.length || !customerName || !customerEmail) return json(res, 400, { error: 'items, name, email required' });

    // Validate products exist and get image/artist data only (do NOT override prices or types)
    const ids = [...new Set(items.map(i => i.productId))];
    const { data: products } = await supabase
      .from('products')
      .select('id,title,image,artist_id,artist_name,digital_download_url,download_instruction')
      .in('id', ids);
    const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));

    // Build order items from CART SNAPSHOT — preserve exact optionType, optionName, price, qty
    const orderItems = items.map(cartItem => {
      const prod = productMap[cartItem.productId] || {};
      const qty = cartItem.qty || 1;
      const unitPriceTHB = cartItem.unitPriceTHB || 0;
      return {
        productId: cartItem.productId,
        title: prod.title || cartItem.title || '',
        image: prod.image || '📚',
        artistId: prod.artist_id || null,
        artistName: prod.artist_name || '',
        // SNAPSHOT — these come from cart, never recalculated
        optionId: cartItem.optionId || '',
        optionName: cartItem.optionName || '',
        optionType: cartItem.optionType || 'physical',  // 'digital' | 'physical'
        unitPriceTHB,
        qty,
        lineTotalTHB: unitPriceTHB * qty,
        // Digital download links (unlocked after payment)
        digital_download_url: null,
        download_instruction: null,
      };
    });

    // Use totals from cart (already calculated correctly on frontend)
    const shipping_thb = shippingFromCart || 0;
    const grand_total_thb = total_thb || (subtotal_thb + shipping_thb);
    const hasPhysical = orderItems.some(i => i.optionType === 'physical');

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
    // Send confirmation emails
    const SITE = process.env.SITE_URL || 'https://fluffypub.vercel.app';
    const orderRef = (order.id || '').slice(-8).toUpperCase();
    const adminEmail = process.env.ADMIN_EMAIL || 'fluffydrawing.th@gmail.com';
    const thbAmount = order.total_thb || order.total_amount || (parseFloat(order.total||'0') * 35);

    // Email customer
    await sendEmail(customerEmail, `✅ คำสั่งซื้อ #${orderRef} รับแล้ว — Fluffy Pub`,
      `<div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>🐰 ขอบคุณสำหรับการสั่งซื้อ!</h2>
        <p>เลขที่คำสั่งซื้อ: <strong>#${orderRef}</strong></p>
        <p>ยอดชำระ: <strong>฿${Number(thbAmount).toLocaleString('th-TH')}</strong></p>
        <h3>วิธีชำระเงิน PromptPay</h3>
        <p>โอนเงินผ่าน PromptPay แล้วอัปโหลดสลิปที่:</p>
        <p><a href="${SITE}/#/account/orders">${SITE}/#/account/orders</a></p>
        <p>หลังจากยืนยันการชำระเงิน ทีมงานจะดำเนินการต่อภายใน 24 ชม.</p>
        <hr/><p style="color:#888;font-size:12px">Fluffy Pub — adorable coloring books 🌸</p>
      </div>`
    );

    // Email admin
    await sendEmail(adminEmail, `🛍️ New Order #${orderRef} — ฿${Number(thbAmount).toLocaleString('th-TH')}`,
      `<p><strong>New order received!</strong></p>
       <p>Order: #${orderRef}</p>
       <p>Customer: ${customerName} (${customerEmail})</p>
       <p>Phone: ${customerPhone||'-'}</p>
       <p>Amount: ฿${Number(thbAmount).toLocaleString('th-TH')}</p>
       <p>Items: ${orderItems.map(i=>`${i.title}${i.variant?` (${i.variant.name})`:''}`).join(', ')}</p>
       <p><a href="${SITE}/#/admin/orders">View in Admin →</a></p>`
    );

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
    // Notify admin of slip upload
    const adminEmail2 = process.env.ADMIN_EMAIL || 'fluffydrawing.th@gmail.com';
    const SITE2 = process.env.SITE_URL || 'https://fluffypub.vercel.app';
    const ref2 = (order.id||'').slice(-8).toUpperCase();
    const thb2 = order.total_thb || order.total_amount || (parseFloat(order.total||'0')*35);
    await sendEmail(adminEmail2, `💳 Payment Slip Uploaded — Order #${ref2}`,
      `<p><strong>${order.customer_name}</strong> uploaded a payment slip.</p>
       <p>Order: #${ref2} — ฿${Number(thb2).toLocaleString('th-TH')}</p>
       <p>Slip: <a href="${slip_url}">${slip_url}</a></p>
       <p><a href="${SITE2}/#/admin/orders">Review in Admin →</a></p>`
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

  // POST cancel order (customer — only if pending_payment and no slip uploaded)
  if (req.method === 'POST' && action === 'cancel' && id) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    // Only owner or admin can cancel
    if (order.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
    // Block cancel if slip uploaded or already paid/processing
    if (order.slip_url) return json(res, 400, { error: 'Cannot cancel: payment slip already uploaded.' });
    if (['paid','packing','shipped','delivered'].includes(order.status)) return json(res, 400, { error: `Cannot cancel: order is already ${order.status}.` });
    const { data, error } = await supabase.from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // POST send payment reminder (admin)
  if (req.method === 'POST' && action === 'reminder') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { orderIds } = req.body || {};
    if (!orderIds?.length) return json(res, 400, { error: 'orderIds required' });
    const SITE = process.env.SITE_URL || 'https://fluffypub.vercel.app';
    const results = [];
    for (const oid of orderIds) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', oid).single();
      if (!order) { results.push({ id: oid, error: 'Not found' }); continue; }
      // Send reminder email
      const ref = (order.id || '').slice(-8).toUpperCase();
      const amt = order.total_thb || order.total_amount || (parseFloat(order.total || '0') * 35);
      await sendEmail(
        order.customer_email,
        `⏰ แจ้งเตือน: รอชำระเงินคำสั่งซื้อ #${ref} — Fluffy Pub`,
        `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:20px">
          <h2>⏰ แจ้งเตือนการชำระเงิน</h2>
          <p>คำสั่งซื้อของคุณ <strong>#${ref}</strong> ยังรอการชำระเงินอยู่</p>
          <p>ยอดชำระ: <strong>฿${Number(amt).toLocaleString('th-TH')}</strong></p>
          <h3>วิธีชำระเงิน:</h3>
          <ol>
            <li>โอนเงินผ่าน PromptPay ตามยอดที่ระบุ</li>
            <li>ถ่ายรูปสลิปการโอนเงิน</li>
            <li>อัปโหลดสลิปที่: <a href="${SITE}/#/account/orders">${SITE}/#/account/orders</a></li>
          </ol>
          <p><em>หากชำระเงินแล้ว กรุณาอัปโหลดสลิป หรือติดต่อแอดมินพร้อมระบุเลขที่คำสั่งซื้อ #${ref}</em></p>
          <hr/><p style="color:#888;font-size:12px">Fluffy Pub 🌸</p>
        </div>`
      );
      // Mark reminder sent
      await supabase.from('orders').update({ payment_reminder_sent_at: new Date().toISOString() }).eq('id', oid);
      results.push({ id: oid, sent: true });
    }
    return json(res, 200, { results });
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
