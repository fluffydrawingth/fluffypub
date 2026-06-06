const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

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
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, name, role, bio, artist_slug, favorites')
      .eq('id', user.id)
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
