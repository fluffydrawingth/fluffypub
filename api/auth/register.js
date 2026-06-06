const { supabase, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  const { name, email, password, role = 'customer' } = req.body || {};
  if (!name || !email || !password) return json(res, 400, { error: 'Name, email and password required.' });
  if (!['customer', 'artist'].includes(role)) return json(res, 400, { error: 'Invalid role.' });

  const redirectUrl = `${process.env.SITE_URL || 'https://fluffypub.vercel.app'}/auth/confirm`;

  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { name, role },
      emailRedirectTo: redirectUrl,
    },
  });

  if (error) {
    if (error.message.includes('already registered')) return json(res, 409, { error: 'Email already registered.' });
    return json(res, 400, { error: error.message });
  }

  // Don't return token — user must confirm email first
  return json(res, 201, {
    success: true,
    message: 'Account created! Please check your email and click the confirmation link before logging in.',
    user: { id: data.user?.id, email: data.user?.email, name, role },
  });
};
