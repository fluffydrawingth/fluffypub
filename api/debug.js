// /api/debug — check profile data in DB (admin only)
const { supabase, requireAuth, getUser, json } = require('./_lib');

module.exports = async function handler(req, res) {
  // POST /api/debug?action=test-email  — admin: send a test email
  if (req.method === 'POST' && req.query.action === 'test-email') {
    const user = await getUser(req);
    if (!user || user.role !== 'admin') return json(res, 403, { error: 'Admin only' });
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const TO = user.email;
    if (!RESEND_KEY) return json(res, 200, { ok: false, reason: 'RESEND_API_KEY env var is not set' });
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: `Fluffy Pub <${FROM}>`, to: TO, subject: '✅ Fluffy Pub email test', html: '<p>Email is working! 🌸</p>' }),
      });
      const body = await resp.json();
      return json(res, 200, { ok: resp.ok, status: resp.status, resend: body, from: FROM, to: TO });
    } catch (e) {
      return json(res, 200, { ok: false, error: e.message });
    }
  }

  if (req.method === 'GET') {
    const user = await getUser(req);
    if (!user) return json(res, 401, { error: 'Not authenticated' });

    // Check what columns exist in profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return json(res, 200, {
      userId: user.id,
      profileRaw: profile,
      profileError: error?.message,
      columnsFound: profile ? Object.keys(profile) : [],
      hasFirstName: profile ? 'first_name' in profile : false,
      hasProvince: profile ? 'province' in profile : false,
    });
  }

  // POST: force-save profile fields
  if (req.method === 'POST') {
    const user = await getUser(req);
    if (!user) return json(res, 401, { error: 'Not authenticated' });

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, email: user.email, role: 'customer', ...req.body }, { onConflict: 'id' })
      .select('*')
      .single();

    return json(res, error ? 400 : 200, { data, error: error?.message, hint: error?.hint });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
