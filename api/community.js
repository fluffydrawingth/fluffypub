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
  const extBookIds = [...new Set(posts.map(p => p.external_book_id).filter(Boolean))];
  const postIds = posts.map(p => p.id);
  const [{ data: users }, { data: prods }, { data: reactions }, { data: extBooks }] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id,name,username,avatar_url,artist_slug,role,affiliate_enabled').in('id', userIds) : Promise.resolve({ data: [] }),
    prodIds.length ? supabase.from('products').select('id,title,slug,image,cover_image_url').in('id', prodIds) : Promise.resolve({ data: [] }),
    postIds.length ? supabase.from('community_reactions').select('post_id,user_id,guest_id,type').in('post_id', postIds) : Promise.resolve({ data: [] }),
    extBookIds.length ? supabase.from('external_books').select('id,title,author,slug').in('id', extBookIds) : Promise.resolve({ data: [] }),
  ]);
  const uMap = Object.fromEntries((users || []).map(u => [u.id, u]));
  const pMap = Object.fromEntries((prods || []).map(p => [p.id, p]));
  const ebMap = Object.fromEntries((extBooks || []).map(b => [b.id, b]));
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
    const eb = post.external_book_id ? (ebMap[post.external_book_id] || null) : null;
    // Backward compat: ensure artwork_urls is always a populated array
    const urls = Array.isArray(post.artwork_urls) && post.artwork_urls.length ? post.artwork_urls : (post.artwork_url ? [post.artwork_url] : []);
    return {
      ...post,
      artwork_urls: urls,
      creator: u ? {
        id: u.id,
        name: u.username || u.name || 'Community Member',
        avatar_url: u.avatar_url || null,
        affiliate_enabled: !!u.affiliate_enabled,
        artist_slug: u.role === 'artist' ? (u.artist_slug || null) : null,
      } : null,
      product: pr ? { id: pr.id, title: pr.title, slug: pr.slug, image: pr.image, cover_image_url: pr.cover_image_url } : null,
      external_book: eb ? { id: eb.id, title: eb.title, author: eb.author, slug: eb.slug } : null,
      reactions: r.counts,
      reactionTotal: r.total,
      myReactions: r.mine,
    };
  });
}

function slugify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'book';
}

// Find an existing external book by normalized title+author, or create one.
// normalized_title = "title|author" (both lowercased) for case-insensitive dedup.
async function resolveExternalBook(title, author) {
  const t = String(title || '').trim();
  if (!t) return null;
  const a = String(author || '').trim();
  const normalized = (t + '|' + a).toLowerCase();
  try {
    const { data: existing } = await supabase.from('external_books').select('*').eq('normalized_title', normalized).single();
    if (existing) return existing;
    // Generate a unique slug
    const base = slugify(t);
    let slug = base, n = 1;
    while (n < 50) {
      const { data: clash } = await supabase.from('external_books').select('id').eq('slug', slug).single();
      if (!clash) break;
      slug = `${base}-${++n}`;
    }
    const { data, error } = await supabase.from('external_books').insert({ title: t, author: a || null, slug, normalized_title: normalized }).select('*').single();
    if (error) { // race: refetch
      const { data: again } = await supabase.from('external_books').select('*').eq('normalized_title', normalized).single();
      return again || null;
    }
    return data;
  } catch (_) { return null; }
}

// Recompute post_count + creator_count for an external book (published posts only).
async function recountExternalBook(bookId) {
  if (!bookId) return;
  try {
    const { data } = await supabase.from('community_posts').select('user_id').eq('status', 'published').eq('external_book_id', bookId);
    const posts = data || [];
    const creators = new Set(posts.map(p => p.user_id).filter(Boolean)).size;
    await supabase.from('external_books').update({ post_count: posts.length, creator_count: creators }).eq('id', bookId);
  } catch (_) { /* ignore */ }
}

