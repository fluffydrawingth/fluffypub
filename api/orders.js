// /api/orders
const { supabase, requireAuth, getUser, json } = require('./_lib');

const SITE = process.env.SITE_URL || 'https://fluffypub.vercel.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fluffydrawing.th@gmail.com';

// ── Email helpers ────────────────────────────────────────────────────────────

function emailWrapper(bodyHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#fdf2f8;font-family:'Nunito',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;padding:32px 16px">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;borderRadius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(244,114,182,0.12)">
  <tr><td style="background:linear-gradient(135deg,#fce7f3,#fdf4ff);padding:28px 32px;text-align:center;border-bottom:2px solid #f9a8d4">
    <div style="font-size:28px;margin-bottom:6px">🐰</div>
    <div style="font-size:22px;font-weight:900;color:#f472b6;letter-spacing:-0.5px">Fluffy Pub</div>
    <div style="font-size:12px;color:#c084fc;font-weight:600;margin-top:2px">adorable coloring books 🌸</div>
  </td></tr>
  <tr><td style="padding:28px 32px">${bodyHtml}</td></tr>
  <tr><td style="background:#fafafa;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="margin:0;font-size:11px;color:#9ca3af">Fluffy Pub · <a href="${SITE}" style="color:#f472b6;text-decoration:none">${SITE}</a></p>
    <p style="margin:4px 0 0;font-size:11px;color:#d1d5db">© ${new Date().getFullYear()} Fluffy Pub. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function orderItemsHtml(items) {
  return (items || []).map(i => {
    const isDigital = (i.optionType || i.type) === 'digital';
    const qty = i.qty || 1;
    const price = i.unitPriceTHB || i.price_thb || 0;
    const line = i.lineTotalTHB || price * qty;
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 0;font-size:13px">
        <div style="font-weight:700;color:#111827">${i.title || ''}</div>
        ${i.optionName ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">📌 ${i.optionName}</div>` : ''}
        <div style="font-size:11px;color:${isDigital?'#1d4ed8':'#065f46'};font-weight:600;margin-top:3px">${isDigital?'⬇️ Digital':'📦 Physical'} · Qty: ${qty}</div>
      </td>
      <td style="padding:10px 0;text-align:right;font-weight:800;color:#111827;font-size:13px">฿${Number(line).toLocaleString('th-TH')}</td>
    </tr>`;
  }).join('');
}

function orderSummaryHtml(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  const shipping = order.shipping_thb || 0;
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      ${orderItemsHtml(order.items)}
    </table>
    ${shipping > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px"><span>Shipping</span><span>฿${Number(shipping).toLocaleString('th-TH')}</span></div>` : ''}
    <div style="border-top:2px solid #f3f4f6;padding-top:10px;display:flex;justify-content:space-between;font-weight:900;font-size:16px;color:#111827">
      <span>Total</span><span style="color:#f472b6">฿${Number(total).toLocaleString('th-TH')}</span>
    </div>`;
}

// Templates ─────────────────────────────────────────────────────────────────

function tplOrderCreated(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  return emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">🎉 ขอบคุณสำหรับการสั่งซื้อ!</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:13px">Thank you for your order! We've received it and are waiting for payment.</p>
    <div style="background:#fdf2f8;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #f9a8d4">
      <div style="font-size:12px;color:#9ca3af;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">ORDER NUMBER</div>
      <div style="font-size:22px;font-weight:900;color:#f472b6">#${ref}</div>
    </div>
    <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">รายการสินค้า / Items</h3>
    ${orderSummaryHtml(order)}
    <div style="background:#fef3c7;border-radius:12px;padding:16px;margin-top:20px;border:1px solid #fcd34d">
      <div style="font-weight:700;color:#92400e;font-size:14px;margin-bottom:8px">💳 วิธีชำระเงิน / Payment Instructions</div>
      <ol style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:1.8">
        <li>โอนเงินผ่าน PromptPay ตามยอดที่ระบุ</li>
        <li>ถ่ายรูปสลิปการโอนเงิน</li>
        <li>อัปโหลดสลิปในหน้าคำสั่งซื้อ</li>
      </ol>
      <a href="${SITE}/account/orders" style="display:inline-block;margin-top:12px;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">📱 ดูคำสั่งซื้อ / View Order →</a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">หลังจากยืนยันการชำระเงิน ทีมงานจะดำเนินการต่อภายใน 24 ชม. 🌸</p>
  `);
}

function tplAdminNewOrder(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  return emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:18px">🛍️ New Order Received</h2>
    <div style="background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:14px 0;border:1px solid #86efac">
      <div style="font-weight:700;color:#065f46;font-size:14px">#${ref} · ฿${Number(total).toLocaleString('th-TH')}</div>
      <div style="font-size:12px;color:#374151;margin-top:4px">👤 ${order.customer_name} · ${order.customer_email}</div>
      ${order.customer_phone ? `<div style="font-size:12px;color:#374151">📞 ${order.customer_phone}</div>` : ''}
    </div>
    ${orderSummaryHtml(order)}
    <a href="${SITE}/admin" style="display:inline-block;margin-top:16px;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">⚙️ View in Admin →</a>
  `);
}

function tplPaymentReminder(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  return emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">⏰ แจ้งเตือนการชำระเงิน</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">คำสั่งซื้อของคุณยังรอการชำระเงินอยู่ / Your order is still awaiting payment.</p>
    <div style="background:#fef3c7;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #fcd34d">
      <div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px">คำสั่งซื้อ / ORDER</div>
      <div style="font-size:22px;font-weight:900;color:#d97706">#${ref}</div>
      <div style="font-size:18px;font-weight:800;color:#92400e;margin-top:4px">฿${Number(total).toLocaleString('th-TH')}</div>
    </div>
    <p style="font-size:13px;color:#374151;margin:0 0 12px">กรุณาชำระเงินเพื่อยืนยันคำสั่งซื้อของคุณ / Please complete payment to confirm your order.</p>
    <a href="${SITE}/account/orders" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:12px 24px;border-radius:20px;font-weight:700;font-size:14px">💳 ชำระเงินตอนนี้ / Pay Now →</a>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">หากต้องการยกเลิก กรุณาติดต่อเรา / To cancel, please contact us. 🌸</p>
  `);
}

function tplPaymentConfirmed(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  return emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">✅ ยืนยันการชำระเงินแล้ว!</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">Payment confirmed! We're preparing your order. 🌸</p>
    <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #86efac">
      <div style="font-size:12px;color:#065f46;font-weight:700;margin-bottom:4px">คำสั่งซื้อ / ORDER</div>
      <div style="font-size:22px;font-weight:900;color:#059669">#${ref}</div>
      <div style="font-size:12px;color:#374151;margin-top:6px">🎁 กำลังเตรียมสินค้า / Preparing your items...</div>
    </div>
    <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">รายการสินค้า / Items</h3>
    ${orderSummaryHtml(order)}
    <a href="${SITE}/account/orders" style="display:inline-block;margin-top:16px;background:#059669;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">📦 ติดตามคำสั่งซื้อ / Track Order →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">ทีมงานจะดำเนินการจัดส่งภายใน 1-3 วันทำการ 🌸</p>
  `);
}

function tplAdminPaymentConfirmed(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  return emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:18px">💰 Payment Received</h2>
    <div style="background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:14px 0;border:1px solid #86efac">
      <div style="font-weight:700;color:#065f46;font-size:14px">#${ref} · ฿${Number(total).toLocaleString('th-TH')}</div>
      <div style="font-size:12px;color:#374151;margin-top:4px">👤 ${order.customer_name} · ${order.customer_email}</div>
    </div>
    <p style="font-size:13px;color:#374151">Payment confirmed. Order is ready for fulfillment.</p>
    <a href="${SITE}/admin" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">⚙️ Fulfill Order →</a>
  `);
}

