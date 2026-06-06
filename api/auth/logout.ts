import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase, getToken, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const token = getToken(req);
  if (token) await supabase.auth.admin.signOut(token).catch(() => {});
  return json(res, 200, { success: true });
}
