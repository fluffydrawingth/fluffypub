// /api/auth?action=login|register|logout|me|confirm
const { supabase, json, requireAuth } = require('./_lib');

module.exports = async function handler(req, res) {
  const action = req.query.action;

  // GET /api/auth?action=me
  if (req.method === 'GET' && action === 'me') {
    const user = await requireAuth(req, res);
    if (!user) return;
    return json(res, 200, user);
  }

  // GET /api/auth?action=confirm
  if (req.method === 'GET' && action === 'confirm') {
    const { token_hash, type } = req.query;
    if (!token_hash || type !== 'email') return res.redirect(302, '/#/login?error=invalid');
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' });
    if (error) return res.redirect(302, '/#/login?error=confirmation_failed');
    return res.redirect(302, '/#/login?confirmed=1');
  }

  if (req.method === 'POST' && action === 'login') {
    const { email, password } = req.body || {};
    if (!email || !password) return json(res, 400, { error: 'Email and password required.' });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return json(res, 401, { error: 'Invalid email or password.' });
    if (!data.user.email_confirmed_at) return json(res, 403, { error: 'Please verify your email first. Check your inbox for a confirmation link.' });
    const { data: profile } = await supabase.from('profiles').select('id,email,name,role,bio,artist_slug,favorites').eq('id', data.user.id).single();
    return json(res, 200, { success: true, token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: profile?.name || '', role: profile?.role || 'customer' } });
  }

  if (req.method === 'POST' && action === 'register') {
    const { name, email, password, role = 'customer' } = req.body || {};
    if (!name || !email || !password) return json(res, 400, { error: 'Name, email and password required.' });
    if (!['customer', 'artist'].includes(role)) return json(res, 400, { error: 'Invalid role.' });
    const redirectUrl = `${process.env.SITE_URL || 'https://fluffypub.com'}/api/auth?action=confirm`;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, role }, emailRedirectTo: redirectUrl } });
    if (error) {
      if (error.message.includes('already registered')) return json(res, 409, { error: 'Email already registered.' });
      return json(res, 400, { error: error.message });
    }
    return json(res, 201, { success: true, message: 'Account created! Please check your email to confirm before logging in.' });
  }

  if (req.method === 'POST' && action === 'logout') {
    const token = (req.headers['authorization'] || '').replace('Bearer ', '');
    if (token) await supabase.auth.admin.signOut(token).catch(() => {});
    return json(res, 200, { success: true });
  }

  if (req.method === 'POST' && action === 'reset') {
    const { email, redirectTo } = req.body || {};
    if (!email) return json(res, 400, { error: 'Email required.' });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo || `${process.env.SITE_URL || 'https://fluffypub.com'}/#/reset-password`,
    });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true, message: 'Password reset email sent.' });
  }

  if (req.method === 'POST' && action === 'update-password') {
    const { password, access_token, refresh_token } = req.body || {};
    if (!password || password.length < 6) return json(res, 400, { error: 'Password must be at least 6 characters.' });
    if (!access_token) return json(res, 401, { error: 'Reset link missing. Please request a new one.' });
    // Establish a session using the recovery tokens from the email link
    const { createClient } = require('@supabase/supabase-js');
    const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    const { error: sessionError } = await anonClient.auth.setSession({ access_token, refresh_token: refresh_token || '' });
    if (sessionError) return json(res, 401, { error: 'Reset link has expired. Please request a new one.' });
    const { error } = await anonClient.auth.updateUser({ password });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 404, { error: 'Not found' });
};
