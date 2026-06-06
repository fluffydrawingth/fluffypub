const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  
  if (!token) {
    return res.status(200).json({ message: 'No token. Add Authorization header.' });
  }

  // Get user from token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return res.status(200).json({ step: 'auth_failed', error: authError?.message, token_prefix: token.slice(0,20) });
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, name, role')
    .eq('id', user.id)
    .single();

  return res.status(200).json({
    user_id: user.id,
    user_email: user.email,
    profile_found: !!profile,
    profile_role: profile?.role,
    profile_error: profileError?.message,
    url: process.env.SUPABASE_URL?.slice(0, 40),
  });
};
