const { supabase, requireAuth, getUser, json } = require('./_lib');

// ── Free Downloads ─────────────────────────────────────────────────────────────
// Routed when ?type=free-download is present on any method.

async function handleFreeDownloads(req, res) {
  const { id, slug, action } = req.query;

  // GET download — generate signed R2 URL and increment counter (public)
  if (req.method === 'GET' && action === 'download' && id) {
    const { data: item } = await supabase.from('free_downloads').select('*').eq('id', id).eq('status', 'published').single();
    if (!item) return json(res, 404, { error: 'Not found' });
    if (!item.r2_key) return json(res, 404, { error: 'No file available' });

    const accountId = process.env.R2_ACCOUNT_ID;
    const bucket    = process.env.R2_BUCKET_NAME;
    if (!accountId || !bucket) return json(res, 500, { error: 'R2 not configured' });

    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID || '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '' },
    });
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: item.r2_key,
      ResponseContentDisposition: `attachment; filename="${item.r2_file_name || 'download'}"`,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 300 }); // 5 min

    // Increment counter (fire-and-forget, don't block the response)
    supabase.from('free_downloads').update({
      download_count: (item.download_count || 0) + 1,
      last_download_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id).then(() => {}).catch(() => {});

    return json(res, 200, { url, fileName: item.r2_file_name });
  }

  // GET list (public: published; admin: all)
  if (req.method === 'GET' && !slug && !id) {
    const user = req.headers.authorization ? await getUser(req) : null;
    let q = supabase.from('free_downloads')
      .select('id,title_en,title_th,slug,cover_image_url,description_en,description_th,highlight,category,keywords,sort_order,file_type,r2_key,r2_file_name,file_size,status,artist_id,download_count,last_download_at,created_at')
      .order('sort_order').order('created_at', { ascending: false });
    if (!user || user.role !== 'admin') q = q.eq('status', 'published');
    const { data, error } = await q;
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET single by slug (public: published only)
  if (req.method === 'GET' && slug) {
    const user = req.headers.authorization ? await getUser(req) : null;
    let q = supabase.from('free_downloads')
      .select('id,title_en,title_th,slug,cover_image_url,description_en,description_th,highlight,category,keywords,sort_order,file_type,r2_key,r2_file_name,file_size,status,artist_id,download_count,last_download_at,created_at')
      .eq('slug', slug);
    if (!user || user.role !== 'admin') q = q.eq('status', 'published');
    const { data, error } = await q.single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    // Never expose r2_key to public
    if (!user || user.role !== 'admin') { delete data.r2_key; }
    return json(res, 200, data);
  }

  // GET single by id (admin)
  if (req.method === 'GET' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { data, error } = await supabase.from('free_downloads').select('*').eq('id', id).single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  // POST create (admin)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { title_en, title_th, slug: rawSlug, cover_image_url, description_en, description_th, highlight, category, keywords, sort_order, file_type, r2_key, r2_file_name, file_size, status, artist_id } = req.body || {};
    if (!title_en) return json(res, 400, { error: 'title_en required' });
    const cleanSlug = (rawSlug || title_en).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + (rawSlug ? '' : '-' + Date.now().toString(36));
    const { data, error } = await supabase.from('free_downloads').insert({
      title_en, title_th: title_th || null, slug: cleanSlug,
      cover_image_url: cover_image_url || null,
      description_en: description_en || null, description_th: description_th || null,
      highlight: highlight || null, category: category || null,
      keywords: Array.isArray(keywords) ? keywords : [],
      sort_order: parseInt(sort_order) || 0,
      file_type: file_type || null, r2_key: r2_key || null,
      r2_file_name: r2_file_name || null, file_size: file_size || null,
      status: status || 'draft', artist_id: artist_id || null,
    }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // PUT update (admin)
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const allowed = ['title_en','title_th','slug','cover_image_url','description_en','description_th','highlight','category','keywords','sort_order','file_type','r2_key','r2_file_name','file_size','status','artist_id'];
    const updates = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if ((req.body || {})[k] !== undefined) updates[k] = req.body[k]; });
    if (updates.slug) updates.slug = updates.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data, error } = await supabase.from('free_downloads').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // DELETE (admin)
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { error } = await supabase.from('free_downloads').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
}

// ── Legal Pages ────────────────────────────────────────────────────────────────