// Submit each tag value as a pending community_tag if not already in the library.
// Silently skips errors (table may not exist yet) and ignores already-existing tags.
async function autoSubmitTags(mediums = [], markers = [], palettes = []) {
  const pairs = [
    ...mediums.map(n => ({ type: 'medium', name: n })),
    ...markers.map(n => ({ type: 'marker', name: n })),
    ...palettes.map(n => ({ type: 'palette', name: n })),
  ];
  for (const { type, name } of pairs) {
    const normalized = String(name).trim().toLowerCase();
    const display = String(name).trim();
    try {
      const { data: existing } = await supabase.from('community_tags').select('id').eq('type', type).eq('normalized', normalized).single();
      if (!existing) {
        await supabase.from('community_tags').insert({ type, name: display, normalized, status: 'pending' });
      }
    } catch (_) { /* table may not exist yet — ignore */ }
  }
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
      return { id: c.id, body: c.body, created_at: c.created_at, author: u ? { id: u.id, name: u.username || u.name || 'Community Member', avatar_url: u.avatar_url || null, affiliate_enabled: !!u.affiliate_enabled } : null };
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
    return json(res, 201, { id: data.id, body: data.body, created_at: data.created_at, author: { id: user.id, name: user.username || user.name || 'Community Member', avatar_url: user.avatar_url || null, affiliate_enabled: !!user.affiliate_enabled } });
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

  // GET list — paginated, newest first; optional product/user/palette/marker/medium filters
  if (req.method === 'GET' && (action === 'list' || !action)) {
    const viewer = await getUser(req);
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(req.query.limit) || 20));
    const from = page * limit;
    let q = supabase.from('community_posts').select('*', { count: 'exact' })
      .eq('status', 'published').order('created_at', { ascending: false });
    if (req.query.product_id) q = q.eq('product_id', req.query.product_id);
    if (req.query.external_book_id) q = q.eq('external_book_id', req.query.external_book_id);
    if (req.query.user_id) q = q.eq('user_id', req.query.user_id);
    if (req.query.palette) q = q.contains('palettes', [req.query.palette]);
    if (req.query.marker) q = q.contains('markers', [req.query.marker]);
    if (req.query.medium) q = q.contains('mediums', [req.query.medium]);
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

  // GET related — "You may also like": same book > same marker > same creator > recent
  if (req.method === 'GET' && action === 'related') {
    const viewer = await getUser(req);
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: base } = await supabase.from('community_posts').select('id,user_id,product_id,external_book_id,markers').eq('id', id).single();
    if (!base) return json(res, 200, { posts: [] });
    const picked = new Map();
    const add = (rows) => { for (const r of (rows || [])) { if (r.id !== id && !picked.has(r.id) && picked.size < 6) picked.set(r.id, r); } };
    const q = () => supabase.from('community_posts').select('*').eq('status', 'published').neq('id', id).order('created_at', { ascending: false }).limit(8);
    // 1. Same Fluffy Pub book / external book
    if (base.product_id) { const { data } = await q().eq('product_id', base.product_id); add(data); }
    if (picked.size < 6 && base.external_book_id) { const { data } = await q().eq('external_book_id', base.external_book_id); add(data); }
    // 2. Same marker
    if (picked.size < 6 && (base.markers || []).length) { const { data } = await q().overlaps('markers', base.markers); add(data); }
    // 3. Same creator
    if (picked.size < 6 && base.user_id) { const { data } = await q().eq('user_id', base.user_id); add(data); }
    // 4. Recent fallback
    if (picked.size < 6) { const { data } = await q(); add(data); }
    const decorated = await decorate([...picked.values()].slice(0, 6), viewer?.id, req.query.guest_id);
    return json(res, 200, { posts: decorated });
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
      return { id: u.id, name: u.username || u.name || 'Community Member', avatar_url: u.avatar_url || null, affiliate_enabled: !!u.affiliate_enabled, posts: tally[id] };
    }).filter(Boolean);
    return json(res, 200, { creators });
  }

  // GET external-books — autocomplete suggestions (q) or top books by usage
  if (req.method === 'GET' && action === 'external-books') {
    const qStr = String(req.query.q || '').trim();
    let q = supabase.from('external_books').select('id,title,author,slug,post_count,creator_count');
    if (qStr) q = q.ilike('title', `%${qStr}%`);
    q = q.order('post_count', { ascending: false }).order('title').range(0, qStr ? 7 : 23);
    const { data } = await q;
    return json(res, 200, { books: data || [] });
  }

  // GET external-book — dedicated page: book info + its community posts
  if (req.method === 'GET' && action === 'external-book') {
    const viewer = await getUser(req);
    const slug = req.query.slug;
    if (!slug) return json(res, 400, { error: 'slug required' });
    const { data: book } = await supabase.from('external_books').select('*').eq('slug', slug).single();
    if (!book) return json(res, 404, { error: 'Book not found' });
    const { data: posts } = await supabase.from('community_posts').select('*')
      .eq('status', 'published').eq('external_book_id', book.id).order('created_at', { ascending: false }).range(0, 47);
    const decorated = await decorate(posts || [], viewer?.id, req.query.guest_id);
    return json(res, 200, { book, posts: decorated });
  }

  // GET facets — popular palettes, marker sets, mediums, Fluffy Pub books & external books
  if (req.method === 'GET' && action === 'facets') {
    const { data } = await supabase.from('community_posts').select('palettes,markers,mediums,product_id,external_book_id').eq('status', 'published').order('created_at', { ascending: false }).range(0, 999);
    // Case-insensitive dedup: group by lowercase key, keep most-used display name
    const countTags = (key, limit = 16) => {
      const t = {}; // lowercase -> { count, display }
      (data || []).forEach(p => (p[key] || []).forEach(x => {
        const v = String(x).trim(); if (!v) return;
        const k = v.toLowerCase();
        if (!t[k]) t[k] = { count: 0, display: v };
        t[k].count++;
      }));
      return Object.values(t).sort((a, b) => b.count - a.count).slice(0, limit).map(({ display, count }) => ({ name: display, count }));
    };
    // Fluffy Pub books: count by product_id, resolve titles
    const bc = {};
    (data || []).forEach(p => { if (p.product_id) bc[p.product_id] = (bc[p.product_id] || 0) + 1; });
    const bookIds = Object.keys(bc).sort((a, b) => bc[b] - bc[a]).slice(0, 12);
    let books = [];
    if (bookIds.length) {
      const { data: prods } = await supabase.from('products').select('id,title,slug').in('id', bookIds);
      books = bookIds.map(id => { const pr = (prods || []).find(x => x.id === id); return pr ? { id, title: pr.title, slug: pr.slug, count: bc[id] } : null; }).filter(Boolean);
    }
    // External (community) books — kept separate; discovery only
    const ec = {};
    (data || []).forEach(p => { if (p.external_book_id) ec[p.external_book_id] = (ec[p.external_book_id] || 0) + 1; });
    const extIds = Object.keys(ec).sort((a, b) => ec[b] - ec[a]).slice(0, 12);
    let externalBooks = [];
    if (extIds.length) {
      const { data: ebs } = await supabase.from('external_books').select('id,title,author,slug').in('id', extIds);
      externalBooks = extIds.map(id => { const eb = (ebs || []).find(x => x.id === id); return eb ? { id, title: eb.title, author: eb.author, slug: eb.slug, count: ec[id] } : null; }).filter(Boolean);
    }
    return json(res, 200, { palettes: countTags('palettes'), markers: countTags('markers'), mediums: countTags('mediums'), books, externalBooks });
  }

  // GET cozy-picks — admin-pinned featured posts (manual, no expiry, max 6)
  if (req.method === 'GET' && action === 'cozy-picks') {
    const viewer = await getUser(req);
    const { data } = await supabase.from('community_posts').select('*')
      .eq('status', 'published').eq('featured', true)
      .order('featured_at', { ascending: false }).range(0, 5);
    const posts = await decorate(data || [], viewer?.id, req.query.guest_id);
    return json(res, 200, { posts });
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
      .select('id,name,username,avatar_url,bio,role,affiliate_enabled,artist_slug,created_at,community_about,community_country,community_favorite_medium').eq('id', uid).single();
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
      affiliate_enabled: !!profile.affiliate_enabled,
      artist_slug: profile.role === 'artist' ? (profile.artist_slug || null) : null,
      community_about: profile.community_about || null,
      community_country: profile.community_country || null,
      community_favorite_medium: profile.community_favorite_medium || null,
      stats: { posts: (posts || []).length, booksUsed, palettes: palettes.size },
    };
    return json(res, 200, { creator, posts: decorated });
  }

  if (req.method === 'POST' && !action) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const b = req.body || {};
    const asArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).slice(0, 20) : [];
    // Multiple images: artwork_urls array (max 10); cover = first image / explicit artwork_url
    const imgs = Array.isArray(b.artwork_urls) ? b.artwork_urls.filter(u => typeof u === 'string' && u.trim()).slice(0, 10) : [];
    const cover = b.artwork_url || imgs[0];
    if (!cover) return json(res, 400, { error: 'Artwork image is required.' });
    const artworkUrls = imgs.length ? imgs : [cover];
    // External book library: dedup-resolve to a canonical external_books row
    let externalBookId = null, extTitle = null, extAuthor = null;
    if (!b.product_id && b.external_book_title) {
      const bk = await resolveExternalBook(b.external_book_title, b.external_book_author);
      if (bk) { externalBookId = bk.id; extTitle = bk.title; extAuthor = bk.author; }
      else { extTitle = b.external_book_title; extAuthor = b.external_book_author || null; }
    }
    const row = {
      user_id: user.id, artwork_url: cover, artwork_urls: artworkUrls, thumb_url: b.thumb_url || cover,
      product_id: b.product_id || null,
      external_book_id: externalBookId,
      external_book_title: b.product_id ? null : extTitle,
      external_book_author: b.product_id ? null : extAuthor,
      mediums: asArr(b.mediums), markers: asArr(b.markers), palettes: asArr(b.palettes),
      caption: (b.caption || '').slice(0, CAPTION_MAX), status: 'published',
    };
    const { data, error } = await supabase.from('community_posts').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    // Fire-and-forget: submit custom tags to the Tag Library as pending; recount the book
    autoSubmitTags(row.mediums, row.markers, row.palettes).catch(() => {});
    if (externalBookId) recountExternalBook(externalBookId).catch(() => {});
    const [post] = await decorate([data], user.id);
    return json(res, 201, post);
  }

  if (req.method === 'DELETE') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: post } = await supabase.from('community_posts').select('user_id,external_book_id').eq('id', id).single();
    if (!post) return json(res, 404, { error: 'Not found' });
    if (post.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
    const { error } = await supabase.from('community_posts').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    if (post.external_book_id) recountExternalBook(post.external_book_id).catch(() => {});
    return json(res, 200, { success: true });
  }

  // PUT — edit a post (owner or admin). Artwork images, book, tags & caption editable.
  if (req.method === 'PUT') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: existing } = await supabase.from('community_posts').select('user_id,external_book_id').eq('id', id).single();
    if (!existing) return json(res, 404, { error: 'Not found' });
    if (existing.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
    const b = req.body || {};
    const asArr = (v) => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim()).slice(0, 20) : undefined;
    const updates = { updated_at: new Date().toISOString() };
    // Editable images
    if (Array.isArray(b.artwork_urls) && b.artwork_urls.length) {
      const imgs = b.artwork_urls.filter(u => typeof u === 'string' && u.trim()).slice(0, 10);
      if (imgs.length) { updates.artwork_urls = imgs; updates.artwork_url = imgs[0]; updates.thumb_url = b.thumb_url || imgs[0]; }
    }
    if (b.caption !== undefined) updates.caption = String(b.caption).slice(0, CAPTION_MAX);
    // Book change — resolve external book library, clear book if switching to product/none
    let newExtBookId = existing.external_book_id || null;
    if (b.product_id !== undefined && b.product_id) {
      updates.product_id = b.product_id;
      updates.external_book_id = null; updates.external_book_title = null; updates.external_book_author = null;
      newExtBookId = null;
    } else if (b.external_book_title !== undefined) {
      updates.product_id = null;
      const t = String(b.external_book_title || '').trim();
      if (t) {
        const bk = await resolveExternalBook(t, b.external_book_author);
        updates.external_book_id = bk ? bk.id : null;
        updates.external_book_title = bk ? bk.title : t;
        updates.external_book_author = bk ? bk.author : (b.external_book_author || null);
        newExtBookId = bk ? bk.id : null;
      } else {
        updates.external_book_id = null; updates.external_book_title = null; updates.external_book_author = null;
        newExtBookId = null;
      }
    } else if (b.product_id !== undefined && !b.product_id) {
      updates.product_id = null;
    }
    if (asArr(b.mediums) !== undefined) updates.mediums = asArr(b.mediums);
    if (asArr(b.markers) !== undefined) updates.markers = asArr(b.markers);
    if (asArr(b.palettes) !== undefined) updates.palettes = asArr(b.palettes);
    const { data, error } = await supabase.from('community_posts').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    autoSubmitTags(updates.mediums || [], updates.markers || [], updates.palettes || []).catch(() => {});
    // Recount both old and new external book if the link changed
    if (existing.external_book_id && existing.external_book_id !== newExtBookId) recountExternalBook(existing.external_book_id).catch(() => {});
    if (newExtBookId) recountExternalBook(newExtBookId).catch(() => {});
    const [post] = await decorate([data], user.id);
    return json(res, 200, post);
  }

  // ─────────────────── Admin: Community Dashboard ───────────────────

  // GET ?action=admin-stats — overview cards
  if (req.method === 'GET' && action === 'admin-stats') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    const [{ count: creations }, { data: creatorsRows }, { count: today }, { count: comments }, { count: cozy }] = await Promise.all([
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('community_posts').select('user_id').eq('status', 'published'),
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', startToday.toISOString()),
      supabase.from('community_comments').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('featured', true).gte('featured_at', since7),
    ]);
    const creators = new Set((creatorsRows || []).map(r => r.user_id).filter(Boolean)).size;
    return json(res, 200, { creations: creations || 0, creators, today: today || 0, comments: comments || 0, reports: 0, cozyPicks: cozy || 0, cozyMax: 6 });
  }

  // GET ?action=admin-list&status=&page= — all posts (any status) for moderation
  if (req.method === 'GET' && action === 'admin-list') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = 24;
    const from = page * limit;
    let q = supabase.from('community_posts').select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (req.query.status) q = q.eq('status', req.query.status);
    q = q.range(from, from + limit - 1);
    const { data, count } = await q;
    const posts = await decorate(data || [], admin.id);
    return json(res, 200, { posts, total: count || 0, page, hasMore: from + (data?.length || 0) < (count || 0) });
  }

  // POST ?action=admin-status&id= {status} — publish / hide / delete (soft)
  if (req.method === 'POST' && action === 'admin-status') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    const status = (req.body && req.body.status) || '';
    if (!id || !['published', 'hidden', 'deleted'].includes(status)) return json(res, 400, { error: 'id and valid status required' });
    const upd = { status, updated_at: new Date().toISOString() };
    if (status !== 'published') upd.featured = false; // hidden/deleted can't stay in Cozy Picks
    const { error } = await supabase.from('community_posts').update(upd).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // POST ?action=admin-feature&id= {on} — add/remove from This Week's Cozy Picks
  if (req.method === 'POST' && action === 'admin-feature') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const on = !(req.body && req.body.on === false);
    if (!on) {
      await supabase.from('community_posts').update({ featured: false, updated_at: new Date().toISOString() }).eq('id', id);
      return json(res, 200, { success: true });
    }
    const { data: post } = await supabase.from('community_posts').select('id,user_id,status').eq('id', id).single();
    if (!post) return json(res, 404, { error: 'Not found' });
    if (post.status !== 'published') return json(res, 400, { error: 'Only published posts can be featured.' });
    const { data: current } = await supabase.from('community_posts').select('id,user_id').eq('featured', true);
    const cur = current || [];
    if (cur.length >= 6) return json(res, 400, { error: 'Cozy Picks is full (max 6). Remove one first.' });
    await supabase.from('community_posts').update({ featured: true, featured_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id);
    return json(res, 200, { success: true });
  }

  // ─────────────────── Tag Library ───────────────────

  // GET ?action=tags&type=medium|marker|palette — approved tags for upload form
  if (req.method === 'GET' && action === 'tags') {
    const type = req.query.type;
    if (!['medium','marker','palette'].includes(type)) return json(res, 400, { error: 'type required' });
    const { data } = await supabase.from('community_tags').select('id,name,post_count').eq('type', type).eq('status','approved').order('post_count', { ascending: false }).order('name');
    return json(res, 200, { tags: data || [] });
  }

  // POST ?action=tag-submit — submit custom tag (creates pending if not in library)
  if (req.method === 'POST' && action === 'tag-submit') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { type, name } = req.body || {};
    if (!['medium','marker','palette'].includes(type) || !String(name||'').trim()) return json(res, 400, { error: 'type and name required' });
    const normalized = String(name).trim().toLowerCase();
    const display = String(name).trim();
    const { data: existing } = await supabase.from('community_tags').select('id,name,status').eq('type', type).eq('normalized', normalized).single();
    if (existing) return json(res, 200, { tag: existing });
    const { data, error } = await supabase.from('community_tags').insert({ type, name: display, normalized, status: 'pending' }).select('id,name,status').single();
    if (error) return json(res, 200, { tag: { name: display, status: 'pending' } }); // ignore unique conflict
    return json(res, 201, { tag: data });
  }

  // GET ?action=admin-tags — all tags for admin Tag Library
  if (req.method === 'GET' && action === 'admin-tags') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const type = req.query.type || '';
    let q = supabase.from('community_tags').select('*').order('status').order('post_count', { ascending: false }).order('name');
    if (type) q = q.eq('type', type);
    const { data } = await q;
    return json(res, 200, { tags: data || [] });
  }

  // POST ?action=admin-tag-approve&id= {name?} — approve (and optionally rename)
  if (req.method === 'POST' && action === 'admin-tag-approve') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const upd = { status: 'approved', reviewed_at: new Date().toISOString() };
    const name = (req.body || {}).name;
    if (name) { upd.name = String(name).trim(); upd.normalized = String(name).trim().toLowerCase(); }
    const { error } = await supabase.from('community_tags').update(upd).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // DELETE ?action=admin-tag&id= — delete a tag
  if (req.method === 'DELETE' && action === 'admin-tag') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('community_tags').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // ─────────────────── Community Curation ───────────────────

  // GET ?action=curation — resolved Featured Books + Creators from theme config
  if (req.method === 'GET' && action === 'curation') {
    const { data: themeRow } = await supabase.from('theme').select('config').eq('id', 1).single();
    const community = themeRow?.config?.community || {};
    const bookIds = community.featured_books || [];
    const creatorIds = community.featured_creators || [];
    const [{ data: books }, { data: creators }] = await Promise.all([
      bookIds.length ? supabase.from('products').select('id,title,slug,image,cover_image_url').in('id', bookIds) : Promise.resolve({ data: [] }),
      creatorIds.length ? supabase.from('profiles').select('id,name,username,avatar_url,community_about,community_country,community_favorite_medium,affiliate_enabled').in('id', creatorIds) : Promise.resolve({ data: [] }),
    ]);
    const bMap = Object.fromEntries((books||[]).map(b=>[b.id,b]));
    const cMap = Object.fromEntries((creators||[]).map(c=>[c.id,c]));
    return json(res, 200, {
      featured_books: bookIds.map(id=>bMap[id]).filter(Boolean),
      featured_creators: creatorIds.map(id=>{
        const c = cMap[id]; if (!c) return null;
        return { id:c.id, name:c.username||c.name||'Community Member', avatar_url:c.avatar_url||null, affiliate_enabled:!!c.affiliate_enabled, community_about:c.community_about||null, community_country:c.community_country||null, community_favorite_medium:c.community_favorite_medium||null };
      }).filter(Boolean),
    });
  }

  // POST ?action=admin-merge-tags {field, from:[...], to} — clean up duplicate tags
  if (req.method === 'POST' && action === 'admin-merge-tags') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { field, from, to } = req.body || {};
    if (!['mediums', 'markers', 'palettes'].includes(field) || !Array.isArray(from) || !from.length) return json(res, 400, { error: 'field, from[], to required' });
    const fromSet = new Set(from.map(s => String(s)));
    // Find posts that contain any of the source tags, then rewrite their array.
    const { data: rows } = await supabase.from('community_posts').select('id,' + field).overlaps(field, from);
    let changed = 0;
    for (const row of (rows || [])) {
      const arr = row[field] || [];
      const next = [];
      let hit = false;
      for (const v of arr) {
        if (fromSet.has(String(v))) { hit = true; if (to && !next.includes(to)) next.push(to); }
        else if (!next.includes(v)) next.push(v);
      }
      if (hit) { await supabase.from('community_posts').update({ [field]: next }).eq('id', row.id); changed++; }
    }
    return json(res, 200, { success: true, changed });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
