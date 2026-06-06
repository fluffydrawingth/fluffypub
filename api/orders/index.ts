import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, getUser, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Admin: all orders
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  if (req.method === 'POST') {
    const { items, customerName, customerEmail, customerPhone, shippingAddress, promoCode } = req.body || {};
    if (!items?.length || !customerName || !customerEmail) return json(res, 400, { error: 'items, name, email required' });

    // Validate + price items from DB
    const ids = items.map((i: any) => i.productId);
    const { data: products } = await supabase.from('products').select('id, title, price, image, artist_id, type').in('id', ids).eq('active', true);
    if (!products || products.length !== ids.length) return json(res, 400, { error: 'One or more products unavailable.' });

    let subtotal = 0;
    const orderItems = products.map((p: any) => {
      subtotal += parseFloat(p.price);
      return { productId: p.id, title: p.title, price: p.price, image: p.image, artistId: p.artist_id, type: p.type || 'digital' };
    });

    let discount = 0;
    if (promoCode?.toUpperCase() === 'FLUFFY15') discount = Math.round(subtotal * 0.15 * 100) / 100;
    const total = Math.round((subtotal - discount) * 100) / 100;
    const hasPhysical = orderItems.some((i: any) => i.type === 'physical');
    if (hasPhysical && !shippingAddress) return json(res, 400, { error: 'Shipping address required for physical products.' });

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
      status: 'pending_payment', payment_status: 'pending',
      type: hasPhysical ? 'physical' : 'digital',
    }).select().single();

    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, order);
  }

  return json(res, 405, { error: 'Method not allowed' });
}
