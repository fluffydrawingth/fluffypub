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
    
    // Get profile from DB using service role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, role, bio, artist_slug, favorites, first_name, last_name, phone, delivery_email, shipping_address, preferred_lang')
      .eq('id', userId)
      .single();
    return profile;
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

module.exports = { supabase, getToken, getUser, json, requireAuth };
