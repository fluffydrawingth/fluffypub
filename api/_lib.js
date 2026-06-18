const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Single client with service role
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function getUser(req) {
  const token = getToken(req);
  if (!token) return null;
  try {
    // Decode JWT manually to get user_id (avoids auth.getUser issues)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    const userId = payload.sub;
    if (!userId) return null;
    
    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    
    // Get profile from DB — upsert creates row if missing (guarantees per-user row)
    const email = payload.email || '';
    const { data: profile, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, email, name, role, bio, artist_slug, artist_id, favorites, first_name, last_name, phone, delivery_email, shipping_address, province, postal_code, preferred_lang')
      .eq('id', userId)
      .single();

    if (profile) return profile;

    // Only create a row when the profile is genuinely missing (PGRST116 = no rows).
    // Any other error is transient — never fall through, because the create path below
    // would clobber an existing artist/admin row's role back to 'customer'.
    if (fetchErr && fetchErr.code && fetchErr.code !== 'PGRST116') {
      console.error('getUser profile fetch error (not creating):', fetchErr.message);
      return null;
    }

    // No profile row — create one now (first login or missing row).
    // Use insert (not upsert) so we can never overwrite an existing row's role.
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        name: payload.user_metadata?.name || email.split('@')[0] || '',
        role: 'customer',
      })
      .select('id, email, name, role, bio, artist_slug, artist_id, favorites, first_name, last_name, phone, delivery_email, shipping_address, province, postal_code, preferred_lang')
      .single();

    // If the insert raced/conflicted, re-read the existing row rather than assume customer.
    if (created) return created;
    const { data: reread } = await supabase
      .from('profiles')
      .select('id, email, name, role, bio, artist_slug, artist_id, favorites, first_name, last_name, phone, delivery_email, shipping_address, province, postal_code, preferred_lang')
      .eq('id', userId)
      .single();
    return reread || { id: userId, email, name: email.split('@')[0], role: 'customer' };
  } catch (e) {
    console.error('getUser error:', e.message);
    return null;
  }
}

function json(res, status, data) {
  res.status(status).json(data);
}

async function requireAuth(req, res, roles) {
  const user = await getUser(req);
  if (!user) { json(res, 401, { error: 'Not authenticated' }); return null; }
  if (roles && !roles.includes(user.role)) { json(res, 403, { error: 'Forbidden' }); return null; }
  return user;
}

async function getThemeBranding() {
  try {
    const { data } = await supabase.from('theme').select('config').eq('id', 1).single();
    const cfg = data?.config || {};
    return {
      logoText: cfg.logoText || 'Fluffy Pub',
      logoEmoji: cfg.logoEmoji || '🐰',
      logoImageDataUrl: cfg.logoUrl || cfg.logoImageCrop?.croppedDataUrl || null,
      primaryColor: cfg.primaryColor || '#f472b6',
    };
  } catch {
    return { logoText: 'Fluffy Pub', logoEmoji: '🐰', logoImageDataUrl: null, primaryColor: '#f472b6' };
  }
}

module.exports = { supabase, getToken, getUser, json, requireAuth, getThemeBranding };
