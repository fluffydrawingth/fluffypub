const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

// Service role client for DB operations
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Anon client for validating user tokens
const supabaseAnon = createClient(supabaseUrl, anonKey || serviceKey, {
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
    // Use anon client to validate the user's JWT token
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    if (error || !user) return null;
    
    // Use service role client to get profile (bypasses RLS)
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
