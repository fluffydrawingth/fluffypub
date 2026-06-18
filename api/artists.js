const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  const { action } = req.query;

  // ── Artist request workflow (folded in to respect the 12-function limit) ──

  // POST /api/artists?action=request — a logged-in customer requests artist mode
  if (req.method === 'POST' && action === 'request') {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.role === 'artist' || user.role === 'admin') return json(res, 400, { error: 'You already have artist access.' });
    const { message } = req.body || {};
    const { data: existing } = await supabase.from('artist_requests').select('id').eq('user_id', user.id).eq('status', 'pending').limit(1);
    if (existing && existing.length) return json(res, 409, { error: 'You already have a pending request.' });
    const { data, error } = await supabase.from('artist_requests').insert({
      user_id: user.id, username: user.name || '', email: user.email || '', message: message || '', status: 'pending',
    }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // GET /api/artists?action=my-request — caller's latest request (for button state)
  if (req.method === 'GET' && action === 'my-request') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data } = await supabase.from('artist_requests').select('*').eq('user_id', user.id).order('request_date', { ascending: false }).limit(1);
    return json(res, 200, (data && data[0]) || null);
  }

  // GET /api/artists?action=requests — admin lists all requests
  if (req.method === 'GET' && action === 'requests') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('artist_requests').select('*').order('request_date', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data || []);
  }

  // POST /api/artists?action=approve&id=<requestId> — admin approves
  if (req.method === 'POST' && action === 'approve') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'request id required' });
    const { data: reqRow } = await supabase.from('artist_requests').select('*').eq('id', id).single();
    if (!reqRow) return json(res, 404, { error: 'Request not found' });
    const linkArtistId = (req.body && req.body.artist_id) || reqRow.user_id; // self-link if none chosen
    // Promote the requesting user; never create a duplicate artist profile.
    const { error: pErr } = await supabase.from('profiles').update({ role: 'artist', artist_id: linkArtistId, updated_at: new Date().toISOString() }).eq('id', reqRow.user_id);
    if (pErr) return json(res, 400, { error: pErr.message });
    await supabase.from('artist_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: admin.id }).eq('id', id);
    return json(res, 200, { success: true });
  }

  // POST /api/artists?action=reject&id=<requestId> — admin rejects
  if (req.method === 'POST' && action === 'reject') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'request id required' });
    const { error } = await supabase.from('artist_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: admin.id }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // POST /api/artists?action=revoke&id=<userId> — admin revokes artist access (keeps all history)
  if (req.method === 'POST' && action === 'revoke') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'user id required' });
    // Role back to customer + unlink. Products/orders/sales are intentionally untouched.
    const { error } = await supabase.from('profiles').update({ role: 'customer', artist_id: null, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    // So the user no longer sees the "approved" state in their profile.
    await supabase.from('artist_requests').update({ status: 'revoked' }).eq('user_id', id).eq('status', 'approved');
    return json(res, 200, { success: true });
  }

  // DELETE /api/artists?action=delete-request&id=<requestId> — admin permanently deletes a request row
  if (req.method === 'DELETE' && action === 'delete-request') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('artist_requests').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // DELETE /api/artists?action=delete-payout&id=<payoutId> — admin permanently deletes a payout record
  if (req.method === 'DELETE' && action === 'delete-payout') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('artist_payouts').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // GET /api/artists?action=payouts — list payout records (admin: all/by artist_id; artist: own)
  if (req.method === 'GET' && action === 'payouts') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const isAdmin = user.role === 'admin';
    let q = supabase.from('artist_payouts').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (isAdmin) {
      const artistId = req.query.artist_id;
      if (artistId) q = q.eq('artist_id', artistId);
    } else {
      const effectiveId = user.artist_id || user.id;
      q = q.eq('artist_id', effectiveId);
    }
    const { data, error } = await q;
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data || []);
  }

  // POST /api/artists?action=payout — create or update a payout record (admin only)
  if (req.method === 'POST' && action === 'payout') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const b = req.body || {};
    const { id, artist_id, month, year } = b;

    const PAYOUT_FIELDS = [
      'calculated_earning_thb','calculated_earning_usd',
      'paid_amount_thb','paid_amount_usd',
      'usd_to_thb_rate',
      'physical_qty','physical_earning_thb',
      'digital_qty_thb','digital_gross_thb','digital_earning_thb',
      'digital_qty_usd','digital_gross_usd','digital_earning_usd',
      'status','payout_proof_url','payout_note','paid_at',
      // legacy
      'calculated_earning','paid_amount','currency',
    ];

    if (id) {
      const updates = { updated_at: new Date().toISOString() };
      PAYOUT_FIELDS.forEach(k => { if (b[k] !== undefined) updates[k] = b[k]; });
      const { data, error } = await supabase.from('artist_payouts').update(updates).eq('id', id).select().single();
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, data);
    }
    if (!artist_id || !month || !year) return json(res, 400, { error: 'artist_id, month, year required' });
    const row = { artist_id, month: parseInt(month), year: parseInt(year), status: b.status || 'pending' };
    PAYOUT_FIELDS.filter(k => !['status'].includes(k)).forEach(k => {
      if (b[k] !== undefined) row[k] = b[k];
    });
    const { data, error } = await supabase.from('artist_payouts').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // PUT /api/artists?action=me — an artist edits their own (effective) artist profile
  if (req.method === 'PUT' && action === 'me') {
    const user = await requireAuth(req, res, ['artist']);
    if (!user) return;
    const targetId = user.artist_id || user.id;
    const allowed = ['name', 'bio', 'avatar_url', 'website', 'contact_email', 'social_links'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', targetId).select('id,name,bio,avatar_url,website,contact_email,social_links,artist_slug').single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // GET /api/artists or /api/artists?id=xxx
  if (req.method === 'GET') {
    const { id, slug } = req.query;
    if (id || slug) {
      const query = supabase.from('profiles')
        .select('id,name,artist_slug,bio,role,cover_image_url,avatar_url,website,contact_email,social_links,artist_status,created_at')
        .eq('role', 'artist').single();
      const { data, error } = slug
        ? await supabase.from('profiles').select('id,name,artist_slug,bio,role,cover_image_url,avatar_url,website,contact_email,social_links,artist_status,created_at').eq('artist_slug', slug).eq('role','artist').single()
        : await supabase.from('profiles').select('id,name,artist_slug,bio,role,cover_image_url,avatar_url,website,contact_email,social_links,artist_status,created_at').eq('id', id).eq('role','artist').single();
      if (error || !data) return json(res, 404, { error: 'Artist not found' });
      const { data: products } = await supabase.from('products').select('id,title,title_th,title_en,slug,image,cover_image_url,price,price_thb,price_usd,category,type,is_digital,is_physical,variants,is_new').eq('artist_id', data.id).eq('active', true).eq('status','published');
      return json(res, 200, { ...data, products: products || [] });
    }
    const { data: artists } = await supabase.from('profiles')
      .select('id,name,artist_slug,bio,cover_image_url,avatar_url,website,social_links,artist_status,created_at,artist_id')
      .eq('role', 'artist').order('name');
    // Only real artist profiles — exclude promoted user accounts linked to another artist.
    const realArtists = (artists || []).filter(a => !a.artist_id || a.artist_id === a.id);
    const { data: products } = await supabase.from('products').select('artist_id').eq('active', true);
    const result = realArtists.map(a => ({
      ...a,
      productCount: (products || []).filter(p => p.artist_id === a.id).length,
    }));
    return json(res, 200, result);
  }

  // POST /api/artists — create new artist account
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { name, artist_slug, bio, email, avatar_url, cover_image_url, website, social_links, artist_status = 'active' } = req.body || {};
    if (!name || !artist_slug) return json(res, 400, { error: 'name and artist_slug required' });

    // Check slug uniqueness
    const { data: existing } = await supabase.from('profiles').select('id').eq('artist_slug', artist_slug).single();
    if (existing) return json(res, 409, { error: 'Artist slug already taken' });

    // Create auth user if email provided
    let artistId = null;
    if (email) {
      const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email, password: tempPassword,
        email_confirm: true,
        user_metadata: { name, role: 'artist' },
      });
      if (authError) return json(res, 400, { error: authError.message });
      artistId = authData.user.id;
      // Profile created by trigger — update it
      await supabase.from('profiles').update({
        name, artist_slug, bio: bio || '', role: 'artist',
        avatar_url: avatar_url || null, cover_image_url: cover_image_url || null,
        website: website || null, social_links: social_links || null,
        artist_status,
      }).eq('id', artistId);
    } else {
      // No email — create auth user with a placeholder email (never used for login)
      // profiles.id must reference auth.users.id, so we must create an auth user first
      const placeholderEmail = `artist-${artist_slug}-${Date.now()}@noemail.fluffypub.internal`;
      const tempPassword = Math.random().toString(36).slice(-10) + 'Aa1!';
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: placeholderEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, role: 'artist' },
      });
      if (authError) return json(res, 400, { error: authError.message });
      artistId = authData.user.id;
      // Update the profile row created by the trigger
      await supabase.from('profiles').update({
        name, artist_slug, bio: bio || '', role: 'artist',
        avatar_url: avatar_url || null, cover_image_url: cover_image_url || null,
        website: website || null, social_links: social_links || null,
        artist_status,
      }).eq('id', artistId);
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', artistId).single();
    return json(res, 201, profile);
  }

  // PUT /api/artists?id=xxx — update artist
  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const allowed = ['name','artist_slug','bio','avatar_url','cover_image_url','website','social_links','artist_status'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // DELETE /api/artists?id=xxx
  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    // Soft delete: set role back to customer and clear artist fields
    const { error } = await supabase.from('profiles').update({ role: 'customer', artist_slug: null, artist_status: 'inactive' }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
