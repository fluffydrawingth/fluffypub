// API client — all calls go to /api/* (same origin on Vercel)
const getToken = () => sessionStorage.getItem('fluffy_token') || '';
const h = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// Normalize field names from Supabase snake_case to camelCase for the UI
function normalize(product: any) {
  if (!product) return product;
  return {
    ...product,
    artistName: product.artist_name || product.artistName || '',
    artistSlug: product.artist_slug || product.artistSlug || '',
    originalPrice: product.original_price ?? product.originalPrice,
    isNew: product.is_new ?? product.isNew,
    // Keep snake_case too so nothing breaks
  };
}

function normalizeOrder(o: any) {
  if (!o) return o;
  return {
    ...o,
    customerName: o.customer_name || o.customerName,
    customerEmail: o.customer_email || o.customerEmail,
    paymentStatus: o.payment_status || o.paymentStatus,
    trackingNumber: o.tracking_number || o.trackingNumber,
    shippingProvider: o.shipping_provider || o.shippingProvider,
    shippingAddress: o.shipping_address || o.shippingAddress,
    createdAt: o.created_at ? new Date(o.created_at).getTime() : (o.createdAt || 0),
    paidAt: o.paid_at ? new Date(o.paid_at).getTime() : undefined,
  };
}

export const api = {
  // Products
  getProducts: () => fetch('/api/products').then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalize) : d),
  getProduct: (slug: string) => fetch(`/api/products/${slug}`).then(r => r.json()).then(normalize),
  createProduct: (data: any) => fetch('/api/products', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  updateProduct: (id: string, data: any) => fetch(`/api/products/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteProduct: (id: string) => fetch(`/api/products/${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Orders
  createOrder: (data: any) => {
    // Map camelCase to snake_case for the API
    const body = {
      items: data.items,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      shippingAddress: data.shippingAddress,
      promoCode: data.promoCode,
    };
    return fetch('/api/orders', { method: 'POST', headers: h(), body: JSON.stringify(body) }).then(r => r.json()).then(normalizeOrder);
  },
  payOrder: (id: string) => fetch(`/api/orders/pay?id=${id}`, { method: 'POST', headers: h() }).then(r => r.json()).then(normalizeOrder),
  myOrders: () => fetch('/api/orders/my', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  artistOrders: () => fetch('/api/orders/artist', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  allOrders: () => fetch('/api/orders', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  updateOrder: (id: string, data: any) => {
    // Map to snake_case for API
    const body = {
      status: data.status,
      tracking_number: data.trackingNumber,
      shipping_provider: data.shippingProvider,
    };
    return fetch(`/api/orders/${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(body) }).then(r => r.json()).then(normalizeOrder);
  },

  // Users
  updateMe: (data: any) => fetch('/api/users/me', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  allUsers: () => fetch('/api/users', { headers: h() }).then(r => r.json()),
  getFavorites: () => fetch('/api/users/favorites', { headers: h() }).then(r => r.json()),
  addFavorite: (id: string) => fetch(`/api/users/favorites?productId=${id}`, { method: 'POST', headers: h() }).then(r => r.json()),
  removeFavorite: (id: string) => fetch(`/api/users/favorites?productId=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Artists
  getArtists: () => fetch('/api/artists').then(r => r.json()),

  // Analytics
  getAnalytics: () => fetch('/api/analytics', { headers: h() }).then(r => r.json()),

  // Theme
  getTheme: () => fetch('/api/theme').then(r => r.json()),
  saveTheme: (data: any) => fetch('/api/theme', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
};
