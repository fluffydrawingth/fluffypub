import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data } = await supabase.from('theme').select('config').eq('id', 1).single();
    return json(res, 200, data?.config || {});
  }
  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('theme').update({ config: req.body, updated_at: new Date().toISOString() }).eq('id', 1).select('config').single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data.config);
  }
  return json(res, 405, { error: 'Method not allowed' });
}
