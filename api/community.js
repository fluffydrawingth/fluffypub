// /api/community — "Share Your Colorful World" community posts.
//   GET  ?action=list&page=0&limit=12[&product_id=&user_id=]  → paginated published posts
//   GET  ?action=one&id=<postId>                              → single post
//   GET  ?action=by-product&product_id=<id>&limit=6           → product-page gallery + count
//   GET  ?action=creator&user_id=<id>                         → creator profile + gallery + stats
//   POST (auth)                                               → create a post
//   DELETE ?id=<postId> (owner or admin)                     → delete a post
const { supabase, requireAuth, getUser, json } = require('./_lib');

const PAGE_LIMIT_MAX = 48;
const CAPTION_MAX = 300;

// Attach minimal creator + product info to a list of posts (avoids N+1 on the client).
async function decorate(posts) {
  if (!posts || !posts.length) return [];
  const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
  const prodIds = [...new Set(posts.map(p => p.product_id).filter(Boolean))];
  const [{ data: users }, { data: prods }] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id,name,username,avatar_url,artist_slug,role,affiliate_enabled').in('id', userIds) : Promise.resolve({ data: [] }),
    prodIds.length ? supabase.from('products').select('id,title,slug,image,cover_image_url').in('id', prodIds) : Promise.resolve({ data: [] }),
  ]);
  const uMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  const pMap = Object.fromEntries((prods || []).map(p => [p.id, p]));
  return posts.map(post => {
    const u = uMap[post.user_id] || null;
    const pr = post.product_id ? (pMap[post.product_id] || null) : null;
    return {
      ...post,
      creator: u ? {
        id: u.id,
        name: u.username || u.name || 'Fluffy Creator',
        avatar_url: u.avatar_url || null,
        // Public badge: artists show 🎨, Fluffy Creators (affiliate_enabled) show 🌷.
        badge: u.role === 'artist' ? 'artist' : (u.affiliate_enabled ? 'creator' : null),
        artist_slug: u.role === 'artist' ? (u.artist_slug || null) : null,
      } : null,
      product: pr ? { id: pr.id, title: pr.title, slug: pr.slug, image: pr.image, cover_image_url: pr.cover_image_url } : null,
    };
  });
}

module.exports = async function handler(req, res) {
  const { action } = req.query;

  // GET list — paginated, newest first. Optional product_id / user_id filter.
  if (req.method === 'GET' && (action === 'list' || !action)) {
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(req.query.limit) || 12));
    const from = page * limit;
    let q = supabase.from('community_posts').select('*', { count: 'exact' })
      .eq('status', 'published').order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (req.query.product_id) q = q.eq('product_id', req.query.product_id);
    if (req.query.user_id) q = q.eq('user_id', req.query.user_id);
    const { data, error, count } = await q;
    if (error) return json(res, 500, { error: error.message });
    const posts = await decorate(data || []);
    return json(res, 200, { posts, total: count || 0, page, limit, hasMore: from + (data?.length || 0) < (count || 0) });
  }

  // GET single post
  if (req.method === 'GET' && action === 'one') {
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data, error } = await supabase.from('community_posts').select('*').eq('id', id).single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    const [post] = await decorate([data]);
    return json(res, 200, post);
  }

  // GET by-product — gallery for a product page (limited thumbs + total count)
  if (req.method === 'GET' && action === 'by-product') {
    const productId = req.query.product_id;
    if (!productId) return json(res, 400, { error: 'product_id required' });
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit) || 6));
    const { data, error, count } = await supabase.from('community_posts')
      .select('id,artwork_url,thumb_url,user_id,product_id,created_at', { count: 'exact' })
      .eq('status', 'published').eq('product_id', productId)
      .order('created_at', { ascending: false }).range(0, limit - 1);
    if (error) return json(res, 500, { error: error.message });
    const posts = await decorate(data || []);
    return json(res, 200, { posts, total: count || 0 });
  }

  // GET creator — profile + gallery + simple stats
  if (req.method === 'GET' && action === 'creator') {
    const uid = req.query.user_id;
    if (!uid) return json(res, 400, { error: 'user_id required' });
    const { data: profile } = await supabase.from('profiles')
      .select('id,name,username,avatar_url,bio,role,affiliate_enabled,artist_slug,created_at').eq('id', uid).single();
    if (!profile) return json(res, 404, { error: 'Creator not found' });
    const { data: posts } = await supabase.from('community_posts').select('*')
      .eq('status', 'published').eq('user_id', uid).order('created_at', { ascending: false });
    const decorated = await decorate(posts || []);
    // Stats
    const booksUsed = new Set((posts || []).map(p => p.product_id).filter(Boolean)).size;
    const palettes = new Set();
    (posts || []).forEach(p => (p.palettes || []).forEach(x => palettes.add(String(x).toLowerCase())));
    const creator = {
      id: profile.id,
      name: profile.username || profile.name || 'Fluffy Creator',
      avatar_url: profile.avatar_url || null,
      bio: profile.bio || '',
      joined: profile.created_at,
      badge: profile.role === 'artist' ? 'artist' : (profile.affiliate_enabled ? 'creator' : null),
      artist_slug: profile.role === 'artist' ? (profile.artist_slug || null) : null,
      stats: { posts: (posts || []).length, booksUsed, palettes: palettes.size },
    };
    return json(res, 200, { creator, posts: decorated });
  }

  // POST — create a community post (any logged-in user)
  if (req.method === 'POST' && !action) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const b = req.body || {};
    if (!b.artwork_url) return json(res, 400, { error: 'Artwork image is required.' });
    const asArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).slice(0, 20) : [];
    const row = {
      user_id: user.id,
      artwork_url: b.artwork_url,
      thumb_url: b.thumb_url || b.artwork_url,
      product_id: b.product_id || null,                              // tagged Fluffy Pub book
      external_book_title: b.product_id ? null : (b.external_book_title || null),
      external_book_author: b.product_id ? null : (b.external_book_author || null),
      mediums: asArr(b.mediums),
      markers: asArr(b.markers),
      palettes: asArr(b.palettes),
      caption: (b.caption || '').slice(0, CAPTION_MAX),
      status: 'published',
    };
    const { data, error } = await supabase.from('community_posts').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    const [post] = await decorate([data]);
    return json(res, 201, post);
  }

  // DELETE — owner or admin
  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: post } = await supabase.from('community_posts').select('user_id').eq('id', id).single();
    if (!post) return json(res, 404, { error: 'Not found' });
    if (post.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
    const { error } = await supabase.from('community_posts').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
