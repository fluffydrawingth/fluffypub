const { supabase } = require('./_lib');

function siteOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'fluffypub.com';
  return `${proto}://${host}`;
}

function xmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hashUrl(origin, path) {
  const clean = String(path || '/').startsWith('/') ? path : `/${path}`;
  return `${origin}/#${clean}`;
}

function urlEntry(origin, path, lastmod, priority = '0.7') {
  const loc = xmlEscape(hashUrl(origin, path));
  const mod = lastmod ? `<lastmod>${xmlEscape(new Date(lastmod).toISOString())}</lastmod>` : '';
  return `<url><loc>${loc}</loc>${mod}<priority>${priority}</priority></url>`;
}

async function safeQuery(builder) {
  const { data, error } = await builder;
  if (error) {
    console.error('sitemap query error:', error.message);
    return [];
  }
  return data || [];
}

module.exports = async function handler(req, res) {
  const origin = siteOrigin(req);

  const [products, artists, articles, posts, downloads] = await Promise.all([
    safeQuery(supabase.from('products').select('slug,created_at').eq('active', true).eq('status', 'published').order('created_at', { ascending: false }).limit(1000)),
    safeQuery(supabase.from('profiles').select('id,artist_slug,role,artist_id').eq('role', 'artist').limit(1000)),
    safeQuery(supabase.from('journal_articles').select('slug,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(1000)),
    safeQuery(supabase.from('community_posts').select('id,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(1000)),
    safeQuery(supabase.from('free_downloads').select('slug,created_at').eq('status', 'published').order('created_at', { ascending: false }).limit(1000)),
  ]);

  const urls = [
    urlEntry(origin, '/', null, '1.0'),
    urlEntry(origin, '/products', null, '0.9'),
    urlEntry(origin, '/artists', null, '0.8'),
    urlEntry(origin, '/journal', null, '0.8'),
    urlEntry(origin, '/community', null, '0.8'),
    urlEntry(origin, '/free-downloads', null, '0.8'),
    ...products.filter(p => p.slug).map(p => urlEntry(origin, `/products/${p.slug}`, p.created_at, '0.8')),
    ...artists
      .filter(a => a.artist_slug || a.id)
      .filter(a => !a.artist_id || a.artist_id === a.id)
      .map(a => urlEntry(origin, `/artists/${a.artist_slug || a.id}`, null, '0.7')),
    ...articles.filter(a => a.slug).map(a => urlEntry(origin, `/journal/${a.slug}`, a.created_at, '0.7')),
    ...posts.filter(p => p.id).map(p => urlEntry(origin, `/community/${p.id}`, p.created_at, '0.6')),
    ...downloads.filter(d => d.slug).map(d => urlEntry(origin, `/free-downloads/${d.slug}`, d.created_at, '0.7')),
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.statusCode = 200;
  res.end(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`);
};
