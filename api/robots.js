function siteOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'fluffypub.com';
  return `${proto}://${host}`;
}

module.exports = async function handler(req, res) {
  const origin = siteOrigin(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.statusCode = 200;
  res.end(`User-agent: *
Allow: /
Allow: /shop
Allow: /products
Allow: /artists
Allow: /journal
Allow: /community
Allow: /free-downloads
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /profile
Disallow: /account
Disallow: /login
Disallow: /register
Disallow: /orders
Disallow: /payment

Sitemap: ${origin}/sitemap.xml
`);
};
