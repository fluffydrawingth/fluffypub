// POST /api/orders/pay?id=<orderId>
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const id = (req.query.id as string) || req.body?.id;
  if (!id) return json(res, 400, { error: 'Order id required' });
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: 'paid', status: 'paid', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) return json(res, 404, { error: 'Order not found' });
  return json(res, 200, data);
}
