import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query as { id: string };

  if (req.method === 'POST' && req.url?.endsWith('/pay')) {
    // Simulate payment — accessible to anyone who has the order id
    const { data, error } = await supabase
      .from('orders').update({ payment_status: 'paid', status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return json(res, 404, { error: 'Order not found' });
    return json(res, 200, data);
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { status, tracking_number, shipping_provider } = req.body || {};
    const updates: any = { updated_at: new Date().toISOString() };
    if (status)            updates.status = status;
    if (tracking_number)   updates.tracking_number = tracking_number;
    if (shipping_provider) updates.shipping_provider = shipping_provider;
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) return json(res, 404, { error: 'Order not found' });
    return json(res, 200, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
}
