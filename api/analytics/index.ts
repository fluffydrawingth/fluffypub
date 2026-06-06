import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;
  const [ordersRes, usersRes, productsRes] = await Promise.all([
    supabase.from('orders').select('total, payment_status, created_at'),
    supabase.from('profiles').select('role'),
    supabase.from('products').select('id').eq('active', true),
  ]);
  const orders = ordersRes.data || [];
  const users = usersRes.data || [];
  const revenue = orders.filter((o: any) => o.payment_status === 'paid').reduce((s: number, o: any) => s + parseFloat(o.total), 0);
  const today = new Date(); today.setHours(0,0,0,0);
  return json(res, 200, {
    revenue: Math.round(revenue * 100) / 100,
    ordersToday: orders.filter((o: any) => new Date(o.created_at) >= today).length,
    totalOrders: orders.length,
    totalProducts: (productsRes.data || []).length,
    totalCustomers: users.filter((u: any) => u.role === 'customer').length,
    totalArtists: users.filter((u: any) => u.role === 'artist').length,
  });
}
