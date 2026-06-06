// GET /api/auth/confirm?token_hash=...&type=email
// Handles Supabase email confirmation redirect
const { supabase, json } = require('../_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  
  const { token_hash, type } = req.query;
  
  if (!token_hash || type !== 'email') {
    // Redirect to login with error
    return res.redirect(302, '/#/login?error=invalid_confirmation');
  }

  const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' });
  
  if (error) {
    return res.redirect(302, '/#/login?error=confirmation_failed');
  }

  // Success - redirect to login with success message
  return res.redirect(302, '/#/login?confirmed=1');
};
