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
      recommended_tools: Array.isArray(post.recommended_tools) ? post.recommended_tools : [],
      creator: u ? {
        id: u.id,
        name: u.username || u.name || 'Community Member',
        avatar_url: u.avatar_url || null,
        affiliate_enabled: !!u.affiliate_enabled || u.role === 'admin',
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

// Sanitize per-post recommended coloring tools (Fluffy Creators only).
// Rules: max 2, must have a name, no duplicate URLs, only http(s) links.
function sanitizeTools(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  const seenUrls = new Set();
  for (const t of input) {
    const name = String(t?.name || '').trim().slice(0, 80);
    let url = String(t?.url || '').trim().slice(0, 500);
    if (!name) continue;
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (url) { const key = url.toLowerCase(); if (seenUrls.has(key)) continue; seenUrls.add(key); }
    out.push({ name, url: url || null });
    if (out.length >= 2) break;
  }
  return out;
}

// Keywords: search-only. Max 5, ≤20 chars each, trimmed, lowercased, de-duped.
function sanitizeKeywords(input) {
  if (!Array.isArray(input)) return [];
  const seen = new Set(); const out = [];
  for (const k of input) {
    const v = String(k || '').trim().toLowerCase().slice(0, 20);
    if (!v || seen.has(v)) continue;
    seen.add(v); out.push(v);
    if (out.length >= 5) break;
  }
  return out;
}

// Structured coloring details: [{ medium, brand? }]. Max 10 rows.
function sanitizeColoringDetails(input) {
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const d of input) {
    const medium = String(d?.medium || '').trim().slice(0, 60);
    const brand = String(d?.brand || '').trim().slice(0, 60);
    if (!medium) continue;
    out.push({ medium, brand: brand || null });
    if (out.length >= 10) break;
  }
  return out;
}