async function handleLegalPages(req, res) {
  const { id, slug } = req.query;

  // GET list — admin sees all, public sees published only
  if (req.method === 'GET' && !slug && !id) {
    const user = req.headers.authorization ? await getUser(req) : null;
    let q = supabase.from('legal_pages').select('id,slug,title,content,published,updated_at').order('slug');
    if (!user || user.role !== 'admin') q = q.eq('published', true);
    const { data, error } = await q;
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET single by slug (public if published)
  if (req.method === 'GET' && slug) {
    const user = req.headers.authorization ? await getUser(req) : null;
    let q = supabase.from('legal_pages').select('id,slug,title,content,published,updated_at').eq('slug', slug);
    if (!user || user.role !== 'admin') q = q.eq('published', true);
    const { data, error } = await q.single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  // POST create (admin)
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { title, slug: rawSlug, content, published } = req.body || {};
    if (!title || !rawSlug) return json(res, 400, { error: 'title and slug required' });
    const cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data, error } = await supabase.from('legal_pages')
      .insert({ title, slug: cleanSlug, content: content || '', published: !!published })
      .select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // PUT update (admin)
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const updates = { updated_at: new Date().toISOString() };
    const { title, slug: rawSlug, content, published } = req.body || {};
    if (title     !== undefined) updates.title     = title;
    if (rawSlug   !== undefined) updates.slug      = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (content   !== undefined) updates.content   = content;
    if (published !== undefined) updates.published = !!published;
    const { data, error } = await supabase.from('legal_pages').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // DELETE (admin)
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { error } = await supabase.from('legal_pages').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
}

// ── Fluffy Journal ─────────────────────────────────────────────────────────────

async function translateTH(text) {
  if (!text) return '';
  try {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encoded}`;
    const https = require('https');
    const result = await new Promise((resolve, reject) => {
      https.get(url, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(d));
      }).on('error', reject);
    });
    const parsed = JSON.parse(result);
    // parsed[0] = array of [translated, original] pairs
    return (parsed[0] || []).map(p => p[0]).join('').trim();
  } catch { return ''; }
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9฀-๿]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || String(Date.now().toString(36));
}

async function handleJournal(req, res) {
  const { id, slug, action, article_type } = req.query;

  // GET list — public: published; admin: all; optional ?article_type= filter
  if (req.method === 'GET' && !slug && !id) {
    const user = req.headers.authorization ? await getUser(req) : null;
    let q = supabase.from('journal_articles')
      .select('id,title_th,title_en,excerpt_th,excerpt_en,article_type,cover_image,status,slug,sort_order,created_at,updated_at')
      .order('sort_order').order('created_at', { ascending: false });
    if (!user || user.role !== 'admin') q = q.eq('status', 'published');
    if (article_type && ['tips','tools','favorites'].includes(article_type)) q = q.eq('article_type', article_type);
    const { data, error } = await q;
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET single by slug
  if (req.method === 'GET' && slug) {
    const user = req.headers.authorization ? await getUser(req) : null;
    let q = supabase.from('journal_articles').select('*').eq('slug', slug);
    if (!user || user.role !== 'admin') q = q.eq('status', 'published');
    const { data, error } = await q.single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  // GET single by id (admin)
  if (req.method === 'GET' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { data, error } = await supabase.from('journal_articles').select('*').eq('id', id).single();
    if (error || !data) return json(res, 404, { error: 'Not found' });
    return json(res, 200, data);
  }

  // POST ?action=translate&id= — auto-translate TH → EN (admin)
  if (req.method === 'POST' && action === 'translate' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { data: art } = await supabase.from('journal_articles').select('title_th,excerpt_th,content_th').eq('id', id).single();
    if (!art) return json(res, 404, { error: 'Not found' });
    const [title_en, excerpt_en, content_en] = await Promise.all([
      translateTH(art.title_th),
      translateTH(art.excerpt_th),
      translateTH(art.content_th),
    ]);
    const { error } = await supabase.from('journal_articles')
      .update({ title_en: title_en || null, excerpt_en: excerpt_en || null, content_en: content_en || null, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { title_en, excerpt_en, content_en });
  }

  // POST create (admin)
  if (req.method === 'POST' && !action) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const b = req.body || {};
    if (!String(b.title_th || '').trim()) return json(res, 400, { error: 'title_th required' });
    const rawSlug = b.slug || b.title_th;
    const baseSlug = slugify(rawSlug);
    const finalSlug = baseSlug + '-' + Date.now().toString(36);
    const row = {
      title_th: String(b.title_th).trim(),
      title_en: b.title_en || null,
      excerpt_th: b.excerpt_th || null,
      excerpt_en: b.excerpt_en || null,
      content_th: b.content_th || null,
      content_en: b.content_en || null,
      article_type: ['tips','tools','favorites'].includes(b.article_type) ? b.article_type : 'tips',
      cover_image: b.cover_image || null,
      status: ['draft','published'].includes(b.status) ? b.status : 'draft',
      slug: finalSlug,
      sort_order: parseInt(b.sort_order) || 0,
    };
    const { data, error } = await supabase.from('journal_articles').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // POST ?action=update&id= — update (admin, POST to avoid PUT routing issues)
  if (req.method === 'POST' && action === 'update' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const b = req.body || {};
    const upd = { updated_at: new Date().toISOString() };
    const fields = ['title_th','title_en','excerpt_th','excerpt_en','content_th','content_en','article_type','cover_image','status','sort_order'];
    for (const k of fields) {
      if (b[k] !== undefined) upd[k] = k === 'sort_order' ? (parseInt(b[k]) || 0) : (b[k] || null);
    }
    if (b.title_th !== undefined) upd.title_th = String(b.title_th).trim();
    const { error } = await supabase.from('journal_articles').update(upd).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // DELETE (admin)
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { error } = await supabase.from('journal_articles').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
}

// ── Pages CMS ──────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.query.type === 'free-download') return handleFreeDownloads(req, res);
  if (req.query.type === 'legal') return handleLegalPages(req, res);
  if (req.query.type === 'journal') return handleJournal(req, res);

  const { slug, id, homepage } = req.query;

  // GET homepage pages (public — published + show_on_homepage)
  if (req.method === 'GET' && homepage) {
    const { data, error } = await supabase
      .from('pages')
      .select('id,title,slug,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at')
      .eq('status', 'published')
      .eq('show_on_homepage', true)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET all published pages index (public)
  if (req.method === 'GET' && !slug && !id) {
    const user = req.headers.authorization ? (await require('./_lib').getUser(req)) : null;
    // Admins get content too (needed for edit form); public list omits it to keep response small
    const adminSelect = 'id,title,slug,content,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at';
    const publicSelect = 'id,title,slug,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at';
    let q = supabase
      .from('pages')
      .select(user?.role === 'admin' ? adminSelect : publicSelect)
      .order('sort_order')
      .order('created_at', { ascending: false });
    if (!user || user.role !== 'admin') q = q.eq('status', 'published');
    const { data, error } = await q;
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data || []);
  }

  // GET single page by slug (public — published only)
  if (req.method === 'GET' && slug) {
    const { data, error } = await supabase
      .from('pages')
      .select('id,title,slug,content,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();
    if (error || !data) return json(res, 404, { error: 'Page not found' });
    return json(res, 200, data);
  }

  // POST create
  if (req.method === 'POST') {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { title, slug, content, excerpt, image_url, status = 'draft', show_on_homepage = false, sort_order = 0 } = req.body || {};
    if (!title || !slug) return json(res, 400, { error: 'title and slug required' });
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    const { data, error } = await supabase.from('pages')
      .insert({ title, slug: cleanSlug, content: content || '', excerpt: excerpt || null, image_url: image_url || null, status, show_on_homepage, sort_order })
      .select().single();
    if (error) { console.error('[pages POST]', error.message, error.hint); return json(res, 400, { error: error.message, hint: error.hint }); }
    return json(res, 201, data);
  }

  // PUT update
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { title, slug, content, excerpt, image_url, status, show_on_homepage, sort_order } = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (title            !== undefined) updates.title            = title;
    if (slug             !== undefined) updates.slug             = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (content          !== undefined) updates.content          = content;
    if (excerpt          !== undefined) updates.excerpt          = excerpt;
    if (image_url        !== undefined) updates.image_url        = image_url;
    if (status           !== undefined) updates.status           = status;
    if (show_on_homepage !== undefined) updates.show_on_homepage = show_on_homepage;
    if (sort_order       !== undefined) updates.sort_order       = sort_order;
    const { data, error } = await supabase.from('pages').update(updates).eq('id', id)
      .select('id,title,slug,content,excerpt,image_url,status,show_on_homepage,sort_order,created_at,updated_at').single();
    if (error) { console.error('[pages PUT]', error.message, error.hint); return json(res, 400, { error: error.message, hint: error.hint }); }
    return json(res, 200, data);
  }

  // DELETE
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
