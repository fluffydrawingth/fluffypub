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
    const { email } = req.body || {};
    if (!email) return json(res, 400, { error: 'Email required.' });
    const SITE = process.env.SITE_URL || 'https://fluffypub.com';

    // Generate reset link via admin API (bypasses Supabase SMTP entirely)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: SITE },
    });
    if (linkError) return json(res, 400, { error: linkError.message });

    const resetLink = linkData?.properties?.action_link || linkData?.action_link;
    if (!resetLink) return json(res, 500, { error: 'Could not generate reset link.' });

    // Send via Resend directly (same as order emails)
    const RESEND_KEY = process.env.RESEND_API_KEY;
    if (RESEND_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({
          from: 'Fluffy Pub <hello@fluffypub.com>',
          to: [email],
          subject: '🔑 Reset your Fluffy Pub password',
          html: `<div style="font-family:'Helvetica Neue',sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fdf2f8;border-radius:16px">
            <div style="text-align:center;margin-bottom:24px"><span style="font-size:40px">🐰</span><h2 style="color:#f472b6;margin:8px 0">Fluffy Pub</h2></div>
            <h3 style="color:#4a1942;margin:0 0 12px">Reset your password</h3>
            <p style="color:#6b7280;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
            <div style="text-align:center;margin-bottom:24px">
              <a href="${resetLink}" style="display:inline-block;background:#f472b6;color:white;padding:14px 32px;border-radius:30px;text-decoration:none;font-weight:700;font-size:16px">🔑 Reset Password</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;text-align:center">If you didn't request this, you can safely ignore this email.</p>
          </div>`,
        }),
      });
    }
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
