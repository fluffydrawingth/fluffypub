const getToken = () => sessionStorage.getItem('fluffy_token') || '';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

function normalize(p: any) {
  if (!p) return p;
  return { ...p, artistName: p.artist_name || p.artistName || '', artistSlug: p.artist_slug || p.artistSlug || '', originalPrice: p.original_price ?? p.originalPrice, isNew: p.is_new ?? p.isNew };
}
function normalizeOrder(o: any) {
  if (!o) return o;
  return { ...o, customerName: o.customer_name || o.customerName, customerEmail: o.customer_email || o.customerEmail, paymentStatus: o.payment_status || o.paymentStatus, trackingNumber: o.tracking_number || o.trackingNumber, shippingProvider: o.shipping_provider || o.shippingProvider, shippingAddress: o.shipping_address || o.shippingAddress, createdAt: o.created_at ? new Date(o.created_at).getTime() : (o.createdAt || 0) };
}

export const api = {
  // Auth
  login: (email: string, password: string) => fetch('/api/auth?action=login', { method: 'POST', headers: h(), body: JSON.stringify({ email, password }) }).then(r => r.json()),
  register: (name: string, email: string, password: string, role: string) => fetch('/api/auth?action=register', { method: 'POST', headers: h(), body: JSON.stringify({ name, email, password, role }) }).then(r => r.json()),
  logout: () => fetch('/api/auth?action=logout', { method: 'POST', headers: h() }).then(r => r.json()),
  me: () => fetch('/api/auth?action=me', { headers: h() }).then(r => r.json()),

  // Products
  getProducts: () => fetch('/api/products').then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalize) : d),
  getProduct: (slug: string) => fetch(`/api/products?id=${slug}`).then(r => r.json()).then(normalize),
  createProduct: (data: any) => fetch('/api/products', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  updateProduct: (id: string, data: any) => fetch(`/api/products?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteProduct: (id: string) => fetch(`/api/products?id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Orders
  createOrder: (data: any) => fetch('/api/orders', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()).then(normalizeOrder),
  payOrder: (id: string) => fetch(`/api/orders?action=pay&id=${id}`, { method: 'POST', headers: h() }).then(r => r.json()).then(normalizeOrder),
  myOrders: () => fetch('/api/orders?action=my', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  artistOrders: () => fetch('/api/orders?action=artist', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  allOrders: () => fetch('/api/orders', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  updateOrder: (id: string, data: any) => fetch(`/api/orders?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ status: data.status, tracking_number: data.trackingNumber, shipping_provider: data.shippingProvider }) }).then(r => r.json()).then(normalizeOrder),

  // Users
  updateMe: (data: any) => fetch('/api/users?action=me', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  allUsers: () => fetch('/api/users', { headers: h() }).then(r => r.json()),
  getFavorites: () => fetch('/api/users?action=favorites', { headers: h() }).then(r => r.json()),
  addFavorite: (id: string) => fetch(`/api/users?action=favorites&productId=${id}`, { method: 'POST', headers: h() }).then(r => r.json()),
  removeFavorite: (id: string) => fetch(`/api/users?action=favorites&productId=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Artists
  getArtists: () => fetch('/api/artists').then(r => r.json()),
  getArtist: (id: string) => fetch(`/api/artists?id=${id}`).then(r => r.json()),
  createArtist: (data: any) => fetch('/api/artists', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  updateArtist: (id: string, data: any) => fetch(`/api/artists?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteArtist: (id: string) => fetch(`/api/artists?id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Analytics
  getAnalytics: () => fetch('/api/analytics', { headers: h() }).then(r => r.json()),

  // Theme
  getTheme: () => fetch('/api/theme').then(r => r.json()),
  saveTheme: (data: any) => fetch('/api/theme', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
};
