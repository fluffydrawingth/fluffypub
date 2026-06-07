// /api/debug — check profile data in DB (admin only)
const { supabase, requireAuth, getUser, json } = require('./_lib');

module.exports = async function handler(req, res) {
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
