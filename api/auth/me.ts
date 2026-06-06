import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, json } from '../_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const user = await requireAuth(req, res);
  if (!user) return;
  return json(res, 200, user);
}
