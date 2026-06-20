// /api/community — "Share Your Colorful World" community posts + reactions.
//   GET  ?action=list&page=0&limit=12[&product_id=&user_id=&palette=&marker=]
//   GET  ?action=one&id=<postId>
//   GET  ?action=by-product&product_id=<id>&limit=6
//   GET  ?action=creator&user_id=<id>
//   GET  ?action=trending&limit=8            → most-reacted in the last 7 days
//   GET  ?action=creators&limit=12           → top creators by post count
//   GET  ?action=facets                      → popular palettes / marker sets (filter chips)
//   GET  ?action=archive                     → posts grouped by month
//   POST                                     → create a post (auth)
//   POST ?action=react  {post_id,type}       → toggle a Fluffy reaction (auth)
//   DELETE ?id=<postId> (owner or admin)
const { supabase, requireAuth, getUser, json } = require('./_lib');

const PAGE_LIMIT_MAX = 48;
const CAPTION_MAX = 300;
const COMMENT_MAX = 500;
const REACTION_TYPES = ['love', 'inspiring', 'cozy', 'cute_palette', 'want_to_try'];
const ALLOWED_TYPES = [...REACTION_TYPES, 'save']; // 'save' = bookmark (not shown in counts)

// Attach creator + product info, and reaction counts (+ which the viewer reacted to).
// viewerId = logged-in profile id; guestId = anonymous browser id (for logged-out users).
async function decorate(posts, viewerId, guestId) {
  if (!posts || !posts.length) return [];
  const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];
  const prodIds = [...new Set(posts.map(p => p.product_id).filter(Boolean))];
  const postIds = posts.map(p => p.id);
  const [{ data: users }, { data: prods }, { data: reactions }] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id,name,username,avatar_url,artist_slug,role,affiliate_enabled').in('id', userIds) : Promise.resolve({ data: [] }),
    prodIds.length ? supabase.from('products').select('id,title,slug,image,cover_image_url').in('id', prodIds) : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from('community_reactions').select('post_id,user_id,guest_id,type').in('post_id', postIds) : Promise.resolve({ data: [] }),
  ]);
  const uMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  const pMap = Object.fromEntries((prods || []).map(p => [p.id, p]));
  const rMap = {};   // postId -> { counts:{type:n}, total, mine:[] }
  (reactions || []).forEach(r => {
    const e = rMap[r.post_id] || (rMap[r.post_id] = { counts: {}, total: 0, mine: [] });
    if (r.type !== 'save') { // 'save' is a private bookmark — never in public counts
      e.counts[r.type] = (e.counts[r.type] || 0) + 1;
      e.total += 1;
    }
    const isMine = (viewerId && r.user_id === viewerId) || (guestId && r.guest_id === guestId);
    if (isMine) e.mine.push(r.type);
  });
  return posts.map(post => {
    const u = uMap[post.user_id] || null;
    const pr = post.product_id ? (pMap[post.product_id] || null) : null;
    const r = rMap[post.id] || { counts: {}, total: 0, mine: [] };
    return {
      ...post,
      creator: u ? {
        id: u.id,
        name: u.username || u.name || 'Fluffy Creator',
        avatar_url: u.avatar_url || null,
        badge: u.role === 'artist' ? 'artist' : (u.affiliate_enabled ? 'creator' : null),
        artist_slug: u.role === 'artist' ? (u.artist_slug || null) : null,
      } : null,
      product: pr ? { id: pr.id, title: pr.title, slug: pr.slug, image: pr.image, cover_image_url: pr.cover_image_url } : null,
      reactions: r.counts,
      reactionTotal: r.total,
      myReactions: r.mine,
    };
  });
}