// ─── Google Translate helper (TH → EN, free tier) ─────────────────────────────
async function translateTH(text) {
  const src = String(text || '').trim();
  if (!src) return '';
  const encoded = encodeURIComponent(src);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encoded}`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const parsed = await r.json();
    return (parsed[0] || []).map(p => (p && p[0]) || '').join('').trim() || src;
  } catch (_) { return src; }
}
async function translateOrFallback(text) {
  const src = String(text || '').trim();
  if (!src) return '';
  const t = await translateTH(src);
  return t || src;
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

  // GET search — universal search across ALL posts (caption, book, creator, marker/medium/palette).
  // Tag-independent: a post with no tags is still found by caption/book/creator.
  if (req.method === 'GET' && action === 'search') {
    const viewer = await getUser(req);
    const term = String(req.query.q || '').trim().toLowerCase();
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(req.query.limit) || 12));
    if (!term) return json(res, 200, { posts: [], total: 0, page, hasMore: false });
    const { data: rows } = await supabase.from('community_posts').select('*')
      .eq('status', 'published').order('created_at', { ascending: false }).range(0, 999);
    const uids = [...new Set((rows || []).map(r => r.user_id).filter(Boolean))];
    const pids = [...new Set((rows || []).map(r => r.product_id).filter(Boolean))];
    const ebids = [...new Set((rows || []).map(r => r.external_book_id).filter(Boolean))];
    const [{ data: us }, { data: prs }, { data: ebs }] = await Promise.all([
      uids.length ? supabase.from('profiles').select('id,name,username').in('id', uids) : Promise.resolve({ data: [] }),
      pids.length ? supabase.from('products').select('id,title').in('id', pids) : Promise.resolve({ data: [] }),
      ebids.length ? supabase.from('external_books').select('id,title,author').in('id', ebids) : Promise.resolve({ data: [] }),
    ]);
    const uMap = Object.fromEntries((us || []).map(u => [u.id, u]));
    const pMap = Object.fromEntries((prs || []).map(p => [p.id, p]));
    const eMap = Object.fromEntries((ebs || []).map(b => [b.id, b]));
    const matched = (rows || []).filter(r => {
      const u = uMap[r.user_id]; const pr = pMap[r.product_id]; const eb = eMap[r.external_book_id];
      const hay = [
        r.caption, pr && pr.title, eb && eb.title, r.external_book_title, (eb && eb.author) || r.external_book_author,
        u && (u.username || u.name), ...(r.markers || []), ...(r.mediums || []), ...(r.palettes || []),
        ...(r.keywords || []), ...(Array.isArray(r.coloring_details) ? r.coloring_details.flatMap(d => [d && d.medium, d && d.brand]) : []),
      ].filter(Boolean).join('   ').toLowerCase();
      return hay.includes(term);
    });
    const from = page * limit;
    const slice = matched.slice(from, from + limit);
    const decorated = await decorate(slice, viewer?.id, req.query.guest_id);
    return json(res, 200, { posts: decorated, total: matched.length, page, hasMore: from + slice.length < matched.length });
  }

  // GET list — paginated, newest first; optional product/user/palette/marker/medium filters
  if (req.method === 'GET' && (action === 'list' || !action)) {
    const viewer = await getUser(req);
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = Math.min(PAGE_LIMIT_MAX, Math.max(1, parseInt(req.query.limit) || 12));
    const from = page * limit;

    // Tag filters (palettes/markers/mediums are jsonb) — filter in-memory by NORMALIZED
    // value so "Ohuhu" / "ohuhu" / "OHUHU" all match the same canonical tag.
    const tagField = req.query.palette ? 'palettes' : req.query.marker ? 'markers' : req.query.medium ? 'mediums' : null;
    const tagValue = req.query.palette || req.query.marker || req.query.medium || null;
    if (tagField && tagValue) {
      const norm = String(tagValue).trim().toLowerCase();
      let bq = supabase.from('community_posts').select('*').eq('status', 'published').order('created_at', { ascending: false }).range(0, 999);
      if (req.query.product_id) bq = bq.eq('product_id', req.query.product_id);
      if (req.query.user_id) bq = bq.eq('user_id', req.query.user_id);
      const { data: allRows, error: tagErr } = await bq;
      if (tagErr) return json(res, 500, { error: tagErr.message });
      const matched = (allRows || []).filter(p => (p[tagField] || []).some(x => String(x).trim().toLowerCase() === norm));
      const pageRows = matched.slice(from, from + limit);
      const out = await decorate(pageRows, viewer?.id, req.query.guest_id);
      return json(res, 200, { posts: out, total: matched.length, page, limit, hasMore: from + pageRows.length < matched.length });
    }

    let q = supabase.from('community_posts').select('*', { count: 'exact' })
      .eq('status', 'published').order('created_at', { ascending: false });
    if (req.query.product_id) q = q.eq('product_id', req.query.product_id);
    if (req.query.external_book_id) q = q.eq('external_book_id', req.query.external_book_id);
    if (req.query.user_id) q = q.eq('user_id', req.query.user_id);
    if (['artwork', 'tip'].includes(req.query.post_type)) q = q.eq('post_type', req.query.post_type);
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

  // GET related — "You may also like": same book > same marker/medium > same creator > cozy picks
  if (req.method === 'GET' && action === 'related') {
    const viewer = await getUser(req);
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: base } = await supabase.from('community_posts').select('id,user_id,product_id,external_book_id,markers,mediums').eq('id', id).single();
    if (!base) return json(res, 200, { posts: [] });
    const picked = new Map();
    const add = (rows) => { for (const r of (rows || [])) { if (r.id !== id && !picked.has(r.id) && picked.size < 6) picked.set(r.id, r); } };
    const q = () => supabase.from('community_posts').select('*').eq('status', 'published').neq('id', id).order('created_at', { ascending: false }).limit(8);
    // 1. Same Fluffy Pub book / external book
    if (base.product_id) { const { data } = await q().eq('product_id', base.product_id); add(data); }
    if (picked.size < 6 && base.external_book_id) { const { data } = await q().eq('external_book_id', base.external_book_id); add(data); }
    // 2. Same marker OR medium (jsonb — filter in-memory by normalized value)
    const wantedTags = new Set([...(base.markers || []), ...(base.mediums || [])].map(m => String(m).trim().toLowerCase()));
    if (picked.size < 6 && wantedTags.size) {
      const { data } = await supabase.from('community_posts').select('*').eq('status', 'published').neq('id', id).order('created_at', { ascending: false }).range(0, 199);
      add((data || []).filter(r => [...(r.markers || []), ...(r.mediums || [])].some(m => wantedTags.has(String(m).trim().toLowerCase()))));
    }
    // 3. Same creator
    if (picked.size < 6 && base.user_id) { const { data } = await q().eq('user_id', base.user_id); add(data); }
    // 4. Other Cozy Picks, then recent
    if (picked.size < 6) { const { data } = await q().eq('featured', true); add(data); }
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

  // GET creators — community directory (search + sort: featured | recent | az)
  if (req.method === 'GET' && action === 'creators') {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 50));
    const sort = req.query.sort || 'recent'; // featured | recent | az
    const qStr = String(req.query.q || '').trim().toLowerCase();
    // Tally posts and track last post date per user
    const { data: postRows } = await supabase.from('community_posts').select('user_id,created_at').eq('status', 'published');
    const tally = {};
    (postRows || []).forEach(r => {
      if (!r.user_id) return;
      if (!tally[r.user_id]) tally[r.user_id] = { posts: 0, last_post_at: r.created_at };
      tally[r.user_id].posts++;
      if (r.created_at > tally[r.user_id].last_post_at) tally[r.user_id].last_post_at = r.created_at;
    });
    const allIds = Object.keys(tally);
    if (!allIds.length) return json(res, 200, { creators: [] });
    const { data: profiles } = await supabase.from('profiles').select('id,name,username,avatar_url,role,affiliate_enabled,community_country,community_favorite_medium').in('id', allIds);
    let creators = (profiles || [])
      .filter(u => !qStr || (u.username || u.name || '').toLowerCase().includes(qStr))
      .map(u => ({ id: u.id, name: u.username || u.name || 'Community Member', avatar_url: u.avatar_url || null, affiliate_enabled: !!u.affiliate_enabled, posts: tally[u.id]?.posts || 0, last_post_at: tally[u.id]?.last_post_at || null, community_country: u.community_country || null, community_favorite_medium: u.community_favorite_medium || null }));
    if (sort === 'az') {
      creators.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'featured') {
      const { data: themeRow } = await supabase.from('theme').select('config').eq('id', 1).single();
      const featuredIds = themeRow?.config?.community?.featured_creators || [];
      const featuredSet = new Set(featuredIds);
      const featuredMap = Object.fromEntries(creators.filter(c => featuredSet.has(c.id)).map(c => [c.id, c]));
      const featured = featuredIds.map(id => featuredMap[id]).filter(Boolean);
      const rest = creators.filter(c => !featuredSet.has(c.id)).sort((a, b) => (b.last_post_at || '').localeCompare(a.last_post_at || ''));
      creators = [...featured, ...rest];
    } else {
      creators.sort((a, b) => (b.last_post_at || '').localeCompare(a.last_post_at || ''));
    }
    return json(res, 200, { creators: creators.slice(0, limit) });
  }

  // GET my-follows — return list of creator IDs the logged-in user follows
  if (req.method === 'GET' && action === 'my-follows') {
    const user = await getUser(req);
    if (!user) return json(res, 200, { follows: [] });
    const { data: profile } = await supabase.from('profiles').select('community_follows').eq('id', user.id).single();
    return json(res, 200, { follows: profile?.community_follows || [] });
  }

  // POST follow — add a creator to follows
  if (req.method === 'POST' && action === 'follow') {
    const user = await requireAuth(req, res); if (!user) return;
    const { creator_id } = req.body || {};
    if (!creator_id) return json(res, 400, { error: 'creator_id required' });
    const { data: profile } = await supabase.from('profiles').select('community_follows').eq('id', user.id).single();
    const follows = Array.isArray(profile?.community_follows) ? profile.community_follows : [];
    if (!follows.includes(creator_id)) {
      const { error } = await supabase.from('profiles').update({ community_follows: [...follows, creator_id] }).eq('id', user.id);
      if (error) return json(res, 500, { error: error.message });
    }
    return json(res, 200, { ok: true });
  }

  // DELETE follow — remove a creator from follows
  if (req.method === 'DELETE' && action === 'follow') {
    const user = await requireAuth(req, res); if (!user) return;
    const creator_id = req.query.creator_id || (req.body || {}).creator_id;
    if (!creator_id) return json(res, 400, { error: 'creator_id required' });
    const { data: profile } = await supabase.from('profiles').select('community_follows').eq('id', user.id).single();
    const follows = (Array.isArray(profile?.community_follows) ? profile.community_follows : []).filter(id => id !== creator_id);
    const { error } = await supabase.from('profiles').update({ community_follows: follows }).eq('id', user.id);
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, { ok: true });
  }

  // GET followed-creators — profiles of creators the user follows (for account page)
  if (req.method === 'GET' && action === 'followed-creators') {
    const user = await getUser(req);
    if (!user) return json(res, 200, { creators: [] });
    const { data: profile } = await supabase.from('profiles').select('community_follows').eq('id', user.id).single();
    const ids = profile?.community_follows || [];
    if (!ids.length) return json(res, 200, { creators: [] });
    const { data: profiles } = await supabase.from('profiles').select('id,name,username,avatar_url,role,affiliate_enabled,community_country,community_favorite_medium').in('id', ids);
    // Also get post count for each
    const { data: postRows } = await supabase.from('community_posts').select('user_id').eq('status', 'published').in('user_id', ids);
    const tally = {};
    (postRows || []).forEach(r => { tally[r.user_id] = (tally[r.user_id] || 0) + 1; });
    const creators = (profiles || []).map(u => ({ id: u.id, name: u.username || u.name || 'Community Member', avatar_url: u.avatar_url || null, affiliate_enabled: !!u.affiliate_enabled, posts: tally[u.id] || 0, community_country: u.community_country || null, community_favorite_medium: u.community_favorite_medium || null }));
    return json(res, 200, { creators });
  }

  // GET saved-posts — posts the logged-in user bookmarked (save reaction)
  if (req.method === 'GET' && action === 'saved-posts') {
    const user = await getUser(req);
    if (!user) return json(res, 200, { posts: [] });
    const { data: saves } = await supabase.from('community_reactions').select('post_id').eq('user_id', user.id).eq('type', 'save');
    const ids = (saves || []).map(r => r.post_id).filter(Boolean);
    if (!ids.length) return json(res, 200, { posts: [] });
    const { data: posts } = await supabase.from('community_posts').select('*').eq('status', 'published').in('id', ids).order('created_at', { ascending: false });
    const decorated = await decorate(posts || [], user.id, null);
    return json(res, 200, { posts: decorated });
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

  // GET external-authors — distinct author/brand suggestions for autocomplete
  if (req.method === 'GET' && action === 'external-authors') {
    const qStr = String(req.query.q || '').trim();
    let q = supabase.from('external_books').select('author').not('author', 'is', null);
    if (qStr) q = q.ilike('author', `%${qStr}%`);
    const { data } = await q.range(0, 99);
    // De-dupe case-insensitively, keep first-seen spelling
    const seen = new Set(); const authors = [];
    for (const r of (data || [])) {
      const a = String(r.author || '').trim();
      if (!a) continue;
      const k = a.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k); authors.push(a);
      if (authors.length >= 8) break;
    }
    return json(res, 200, { authors });
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
      .select('id,name,username,avatar_url,bio,role,affiliate_enabled,artist_slug,created_at,community_about,community_country,community_favorite_medium,social_links').eq('id', uid).single();
    if (!profile) return json(res, 404, { error: 'Creator not found' });
    const { data: posts } = await supabase.from('community_posts').select('*')
      .eq('status', 'published').eq('user_id', uid).order('created_at', { ascending: false });
    const decorated = await decorate(posts || [], viewer?.id, req.query.guest_id);
    const booksUsed = new Set((posts || []).map(p => p.product_id).filter(Boolean)).size;
    const paletteTally = {};
    (posts || []).forEach(p => (p.palettes || []).forEach(x => { const k = String(x).trim().toLowerCase(); if (k) paletteTally[k] = (paletteTally[k] || { name: String(x).trim(), count: 0 }), paletteTally[k].count++; }));
    const palettes = new Set(Object.keys(paletteTally));
    const favorite_palette = Object.values(paletteTally).sort((a, b) => b.count - a.count)[0]?.name || null;
    const creator = {
      id: profile.id, name: profile.username || profile.name || 'Fluffy Creator', avatar_url: profile.avatar_url || null,
      bio: profile.bio || '', joined: profile.created_at,
      affiliate_enabled: !!profile.affiliate_enabled,
      artist_slug: profile.role === 'artist' ? (profile.artist_slug || null) : null,
      community_about: profile.community_about || null,
      community_country: profile.community_country || null,
      community_favorite_medium: profile.community_favorite_medium || null,
      favorite_palette,
      // Fluffy Creator profile — stored in social_links.creator (only shown when affiliate_enabled)
      creator_bio: profile.affiliate_enabled ? (profile.social_links?.creator?.bio || null) : null,
      creator_tiktok: profile.affiliate_enabled ? (profile.social_links?.creator?.tiktok || null) : null,
      creator_instagram: profile.affiliate_enabled ? (profile.social_links?.creator?.instagram || null) : null,
      creator_youtube: profile.affiliate_enabled ? (profile.social_links?.creator?.youtube || null) : null,
      creator_website: profile.affiliate_enabled ? (profile.social_links?.creator?.website || null) : null,
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
    // Affiliate links — Fluffy Creators or Admins only; max 2, deduped
    const canAffiliate = user.affiliate_enabled || user.role === 'admin';
    const recommendedTools = canAffiliate ? sanitizeTools(b.recommended_tools) : [];
    const row = {
      user_id: user.id, artwork_url: cover, artwork_urls: artworkUrls, thumb_url: b.thumb_url || cover,
      post_type: ['artwork', 'tip', 'tools'].includes(b.post_type) ? b.post_type : 'artwork',
      product_id: b.product_id || null,
      external_book_id: externalBookId,
      external_book_title: b.product_id ? null : extTitle,
      external_book_author: b.product_id ? null : extAuthor,
      mediums: asArr(b.mediums), markers: asArr(b.markers), palettes: asArr(b.palettes),
      recommended_tools: recommendedTools,
      keywords: sanitizeKeywords(b.keywords),
      coloring_details: sanitizeColoringDetails(b.coloring_details),
      caption: (b.caption || '').slice(0, CAPTION_MAX), status: 'published',
    };
    let { data, error } = await supabase.from('community_posts').insert(row).select().single();
    // Resilience: drop not-yet-migrated optional columns and retry
    if (error && /(recommended_tools|keywords|coloring_details|post_type)/.test(error.message || '')) {
      const { recommended_tools, keywords, coloring_details, post_type, ...rest } = row;
      ({ data, error } = await supabase.from('community_posts').insert(rest).select().single());
    }
    if (error) return json(res, 400, { error: error.message });
    // Fire-and-forget: submit custom tags to the Tag Library as pending; recount the book
    autoSubmitTags(row.mediums, row.markers, row.palettes).catch(() => {});
    if (externalBookId) recountExternalBook(externalBookId).catch(() => {});
    const [post] = await decorate([data], user.id);
    return json(res, 201, post);
  }

  // Plain DELETE (no action) = delete a post. Action-specific DELETEs (admin-tag,
  // admin-tag-by-name, admin-book, comment) are handled in their own branches.
  if (req.method === 'DELETE' && !action) {
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
    // Affiliate links — Fluffy Creators or Admins only; max 2, deduped
    if (b.recommended_tools !== undefined) updates.recommended_tools = (user.affiliate_enabled || user.role === 'admin') ? sanitizeTools(b.recommended_tools) : [];
    if (b.keywords !== undefined) updates.keywords = sanitizeKeywords(b.keywords);
    if (b.coloring_details !== undefined) updates.coloring_details = sanitizeColoringDetails(b.coloring_details);
    if (b.post_type !== undefined && ['artwork', 'tip', 'tools'].includes(b.post_type)) updates.post_type = b.post_type;
    let { data, error } = await supabase.from('community_posts').update(updates).eq('id', id).select().single();
    // Resilience: drop not-yet-migrated optional columns and retry
    if (error && /(recommended_tools|keywords|coloring_details|post_type)/.test(error.message || '')) {
      const { recommended_tools, keywords, coloring_details, post_type, ...rest } = updates;
      ({ data, error } = await supabase.from('community_posts').update(rest).eq('id', id).select().single());
    }
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

  // GET ?action=admin-list&status=&page=&q=&featured=&date_from=&date_to= — moderation table
  if (req.method === 'GET' && action === 'admin-list') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const page = Math.max(0, parseInt(req.query.page) || 0);
    const limit = 20;
    const from = page * limit;
    // Direct column filters (status / cozy pick / date) applied in DB
    let q = supabase.from('community_posts').select('*').order('created_at', { ascending: false });
    if (req.query.status) q = q.eq('status', req.query.status);
    if (req.query.featured === '1') q = q.eq('featured', true);
    if (req.query.date_from) q = q.gte('created_at', new Date(req.query.date_from).toISOString());
    if (req.query.date_to) { const d = new Date(req.query.date_to); d.setHours(23, 59, 59, 999); q = q.lte('created_at', d.toISOString()); }
    q = q.range(0, 999); // cap; decorate + text-filter + paginate in memory
    const { data } = await q;
    let posts = await decorate(data || [], admin.id);
    // Text search across creator name, book title (Fluffy Pub + external)
    const term = String(req.query.q || '').trim().toLowerCase();
    if (term) {
      posts = posts.filter(pt => {
        const creator = (pt.creator?.name || '').toLowerCase();
        const book = (pt.product?.title || pt.external_book?.title || pt.external_book_title || '').toLowerCase();
        return creator.includes(term) || book.includes(term);
      });
    }
    const total = posts.length;
    const pageRows = posts.slice(from, from + limit);
    return json(res, 200, { posts: pageRows, total, page, hasMore: from + pageRows.length < total });
  }


  // GET ?action=admin-creators-search&q= — search all community members (any with posts)
  if (req.method === 'GET' && action === 'admin-creators-search') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const term = String(req.query.q || '').trim();
    const { data: postUsers } = await supabase.from('community_posts').select('user_id').eq('status', 'published');
    const postUserIds = [...new Set((postUsers || []).map(r => r.user_id).filter(Boolean))];
    if (!postUserIds.length) return json(res, 200, { creators: [] });
    let q = supabase.from('profiles').select('id,name,username,email,avatar_url').in('id', postUserIds);
    if (term) q = q.or(`name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`);
    const { data } = await q.order('name').range(0, 9);
    const creators = (data || []).map(u => ({ id: u.id, name: u.username || u.name || u.email || 'Creator', email: u.email || '', avatar_url: u.avatar_url || null }));
    return json(res, 200, { creators });
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

  // ─────────────────── Admin: External Book Library ───────────────────

  // GET ?action=admin-books — all external books with usage counts
  if (req.method === 'GET' && action === 'admin-books') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { data } = await supabase.from('external_books').select('*').order('post_count', { ascending: false }).order('title');
    return json(res, 200, { books: data || [] });
  }

  // POST ?action=admin-book-rename&id= {title,author} — rename a book (and its author/brand)
  if (req.method === 'POST' && action === 'admin-book-rename') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    const title = String((req.body || {}).title || '').trim();
    const author = String((req.body || {}).author || '').trim();
    if (!id || !title) return json(res, 400, { error: 'id and title required' });
    const normalized = (title + '|' + author).toLowerCase();
    const { error } = await supabase.from('external_books').update({ title, author: author || null, normalized_title: normalized }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // POST ?action=admin-book-merge {from:[ids], to:id} — repoint posts, delete dupes
  if (req.method === 'POST' && action === 'admin-book-merge') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { from, to } = req.body || {};
    if (!Array.isArray(from) || !from.length || !to) return json(res, 400, { error: 'from[] and to required' });
    const sources = from.filter(x => x !== to);
    if (!sources.length) return json(res, 200, { success: true, changed: 0 });
    const { data: target } = await supabase.from('external_books').select('title,author').eq('id', to).single();
    // Repoint posts from each source to the target
    await supabase.from('community_posts').update({ external_book_id: to, external_book_title: target?.title || null, external_book_author: target?.author || null }).in('external_book_id', sources);
    await supabase.from('external_books').delete().in('id', sources);
    await recountExternalBook(to);
    return json(res, 200, { success: true });
  }

  // DELETE ?action=admin-book&id= — delete a book; affected posts become untagged (book cleared)
  if (req.method === 'DELETE' && action === 'admin-book') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    // Clear the book reference on posts so nothing breaks (posts remain, just untagged)
    await supabase.from('community_posts').update({ external_book_id: null, external_book_title: null, external_book_author: null }).eq('external_book_id', id);
    const { error } = await supabase.from('external_books').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // ─────────────────── Tag Library ───────────────────

  // GET ?action=tags&type=medium|marker|palette[&medium=] — approved tags for upload form
  if (req.method === 'GET' && action === 'tags') {
    const type = req.query.type;
    if (!['medium','marker','palette','challenge'].includes(type)) return json(res, 400, { error: 'type required' });
    let base = supabase.from('community_tags').select('id,name,post_count').eq('type', type).eq('status','approved').order('post_count', { ascending: false }).order('name');
    if (type === 'marker' && req.query.medium) {
      // Filter by medium — attempt with eq(); if medium column doesn't exist yet
      // (migration not run), fall back to returning all approved markers for this type.
      const { data: filtered, error: filterErr } = await supabase
        .from('community_tags').select('id,name,post_count')
        .eq('type', type).eq('status','approved').eq('medium', String(req.query.medium))
        .order('post_count', { ascending: false }).order('name');
      if (!filterErr) return json(res, 200, { tags: filtered || [] });
      console.warn('[tags] medium filter failed (migration not run?), returning all:', filterErr.message);
      // Fall through to unfiltered query below
    }
    const { data } = await base;
    return json(res, 200, { tags: data || [] });
  }

  // POST ?action=tag-submit — submit custom tag (creates pending if not in library)
  if (req.method === 'POST' && action === 'tag-submit') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { type, name, medium } = req.body || {};
    if (!['medium','marker','palette','challenge'].includes(type) || !String(name||'').trim()) return json(res, 400, { error: 'type and name required' });
    const normalized = String(name).trim().toLowerCase();
    const display = String(name).trim();
    // Check for existing tag — select only stable columns (no medium, it may not exist yet)
    const { data: existing } = await supabase.from('community_tags').select('id,name,status').eq('type', type).eq('normalized', normalized).single();
    if (existing) {
      console.log('[tag-submit] tag already exists:', existing);
      return json(res, 200, { tag: existing });
    }
    // Insert WITHOUT medium first — this always works regardless of migration state
    const { data: inserted, error: insertErr } = await supabase
      .from('community_tags').insert({ type, name: display, normalized, status: 'pending' })
      .select('id,name,status').single();
    if (insertErr) {
      console.error('[tag-submit] insert error:', insertErr.message);
      return json(res, 500, { error: insertErr.message });
    }
    console.log('[tag-submit] inserted tag:', inserted);
    // If medium was provided, try to set it via a separate UPDATE (silently skipped if column missing)
    if (medium && type === 'marker' && inserted?.id) {
      const { error: medErr } = await supabase.from('community_tags').update({ medium: String(medium).trim() }).eq('id', inserted.id);
      if (medErr) console.warn('[tag-submit] could not set medium (migration not run?):', medErr.message);
    }
    return json(res, 201, { tag: inserted });
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

  // GET ?action=admin-all-tags&type=medium|marker|palette — EVERY tag actually in use
  // (aggregated from post arrays) UNIONed with the community_tags library, so the admin
  // can clean up real data even for tags that were never formally added to the library.
  if (req.method === 'GET' && action === 'admin-all-tags') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const type = req.query.type;
    const field = type === 'medium' ? 'mediums' : type === 'marker' ? 'markers' : type === 'palette' ? 'palettes' : null;
    if (!field) return json(res, 400, { error: 'type must be medium|marker|palette' });
    // 1) Count distinct values used across published posts (case-insensitive)
    const { data: rows } = await supabase.from('community_posts').select(field).eq('status', 'published').range(0, 9999);
    const used = {}; // normalized -> { name, count }
    (rows || []).forEach(r => (r[field] || []).forEach(v => {
      const name = String(v).trim(); if (!name) return;
      const key = name.toLowerCase();
      if (!used[key]) used[key] = { name, count: 0 };
      used[key].count++;
    }));
    // 2) Merge in the community_tags library (status + id)
    const { data: libRows } = await supabase.from('community_tags').select('*').eq('type', type);
    const lib = {};
    (libRows || []).forEach(t => { lib[(t.normalized || t.name || '').toLowerCase()] = t; });
    const keys = new Set([...Object.keys(used), ...Object.keys(lib)]);
    const tags = [...keys].map(key => {
      const u = used[key]; const l = lib[key];
      return {
        id: l ? l.id : null,
        name: (l && l.name) || (u && u.name) || key,
        normalized: key,
        medium: l ? (l.medium || null) : null,
        status: l ? l.status : 'unmanaged',   // approved | pending | unmanaged (used on posts, not in library)
        count: u ? u.count : 0,
      };
    }).sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
    return json(res, 200, { tags, field });
  }

  // DELETE ?action=admin-tag-by-name&type=&name= — strip a tag from posts + remove from library
  if (req.method === 'DELETE' && action === 'admin-tag-by-name') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const type = req.query.type;
    const name = String(req.query.name || '').trim();
    const field = type === 'medium' ? 'mediums' : type === 'marker' ? 'markers' : type === 'palette' ? 'palettes' : null;
    if (!field || !name) return json(res, 400, { error: 'type and name required' });
    const norm = name.toLowerCase();
    // Remove from library
    await supabase.from('community_tags').delete().eq('type', type).eq('normalized', norm);
    // Strip from posts
    const { data: rows } = await supabase.from('community_posts').select('id,' + field).range(0, 9999);
    for (const row of (rows || [])) {
      const arr = row[field] || [];
      if (arr.some(v => String(v).trim().toLowerCase() === norm)) {
        await supabase.from('community_posts').update({ [field]: arr.filter(v => String(v).trim().toLowerCase() !== norm) }).eq('id', row.id);
      }
    }
    return json(res, 200, { success: true });
  }

  // POST ?action=admin-tag-status {type, name, status} — set a tag's status
  // (approved | pending | hidden). Creates the library row if the tag was only used
  // on posts (unmanaged). Hidden/pending tags are NOT offered as form suggestions.
  if (req.method === 'POST' && action === 'admin-tag-status') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { type, name, status } = req.body || {};
    if (!['medium','marker','palette','challenge'].includes(type) || !String(name||'').trim()) return json(res, 400, { error: 'type and name required' });
    if (!['approved','pending','hidden'].includes(status)) return json(res, 400, { error: 'invalid status' });
    const display = String(name).trim();
    const normalized = display.toLowerCase();
    const { data: existing } = await supabase.from('community_tags').select('id').eq('type', type).eq('normalized', normalized).single();
    if (existing) {
      await supabase.from('community_tags').update({ status, reviewed_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('community_tags').insert({ type, name: display, normalized, status });
    }
    return json(res, 200, { success: true });
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

  // POST ?action=admin-tag-update&id= {name?,medium?,status?} — edit a library tag's fields
  if (req.method === 'POST' && action === 'admin-tag-update') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { name, medium, status } = req.body || {};
    const upd = {};
    if (name) { upd.name = String(name).trim(); upd.normalized = String(name).trim().toLowerCase(); }
    if (medium !== undefined) upd.medium = medium ? String(medium).trim() : null;
    if (status && ['approved','pending','hidden'].includes(status)) upd.status = status;
    if (!Object.keys(upd).length) return json(res, 400, { error: 'nothing to update' });
    const { error } = await supabase.from('community_tags').update(upd).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // DELETE ?action=admin-tag&id= — delete a tag AND strip it from posts (posts stay, untagged)
  if (req.method === 'DELETE' && action === 'admin-tag') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { data: tag } = await supabase.from('community_tags').select('type,name,normalized').eq('id', id).single();
    const { error } = await supabase.from('community_tags').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    // Strip the tag value from any posts that used it (case-insensitive), keeping posts intact
    if (tag) {
      const field = tag.type === 'medium' ? 'mediums' : tag.type === 'marker' ? 'markers' : 'palettes';
      const norm = (tag.normalized || tag.name || '').toLowerCase();
      const { data: rows } = await supabase.from('community_posts').select('id,' + field).range(0, 9999);
      for (const row of (rows || [])) {
        const arr = row[field] || [];
        if (arr.some(v => String(v).trim().toLowerCase() === norm)) {
          const next = arr.filter(v => String(v).trim().toLowerCase() !== norm);
          await supabase.from('community_posts').update({ [field]: next }).eq('id', row.id);
        }
      }
    }
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
      // Any community member can be featured (not just Fluffy Creators)
      featured_creators: creatorIds.map(id=>{
        const c = cMap[id]; if (!c) return null;
        return { id:c.id, name:c.username||c.name||'Community Member', avatar_url:c.avatar_url||null, affiliate_enabled:!!c.affiliate_enabled, community_country:c.community_country||null, community_favorite_medium:c.community_favorite_medium||null };
      }).filter(Boolean),
    });
  }

  // POST ?action=admin-merge-tags {field, from:[...], to} — clean up duplicate tags
  if (req.method === 'POST' && action === 'admin-merge-tags') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { field, from, to } = req.body || {};
    if (!['mediums', 'markers', 'palettes'].includes(field) || !Array.isArray(from) || !from.length) return json(res, 400, { error: 'field, from[], to required' });
    // Match source tags case-insensitively (jsonb — scan in-memory)
    const fromSet = new Set(from.map(s => String(s).trim().toLowerCase()));
    const { data: rows } = await supabase.from('community_posts').select('id,' + field).range(0, 9999);
    let changed = 0;
    for (const row of (rows || [])) {
      const arr = row[field] || [];
      const next = [];
      let hit = false;
      for (const v of arr) {
        if (fromSet.has(String(v).trim().toLowerCase())) { hit = true; if (to && !next.includes(to)) next.push(to); }
        else if (!next.includes(v)) next.push(v);
      }
      if (hit) { await supabase.from('community_posts').update({ [field]: next }).eq('id', row.id); changed++; }
    }
    return json(res, 200, { success: true, changed });
  }

  // ─────────────────── Highlights & Events ───────────────────

  // GET ?action=header-highlights — public, active items pinned to header (max 3)
  if (req.method === 'GET' && action === 'header-highlights') {
    const { data } = await supabase.from('community_highlights').select('*').eq('status', 'active').eq('show_in_header', true).order('sort_order').order('start_date', { ascending: false }).limit(3);
    return json(res, 200, { highlights: data || [] });
  }

  // GET ?action=highlights[&type=challenge|giveaway|...] — public, active items only
  if (req.method === 'GET' && action === 'highlights') {
    const type = req.query.type;
    const id = req.query.id;
    if (id) {
      const { data } = await supabase.from('community_highlights').select('*').eq('id', id).eq('status', 'active').single();
      if (!data) return json(res, 404, { error: 'Not found' });
      return json(res, 200, { highlight: data });
    }
    let q = supabase.from('community_highlights').select('*').eq('status', 'active').order('sort_order').order('start_date', { ascending: false });
    if (type && ['challenge','giveaway','announcement','partner','sponsored'].includes(type)) q = q.eq('type', type);
    const { data } = await q;
    return json(res, 200, { highlights: data || [] });
  }

  // GET ?action=admin-highlights — admin: all items (any status)
  if (req.method === 'GET' && action === 'admin-highlights') {
    const admin = await requireAuth(req, res, ['admin']); if (!admin) return;
    const { data } = await supabase.from('community_highlights').select('*').order('sort_order').order('created_at', { ascending: false });
    return json(res, 200, { highlights: data || [] });
  }

  // POST ?action=admin-highlight — admin: create
  if (req.method === 'POST' && action === 'admin-highlight') {
    const admin = await requireAuth(req, res, ['admin']); if (!admin) return;
    const b = req.body || {};
    const TYPES = ['challenge','giveaway','announcement','partner','sponsored'];
    if (!String(b.title||'').trim()) return json(res, 400, { error: 'title required' });
    if (!TYPES.includes(b.type)) return json(res, 400, { error: 'invalid type' });
    const row = {
      title: String(b.title||b.title_th||'').trim().slice(0, 120),
      title_th: b.title_th ? String(b.title_th).trim().slice(0, 120) : null,
      title_en: b.title_en ? String(b.title_en).trim().slice(0, 120) : null,
      type: b.type,
      cover_image: b.cover_image || null,
      description: b.description ? String(b.description).slice(0, 500) : null,
      description_th: b.description_th ? String(b.description_th).slice(0, 500) : null,
      description_en: b.description_en ? String(b.description_en).slice(0, 500) : null,
      start_date: b.start_date || null,
      end_date: b.end_date || null,
      link_url: b.link_url || null,
      status: ['draft','active','expired'].includes(b.status) ? b.status : 'draft',
      sort_order: parseInt(b.sort_order) || 0,
      content_blocks: Array.isArray(b.content_blocks) ? b.content_blocks : [],
      card_size: ['sm','md','lg'].includes(b.card_size) ? b.card_size : 'md',
      show_in_header: !!b.show_in_header,
    };
    const { data, error } = await supabase.from('community_highlights').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, { highlight: data });
  }

  // POST ?action=admin-highlight-update&id= — admin: update (POST avoids PUT routing issues)
  if (req.method === 'POST' && action === 'admin-highlight-update') {
    const admin = await requireAuth(req, res, ['admin']); if (!admin) return;
    const { id } = req.query; if (!id) return json(res, 400, { error: 'id required' });
    const b = req.body || {};
    const TYPES = ['challenge','giveaway','announcement','partner','sponsored'];
    const upd = { updated_at: new Date().toISOString() };
    if (b.title !== undefined) upd.title = String(b.title||b.title_th||'').trim().slice(0, 120);
    if (b.title_th !== undefined) upd.title_th = b.title_th ? String(b.title_th).trim().slice(0, 120) : null;
    if (b.title_en !== undefined) upd.title_en = b.title_en ? String(b.title_en).trim().slice(0, 120) : null;
    if (b.type !== undefined && TYPES.includes(b.type)) upd.type = b.type;
    if (b.cover_image !== undefined) upd.cover_image = b.cover_image || null;
    if (b.description !== undefined) upd.description = b.description ? String(b.description).slice(0, 500) : null;
    if (b.description_th !== undefined) upd.description_th = b.description_th ? String(b.description_th).slice(0, 500) : null;
    if (b.description_en !== undefined) upd.description_en = b.description_en ? String(b.description_en).slice(0, 500) : null;
    if (b.start_date !== undefined) upd.start_date = b.start_date || null;
    if (b.end_date !== undefined) upd.end_date = b.end_date || null;
    if (b.link_url !== undefined) upd.link_url = b.link_url || null;
    if (b.status !== undefined && ['draft','active','expired'].includes(b.status)) upd.status = b.status;
    if (b.sort_order !== undefined) upd.sort_order = parseInt(b.sort_order) || 0;
    if (b.content_blocks !== undefined) upd.content_blocks = Array.isArray(b.content_blocks) ? b.content_blocks : [];
    if (b.card_size !== undefined && ['sm','md','lg'].includes(b.card_size)) upd.card_size = b.card_size;
    if (b.show_in_header !== undefined) upd.show_in_header = !!b.show_in_header;
    const { error } = await supabase.from('community_highlights').update(upd).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // POST ?action=admin-highlight-translate&id= — auto-translate TH → EN (admin)
  if (req.method === 'POST' && action === 'admin-highlight-translate') {
    const admin = await requireAuth(req, res, ['admin']); if (!admin) return;
    const { id } = req.query; if (!id) return json(res, 400, { error: 'id required' });
    const { data: hl } = await supabase.from('community_highlights').select('title_th,description_th').eq('id', id).single();
    if (!hl) return json(res, 404, { error: 'Not found' });
    const [title_en, description_en] = await Promise.all([
      hl.title_th ? translateOrFallback(hl.title_th) : Promise.resolve(null),
      hl.description_th ? translateOrFallback(hl.description_th) : Promise.resolve(null),
    ]);
    const upd = { updated_at: new Date().toISOString() };
    if (title_en) upd.title_en = title_en;
    if (description_en) upd.description_en = description_en;
    await supabase.from('community_highlights').update(upd).eq('id', id);
    return json(res, 200, { title_en, description_en });
  }

  // DELETE ?action=admin-highlight&id= — admin: delete
  if (req.method === 'DELETE' && action === 'admin-highlight') {
    const admin = await requireAuth(req, res, ['admin']); if (!admin) return;
    const { id } = req.query; if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('community_highlights').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
