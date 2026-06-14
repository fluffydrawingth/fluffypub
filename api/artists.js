const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {

  // GET /api/artists or /api/artists?id=xxx
  if (req.method === 'GET') {
    const { id, slug } = req.query;
    if (id || slug) {
      const query = supabase.from('profiles')
        .select('id,name,artist_slug,bio,role,cover_image_url,avatar_url,website,social_links,artist_status,created_at')
        .eq('role', 'artist').single();
      const { data, error } = slug
        ? await supabase.from('profiles').select('id,name,artist_slug,bio,role,cover_image_url,avatar_url,website,social_links,artist_status,created_at').eq('artist_slug', slug).eq('role','artist').single()
        : await supabase.from('profiles').select('id,name,artist_slug,bio,role,cover_image_url,avatar_url,website,social_links,artist_status,created_at').eq('id', id).eq('role','artist').single();
      if (error || !data) return json(res, 404, { error: 'Artist not found' });
      const { data: products } = await supabase.from('products').select('id,title,title_th,title_en,slug,image,cover_image_url,price,price_thb,category,type,is_digital,is_physical').eq('artist_id', data.id).eq('active', true).eq('status','published');
      return json(res, 200, { ...data, products: products || [] });
    }
    const { data: artists } = await supabase.from('profiles')
      .select('id,name,artist_slug,bio,cover_image_url,avatar_url,website,social_links,artist_status,created_at')
      .eq('role', 'artist').order('name');
    const { data: products } = await supabase.from('products').select('artist_id').eq('active', true);
    const result = (artists || []).map(a => ({
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
