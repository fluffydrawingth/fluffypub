const { supabase, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { email, password } = req.body || {};
  if (!email || !password) return json(res, 400, { error: 'Email and password required.' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return json(res, 401, { error: 'Invalid email or password.' });

  // Check email confirmed
  if (!data.user.email_confirmed_at) {
    return json(res, 403, { error: 'Please verify your email first. Check your inbox for a confirmation link.' });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, bio, artist_slug, favorites')
    .eq('id', data.user.id).single();

  return json(res, 200, {
    success: true,
    token: data.session.access_token,
    user: { id: data.user.id, email: data.user.email, name: profile?.name || '', role: profile?.role || 'customer' },
  });
};