module.exports = async function handler(req, res) {
  const { action } = req.query;

  // POST react — toggle a Fluffy reaction. Logged-in OR guest (anonymous browser id).
  // Guests are deduped per (post, guest_id, type) so they can't spam the same reaction.
  // 'save' (bookmark) requires login.
  if (req.method === 'POST' && action === 'react') {
    const user = await getUser(req);
    const { post_id, type, guest_id } = req.body || {};
    if (!post_id || !ALLOWED_TYPES.includes(type)) return json(res, 400, { error: 'post_id and a valid type are required.' });
    if (type === 'save' && !user) return json(res, 401, { error: 'Please log in to save posts.' });
    // Identity: member by user_id, otherwise guest by a client-supplied browser id.
    const guestId = !user ? String(guest_id || '').slice(0, 64) : null;
    if (!user && !guestId) return json(res, 400, { error: 'guest_id required for anonymous reactions.' });

    let findQ = supabase.from('community_reactions').select('id').eq('post_id', post_id).eq('type', type);
    findQ = user ? findQ.eq('user_id', user.id) : findQ.eq('guest_id', guestId);
    const { data: existing } = await findQ.limit(1);
    if (existing && existing.length) {
      await supabase.from('community_reactions').delete().eq('id', existing[0].id);
    } else {
      await supabase.from('community_reactions').insert({ post_id, type, user_id: user ? user.id : null, guest_id: guestId });
    }
    const { data: all } = await supabase.from('community_reactions').select('type,user_id,guest_id').eq('post_id', post_id);
    const counts = {}; let total = 0;
    (all || []).forEach(r => { if (r.type !== 'save') { counts[r.type] = (counts[r.type] || 0) + 1; total++; } });
    const mine = (all || []).filter(r => user ? r.user_id === user.id : r.guest_id === guestId).map(r => r.type);
    return json(res, 200, { reactions: counts, myReactions: mine, reactionTotal: total });
  }

  // GET comments — published comments for a post (newest first), with author info
  if (req.method === 'GET' && action === 'comments') {
    const postId = req.query.post_id;
    if (!postId) return json(res, 400, { error: 'post_id required' });
    const { data } = await supabase.from('community_comments').select('*').eq('post_id', postId).eq('status', 'published').order('created_at', { ascending: false });
    const ids = [...new Set((data || []).map(c => c.user_id).filter(Boolean))];
    const { data: users } = ids.length ? await supabase.from('profiles').select('id,name,username,avatar_url,role,affiliate_enabled').in('id', ids) : { data: [] };
    const uMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const comments = (data || []).map(c => {
      const u = uMap[c.user_id];
      return { id: c.id, body: c.body, created_at: c.created_at, author: u ? { id: u.id, name: u.username || u.name || 'Fluffy Creator', avatar_url: u.avatar_url || null, badge: u.role === 'artist' ? 'artist' : (u.affiliate_enabled ? 'creator' : null) } : null };
    });
    return json(res, 200, { comments });
  }

  // POST comment — add a comment (login required)
  if (req.method === 'POST' && action === 'comment') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { post_id, body } = req.body || {};
    if (!post_id || !String(body || '').trim()) return json(res, 400, { error: 'post_id and body required' });
    const { data, error } = await supabase.from('community_comments').insert({ post_id, user_id: user.id, body: String(body).trim().slice(0, COMMENT_MAX) }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, { id: data.id, body: data.body, created_at: data.created_at, author: { id: user.id, name: user.username || user.name || 'Fluffy Creator', avatar_url: user.avatar_url || null, badge: user.role === 'artist' ? 'artist' : (user.affiliate_enabled ? 'creator' : null) } });
  }

  // DELETE comment — owner or admin
  if (req.method === 'DELETE' && action === 'comment') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: c } = await supabase.from('community_comments').select('user_id').eq('id', id).single();
    if (!c) return json(res, 404, { error: 'Not found' });
    if (c.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
    await supabase.from('community_comments').delete().eq('id', id);
    return json(res, 200, { success: true });
  }

  // GET list — paginated, newest first; optional product/user/palette/marker filters
  if (req.method === 'GET' && (action === 'list' || !action)) {
    const viewer = await getUser(req);
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(req.query.limit) || 12));
    const from = page * limit;
    let q = supabase.from('community_posts').select('*', { count: 'exact' })
      .eq('status', 'published').order('created_at', { ascending: false });
    if (req.query.product_id) q = q.eq('product_id', req.query.product_id);
    if (req.query.user_id) q = q.eq('user_id', req.query.user_id);
    if (req.query.palette) q = q.contains('palettes', [req.query.palette]);
    if (req.query.marker) q = q.contains('markers', [req.query.marker]);
    if (/^\d{4}-\d{2}$/.test(req.query.month || '')) {
      const [y, m] = req.query.month.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const end = new Date(Date.UTC(y, m, 1)).toISOString();
      q = q.gte('created_at', start).lt('created_at', end);
    }
    q = q.range(from, from + limit - 1);
    const { data, error, count } = await q;
    if (error) return json(res, 500, { error: error.message });
    const out = await decorate(data || [], viewer?.id, req.query.guest_id);
    return json(res, 200, { posts: out, total: count || 0, page, limit, hasMore: from + (data?.length || 0) < (count || 0) });
  }

  if (req.method === 'GET' && action === 'one') {
    const viewer = await getUser(req);
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data, error } = await supabase.from('community_posts').select('*').eq('id', id).single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    const [post] = await decorate([data], viewer?.id, req.query.guest_id);
    return json(res, 200, post);
  }

  if (req.method === 'GET' && action === 'by-product') {
    const viewer = await getUser(req);
    const productId = req.query.product_id;
    if (!productId) return json(res, 400, { error: 'product_id required' });
    const limit = Math.min(12, Math.max(1, parseInt(req.query.limit) || 6));
    const { data, error, count } = await supabase.from('community_posts')
      .select('id,artwork_url,thumb_url,user_id,product_id,created_at', { count: 'exact' })
      .eq('status', 'published').eq('product_id', productId)
      .order('created_at', { ascending: false }).range(0, limit - 1);
    if (error) return json(res, 500, { error: error.message });
    const posts = await decorate(data || [], viewer?.id, req.query.guest_id);
    return json(res, 200, { posts, total: count || 0 });
  }

  // GET trending — most reactions in the last 7 days (fallback: recent posts)
  if (req.method === 'GET' && action === 'trending') {
    const viewer = await getUser(req);
    const limit = Math.min(16, Math.max(1, parseInt(req.query.limit) || 8));
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReactions } = await supabase.from('community_reactions').select('post_id').gte('created_at', since);
    const tally = {};
    (recentReactions || []).forEach(r => { tally[r.post_id] = (tally[r.post_id] || 0) + 1; });
    const topIds = Object.keys(tally).sort((a, b) => tally[b] - tally[a]).slice(0, limit);
    let posts = [];
    if (topIds.length) {
      const { data } = await supabase.from('community_posts').select('*').in('id', topIds).eq('status', 'published');
      posts = (data || []).sort((a, b) => (tally[b.id] || 0) - (tally[a.id] || 0));
    }
    if (posts.length < limit) {
      // top up with most recent (excluding already-included)
      const have = new Set(posts.map(p => p.id));
      const { data: recent } = await supabase.from('community_posts').select('*').eq('status', 'published').order('created_at', { ascending: false }).range(0, limit - 1);
      (recent || []).forEach(p => { if (!have.has(p.id) && posts.length < limit) posts.push(p); });
    }
    const out = await decorate(posts, viewer?.id, req.query.guest_id);
    return json(res, 200, { posts: out });
  }

  // GET creators — top creators by published post count
  if (req.method === 'GET' && action === 'creators') {
    const limit = Math.min(24, Math.max(1, parseInt(req.query.limit) || 12));
    const { data } = await supabase.from('community_posts').select('user_id').eq('status', 'published');
    const tally = {};
    (data || []).forEach(r => { if (r.user_id) tally[r.user_id] = (tally[r.user_id] || 0) + 1; });
    const topIds = Object.keys(tally).sort((a, b) => tally[b] - tally[a]).slice(0, limit);
    if (!topIds.length) return json(res, 200, { creators: [] });
    const { data: profiles } = await supabase.from('profiles').select('id,name,username,avatar_url,role,affiliate_enabled').in('id', topIds);
    const creators = topIds.map(id => {
      const u = (profiles || []).find(p => p.id === id);
      if (!u) return null;
      return { id: u.id, name: u.username || u.name || 'Fluffy Creator', avatar_url: u.avatar_url || null, badge: u.role === 'artist' ? 'artist' : (u.affiliate_enabled ? 'creator' : null), posts: tally[id] };
    }).filter(Boolean);
    return json(res, 200, { creators });
  }

  // GET facets — popular palettes & marker sets for filter chips (scan recent capped set)
  if (req.method === 'GET' && action === 'facets') {
    const { data } = await supabase.from('community_posts').select('palettes,markers').eq('status', 'published').order('created_at', { ascending: false }).range(0, 499);
    const countTags = (key) => {
      const t = {};
      (data || []).forEach(p => (p[key] || []).forEach(x => { const v = String(x).trim(); if (v) t[v] = (t[v] || 0) + 1; }));
      return Object.keys(t).sort((a, b) => t[b] - t[a]).slice(0, 12).map(name => ({ name, count: t[name] }));
    };
    return json(res, 200, { palettes: countTags('palettes'), markers: countTags('markers') });
  }

  // GET archive — months with post counts (cheap: created_at only)
  if (req.method === 'GET' && action === 'archive') {
    const { data } = await supabase.from('community_posts').select('created_at').eq('status', 'published');
    const months = {};
    (data || []).forEach(r => { const d = new Date(r.created_at); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; months[k] = (months[k] || 0) + 1; });
    const list = Object.keys(months).sort().reverse().map(k => ({ month: k, count: months[k] }));
    return json(res, 200, { months: list });
  }

  if (req.method === 'GET' && action === 'creator') {
    const viewer = await getUser(req);
    const uid = req.query.user_id;
    if (!uid) return json(res, 400, { error: 'user_id required' });
    const { data: profile } = await supabase.from('profiles')
      .select('id,name,username,avatar_url,bio,role,affiliate_enabled,artist_slug,created_at').eq('id', uid).single();
    if (!profile) return json(res, 404, { error: 'Creator not found' });
    const { data: posts } = await supabase.from('community_posts').select('*')
      .eq('status', 'published').eq('user_id', uid).order('created_at', { ascending: false });
    const decorated = await decorate(posts || [], viewer?.id, req.query.guest_id);
    const booksUsed = new Set((posts || []).map(p => p.product_id).filter(Boolean)).size;
    const palettes = new Set();
    (posts || []).forEach(p => (p.palettes || []).forEach(x => palettes.add(String(x).toLowerCase())));
    const creator = {
      id: profile.id, name: profile.username || profile.name || 'Fluffy Creator', avatar_url: profile.avatar_url || null,
      bio: profile.bio || '', joined: profile.created_at,
      badge: profile.role === 'artist' ? 'artist' : (profile.affiliate_enabled ? 'creator' : null),
      artist_slug: profile.role === 'artist' ? (profile.artist_slug || null) : null,
      stats: { posts: (posts || []).length, booksUsed, palettes: palettes.size },
    };
    return json(res, 200, { creator, posts: decorated });
  }

  if (req.method === 'POST' && !action) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const b = req.body || {};
    if (!b.artwork_url) return json(res, 400, { error: 'Artwork image is required.' });
    const asArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).slice(0, 20) : [];
    const row = {
      user_id: user.id, artwork_url: b.artwork_url, thumb_url: b.thumb_url || b.artwork_url,
      product_id: b.product_id || null,
      external_book_title: b.product_id ? null : (b.external_book_title || null),
      external_book_author: b.product_id ? null : (b.external_book_author || null),
      mediums: asArr(b.mediums), markers: asArr(b.markers), palettes: asArr(b.palettes),
      caption: (b.caption || '').slice(0, CAPTION_MAX), status: 'published',
    };
    const { data, error } = await supabase.from('community_posts').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    const [post] = await decorate([data], user.id);
    return json(res, 201, post);
  }

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
