const { supabase, requireAuth, getUser, json } = require('../_lib');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fluffydrawing.th@gmail.com';

async function sendAdminEmailNotification(order) {
  // Use Supabase edge function or just log for now
  // Real email sending requires Resend/SendGrid integration
  console.log(`[NEW ORDER] Admin notification for order ${order.id}`);
  console.log(`Customer: ${order.customer_name} <${order.customer_email}>`);
  console.log(`Phone: ${order.customer_phone}`);
  console.log(`Total: $${order.total}`);
  console.log(`Type: ${order.type}`);
  if (order.shipping_address) {
    console.log(`Shipping: ${JSON.stringify(order.shipping_address)}`);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  if (req.method === 'POST') {
    const { items, customerName, customerEmail, customerPhone, shippingAddress, promoCode } = req.body || {};
    if (!items?.length || !customerName || !customerEmail) return json(res, 400, { error: 'items, name, email required' });

    const ids = items.map(i => i.productId);
    const { data: products } = await supabase
      .from('products').select('id, title, price, image, artist_id, type, digital_download_url, download_instruction, cover_image_url')
      .in('id', ids).eq('active', true);
    if (!products || products.length !== ids.length) return json(res, 400, { error: 'One or more products unavailable.' });

    let subtotal = 0;
    const orderItems = products.map(p => {
      subtotal += parseFloat(p.price);
      return {
        productId: p.id, title: p.title, price: p.price,
        image: p.image, artistId: p.artist_id, type: p.type || 'digital',
        // Never expose download URLs at order creation
      };
    });

    let discount = 0;
    if (promoCode?.toUpperCase() === 'FLUFFY15') discount = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;
    const hasPhysical = orderItems.some(i => i.type === 'physical');

    if (hasPhysical && (!customerPhone || !shippingAddress)) {
      return json(res, 400, { error: 'Phone and shipping address required for physical products.' });
    }

    const authUser = await getUser(req);
    const { data: order, error } = await supabase.from('orders').insert({
      user_id: authUser?.id || null,
      guest_email: authUser ? null : customerEmail,
      customer_name: customerName, customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_address: shippingAddress || null,
      items: orderItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discount, total,
      promo_code: promoCode || null,
      status: 'pending_payment',
      payment_status: 'pending',
      type: hasPhysical ? 'physical' : 'digital',
    }).select().single();

    if (error) return json(res, 400, { error: error.message });

    // Send admin notification for physical orders
    if (hasPhysical) {
      await sendAdminEmailNotification(order).catch(e => console.error('Email error:', e));
    }

    return json(res, 201, order);
  }

  return json(res, 405, { error: 'Method not allowed' });
};