function tplTrackingAdded(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const tracking = order.tracking_number;
  const provider = order.shipping_provider || 'Thailand Post';
  return emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">🚚 สินค้าถูกจัดส่งแล้ว!</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">Your order has been shipped! 📦</p>
    <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:20px;border:1.5px solid #93c5fd">
      <div style="font-size:12px;color:#1e40af;font-weight:700;margin-bottom:8px">TRACKING NUMBER</div>
      <div style="font-size:24px;font-weight:900;color:#1d4ed8;letter-spacing:1px">${tracking}</div>
      <div style="font-size:13px;color:#374151;margin-top:6px">🚚 ${provider}</div>
    </div>
    <div style="font-size:13px;color:#374151;margin-bottom:16px">
      <strong>คำสั่งซื้อ / Order #${ref}</strong>
    </div>
    <a href="${SITE}/account/orders" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">📦 ติดตามพัสดุ / Track Package →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">กรุณารอรับพัสดุภายใน 3-7 วันทำการ 🌸</p>
  `);
}

// Core send + log ─────────────────────────────────────────────────────────────

async function sendEmail(to, subject, html, opts = {}) {
  const { orderId, eventType } = opts;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.EMAIL_FROM || 'noreply@fluffypub.vercel.app';

  // Check duplicate: if orderId + eventType already sent successfully, skip
  if (orderId && eventType) {
    try {
      const { data: existing } = await supabase
        .from('order_email_logs')
        .select('id')
        .eq('order_id', orderId)
        .eq('event_type', eventType)
        .eq('recipient_email', to)
        .eq('status', 'sent')
        .limit(1);
      if (existing && existing.length > 0) {
        console.log(`[EMAIL] Duplicate skip: ${eventType} for order ${orderId}`);
        return { skipped: true };
      }
    } catch (e) { /* table may not exist yet — proceed */ }
  }

  let status = 'sent';
  let errorMsg = null;

  if (!RESEND_KEY) {
    console.log('[EMAIL] No RESEND_API_KEY. Would send to:', to, 'Subject:', subject);
    status = 'dev_skip';
  } else {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: `Fluffy Pub <${FROM}>`, to, subject, html }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        status = 'error';
        errorMsg = `HTTP ${resp.status}: ${body}`;
        console.error('[EMAIL] Resend error:', errorMsg);
      }
    } catch(e) {
      status = 'error';
      errorMsg = e.message;
      console.error('[EMAIL] Send failed:', e.message);
    }
  }

  // Log
  if (orderId && eventType) {
    try {
      await supabase.from('order_email_logs').insert({
        order_id: orderId,
        event_type: eventType,
        recipient_email: to,
        subject,
        status,
        error: errorMsg,
      });
    } catch (e) { console.warn('[EMAIL] Log failed (table may not exist):', e.message); }
  }

  return { status, error: errorMsg };
}


// Adjust variant stock for an order's items
async function adjustStock(items, delta) {
  if (!items?.length) return;
  for (const item of items) {
    if (!item.productId || !item.optionId || item.optionType !== 'physical') continue;
    const { data: prod } = await supabase.from('products').select('variants').eq('id', item.productId).single();
    if (!prod?.variants) continue;
    const variants = prod.variants.map(v => {
      if (v.id !== item.optionId) return v;
      const currentStock = v.stock_quantity !== undefined ? Number(v.stock_quantity) : (v.stock !== undefined ? Number(v.stock) : null);
      if (currentStock === null) return v; // unlimited
      const newStock = Math.max(0, currentStock + (delta * (item.qty || 1)));
      return { ...v, stock_quantity: newStock, stock: newStock };
    });
    await supabase.from('products').update({ variants }).eq('id', item.productId);
  }
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
        optionType: cartItem.optionType || 'digital',  // NEVER default - must come from cart
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
    // Shipping based on physical qty from cart (already calculated correctly)
    const physicalQtyFromCart = orderItems.filter(i => i.optionType === 'physical').reduce((s, i) => s + i.qty, 0);

    const authUser = await getUser(req);
    const { data: order, error } = await supabase.from('orders').insert({
      user_id: authUser?.id || null,
      guest_email: authUser ? null : customerEmail,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_address: shippingAddress || null,
      items: orderItems,
      // Required NOT NULL columns (original schema)
      subtotal: subtotal_thb || grand_total_thb,
      total: grand_total_thb,
      discount: 0,
      // THB columns (added via migration)
      subtotal_thb: subtotal_thb || 0,
      shipping_thb: shipping_thb,
      total_thb: grand_total_thb,
      total_amount: grand_total_thb,
      promo_code: promoCode || null,
      status: 'pending_payment',
      payment_status: 'pending',
      type: hasPhysical ? 'physical' : 'digital',
    }).select().single();
    if (error) {
      console.error('[orders POST] INSERT ERROR:', error.code, error.message, error.details, error.hint);
      return json(res, 400, { error: error.message, code: error.code, hint: error.hint });
    }
    // Send confirmation emails
    const orderRef = (order.id || '').slice(-8).toUpperCase();
    await sendEmail(customerEmail, `✅ คำสั่งซื้อ #${orderRef} รับแล้ว — Fluffy Pub`, tplOrderCreated(order), { orderId: order.id, eventType: 'order_created' });
    await sendEmail(ADMIN_EMAIL, `🛍️ New Order #${orderRef} — ฿${Number(order.total_thb||0).toLocaleString('th-TH')}`, tplAdminNewOrder(order), { orderId: order.id, eventType: 'admin_order_created' });

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

    const ref = (order.id||'').slice(-8).toUpperCase();
    const total = order.total_thb || order.total_amount || 0;
    await sendEmail(ADMIN_EMAIL, `💳 Payment Slip Uploaded — Order #${ref}`,
      emailWrapper(`<h2 style="margin:0 0 10px;color:#111827;font-size:18px">💳 Payment Slip Uploaded</h2>
        <p style="color:#374151;font-size:13px"><strong>${order.customer_name}</strong> uploaded a payment slip for Order <strong>#${ref}</strong> · ฿${Number(total).toLocaleString('th-TH')}</p>
        <img src="${slip_url}" alt="slip" style="width:100%;max-width:320px;border-radius:8px;border:1px solid #e5e7eb;margin:8px 0">
        <a href="${SITE}/admin" style="display:inline-block;margin-top:8px;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">⚙️ Review in Admin →</a>`),
      { orderId: order.id, eventType: 'slip_uploaded' }
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

    // Decrease stock for physical items now that payment is confirmed
    await adjustStock(data.items, -1);

    // Send payment confirmed emails
    const ref = (data.id||'').slice(-8).toUpperCase();
    await sendEmail(data.customer_email, `✅ ยืนยันการชำระเงิน Order #${ref} — Fluffy Pub`, tplPaymentConfirmed(data), { orderId: data.id, eventType: 'payment_confirmed' });
    await sendEmail(ADMIN_EMAIL, `💰 Payment Confirmed — Order #${ref}`, tplAdminPaymentConfirmed(data), { orderId: data.id, eventType: 'admin_payment_confirmed' });

    return json(res, 200, data);
  }

  // PUT update status/tracking (admin)
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { status, tracking_number, shipping_provider } = req.body || {};

    // Fetch current order to detect tracking change
    const { data: before } = await supabase.from('orders').select('*').eq('id', id).single();

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;
    if (shipping_provider !== undefined) updates.shipping_provider = shipping_provider;

    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) return json(res, 404, { error: 'Order not found' });

    // Send shipped notification when status changes to 'shipped', or tracking is newly added
    const trackingAdded = tracking_number && tracking_number !== before?.tracking_number;
    const justShipped = status === 'shipped' && before?.status !== 'shipped';
    if (data.customer_email) {
      const ref = (data.id||'').slice(-8).toUpperCase();
      if (justShipped) {
        // One email covers both shipped status + any new tracking number
        await sendEmail(data.customer_email, `🚚 สินค้าถูกจัดส่งแล้ว! Order #${ref} — Fluffy Pub`, tplTrackingAdded(data), { orderId: data.id, eventType: 'shipped_notification' });
      } else if (trackingAdded) {
        // Tracking updated without shipping status change (e.g., adding tracking later)
        await sendEmail(data.customer_email, `🚚 อัปเดตหมายเลขพัสดุ Order #${ref} — Fluffy Pub`, tplTrackingAdded(data), { orderId: data.id, eventType: 'tracking_added' });
      }
    }

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
    const { data: cancelData, error } = await supabase.from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    // Restore stock if order was paid
    if (cancelData.payment_status === 'paid') {
      await adjustStock(cancelData.items, +1);
    }
    return json(res, 200, cancelData);
  }

  // POST send payment reminder (admin) — supports single id via query or bulk via body
  if (req.method === 'POST' && action === 'reminder') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    // Support single order via ?id= or bulk via body.orderIds
    const orderIds = id ? [id] : (req.body?.orderIds || []);
    if (!orderIds.length) return json(res, 400, { error: 'orderIds required' });
    const results = [];
    for (const oid of orderIds) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', oid).single();
      if (!order) { results.push({ id: oid, error: 'Not found' }); continue; }
      const ref = (order.id || '').slice(-8).toUpperCase();
      const result = await sendEmail(
        order.customer_email,
        `⏰ แจ้งเตือน: รอชำระเงินคำสั่งซื้อ #${ref} — Fluffy Pub`,
        tplPaymentReminder(order),
        { orderId: order.id, eventType: 'payment_reminder' }
      );
      await supabase.from('orders').update({ payment_reminder_sent_at: new Date().toISOString() }).eq('id', oid);
      results.push({ id: oid, sent: true, skipped: result?.skipped });
    }
    return json(res, 200, { results });
  }

  // GET email logs for an order (admin)
  if (req.method === 'GET' && action === 'email-logs' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('order_email_logs')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });
      if (error) return json(res, 200, []); // table may not exist yet
      return json(res, 200, data || []);
    } catch (e) {
      return json(res, 200, []);
    }
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
