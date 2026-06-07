// /api/users?action=me|list|favorites&productId=xxx
const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { action, productId } = req.query;

  if (action === 'me') {
    if (req.method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;
      return json(res, 200, user);
    }
    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const body = req.body || {};
      const fields = ['name','bio','first_name','last_name','phone','delivery_email','shipping_address','province','postal_code','preferred_lang'];
      const updates = { updated_at: new Date().toISOString() };
      fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });
      console.log('[users PUT] user:', user.id, 'updating:', JSON.stringify(updates));

      // upsert keyed by user.id (auth.users.id) — NEVER by email
      // Each user always has exactly one profile row
      const upsertData = {
        id: user.id,          // primary key = auth user id
        email: user.email,
        role: user.role || 'customer',
        ...updates,
      };
      const PROFILE_SELECT = 'id,email,name,role,bio,artist_slug,favorites,first_name,last_name,phone,delivery_email,shipping_address,province,postal_code,preferred_lang';
      const { data, error } = await supabase
        .from('profiles')
        .upsert(upsertData, { onConflict: 'id' })
        .select(PROFILE_SELECT)
        .single();

      if (error) {
        console.error('[users PUT] UPSERT ERROR:', error.code, error.message, error.details, error.hint);
        // Fallback: try plain update
        const { data: d2, error: e2 } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select(PROFILE_SELECT)
          .single();
        if (e2) {
          console.error('[users PUT] UPDATE FALLBACK ERROR:', e2.code, e2.message, e2.hint);
          return json(res, 400, { error: e2.message, code: e2.code });
        }
        console.log('[users PUT] fallback update succeeded');
        return json(res, 200, d2);
      }
      console.log('[users PUT] upsert succeeded, returning:', JSON.stringify(data));
      return json(res, 200, data);
    }
  }

  if (action === 'favorites') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).single();
    const current = profile?.favorites || [];
    if (req.method === 'GET') return json(res, 200, current);
    if (req.method === 'POST') {
      const updated = current.includes(productId) ? current : [...current, productId];
      await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
      return json(res, 200, { favorites: updated });
    }
    if (req.method === 'DELETE') {
      const updated = current.filter(id => id !== productId);
      await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
      return json(res, 200, { favorites: updated });
    }
  }

  // GET /api/users (admin list all)
  if (req.method === 'GET' && !action) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('id,email,name,role,artist_slug,created_at').order('created_at');
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
};
