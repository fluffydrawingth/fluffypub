const getToken = () => localStorage.getItem('fluffy_token') || '';
const h = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

function normalize(p: any) {
  if (!p) return p;
  // Clean artist name: never show slug format (hyphens/underscores) as display name
  const rawName = p.artist_name || p.artistName || '';
  const slug = p.artist_slug || p.artistSlug || '';
  // If name looks like a slug (no spaces, has hyphens/underscores), format it
  const artistName = rawName.includes('-') || (rawName.includes('_') && !rawName.includes(' '))
    ? rawName.replace(/[-_]/g, ' ').replace(/\b\w/g, (ch: string) => ch.toUpperCase())
    : rawName;
  return { ...p, artistName, artistSlug: slug, originalPrice: p.original_price ?? p.originalPrice, isNew: p.is_new ?? p.isNew, cover_image_url: p.cover_image_url || null };
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
  deleteOrder: (id: string) =>
    fetch(`/api/orders?id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  updateOrder: (id: string, data: any) => fetch(`/api/orders?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify({ status: data.status, tracking_number: data.tracking_number ?? data.trackingNumber, shipping_provider: data.shipping_provider ?? data.shippingProvider }) }).then(r => r.json()).then(normalizeOrder),

  // Users
  updateMe: async (data: any) => {
    const res = await fetch('/api/users?action=me', { method: 'PUT', headers: h(), body: JSON.stringify(data) });
    const updated = await res.json();
    // Update localStorage immediately so fields persist even before refreshUser
    if (!updated.error) {
      try {
        const stored = localStorage.getItem('fluffy_user');
        const merged = stored ? { ...JSON.parse(stored), ...updated } : updated;
        localStorage.setItem('fluffy_user', JSON.stringify(merged));
      } catch {}
    }
    return updated;
  },
  allUsers: () => fetch('/api/users', { headers: h() }).then(r => r.json()),
  getFavorites: () => fetch('/api/users?action=favorites', { headers: h() }).then(r => r.json()),
  addFavorite: (id: string) => fetch(`/api/users?action=favorites&productId=${id}`, { method: 'POST', headers: h() }).then(r => r.json()),
  removeFavorite: (id: string) => fetch(`/api/users?action=favorites&productId=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Artists
  getArtists: () => fetch('/api/artists').then(r => r.json()),
  getArtist: (id: string) => fetch(`/api/artists?id=${id}`).then(r => r.json()),
  getArtistBySlug: (slug: string) => fetch(`/api/artists?slug=${slug}`).then(r => r.json()),
  createArtist: (data: any) => fetch('/api/artists', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),

  // Artist requests / role management
  requestArtist: (message: string) => fetch('/api/artists?action=request', { method: 'POST', headers: h(), body: JSON.stringify({ message }) }).then(r => r.json()),
  myArtistRequest: () => fetch('/api/artists?action=my-request', { headers: h() }).then(r => r.json()),
  getArtistRequests: () => fetch('/api/artists?action=requests', { headers: h() }).then(r => r.json()),
  approveArtistRequest: (id: string, artistId?: string) => fetch(`/api/artists?action=approve&id=${id}`, { method: 'POST', headers: h(), body: JSON.stringify({ artist_id: artistId || undefined }) }).then(r => r.json()),
  rejectArtistRequest: (id: string) => fetch(`/api/artists?action=reject&id=${id}`, { method: 'POST', headers: h() }).then(r => r.json()),
  revokeArtist: (userId: string) => fetch(`/api/artists?action=revoke&id=${userId}`, { method: 'POST', headers: h() }).then(r => r.json()),
  updateArtistMe: (data: any) => fetch('/api/artists?action=me', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  getArtistPayouts: (artistId?: string) => fetch(`/api/artists?action=payouts${artistId ? `&artist_id=${artistId}` : ''}`, { headers: h() }).then(r => r.json()),
  saveArtistPayout: (data: any) => fetch('/api/artists?action=payout', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  getMyProducts: () => fetch('/api/products?mine=1', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalize) : d),
  updateArtist: (id: string, data: any) => fetch(`/api/artists?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteArtist: (id: string) => fetch(`/api/artists?id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Analytics
  getAnalytics: () => fetch('/api/analytics', { headers: h() }).then(r => r.json()),

  // Upload
  getUploadUrl: (fileName: string, fileType: string, folder = 'uploads') =>
    fetch('/api/upload', { method: 'POST', headers: h(), body: JSON.stringify({ fileName, fileType, folder }) }).then(r => r.json()),

  uploadFile: async (file: File, folder = 'uploads') => {
    const token = localStorage.getItem('fluffy_token') || '';
    try {
      const metaRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, folder }),
      });
      const meta = await metaRes.json();
      if (metaRes.status === 401 || meta.error === 'Not authenticated') {
        return { error: 'Session expired — please log out and log back in, then try again.' };
      }
      if (meta.error) {
        console.error('[upload] meta error:', meta.error);
        return { error: meta.error };
      }
      // PUT file directly to Supabase Storage via signed URL
      const uploadRes = await fetch(meta.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!uploadRes.ok) {
        const errText = await uploadRes.text().catch(() => uploadRes.status.toString());
        console.error('[upload] PUT error:', errText);
        return { error: `Storage upload failed: ${errText}` };
      }
      return { publicUrl: meta.publicUrl };
    } catch (e: any) {
      console.error('[upload] exception:', e.message);
      return { error: e.message };
    }
  },

  // Free Downloads
  getFreeDownloads: () => fetch('/api/pages?type=free-download', { headers: h() }).then(r => r.json()),
  getFreeDownload: (slug: string) => fetch(`/api/pages?type=free-download&slug=${slug}`).then(r => r.json()),
  createFreeDownload: (data: any) => fetch('/api/pages?type=free-download', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  updateFreeDownload: (id: string, data: any) => fetch(`/api/pages?type=free-download&id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteFreeDownload: (id: string) => fetch(`/api/pages?type=free-download&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  downloadFree: (id: string) => fetch(`/api/pages?type=free-download&action=download&id=${id}`).then(r => r.json()),

  // Theme
  getCategories: () => fetch('/api/categories').then(r => r.json()),
  getAdminCategories: () => fetch('/api/categories', { headers: h() }).then(r => r.json()),
  getPages: () => fetch('/api/pages', { headers: h() }).then(r => r.json()),
  getPage: (slug: string) => fetch(`/api/pages?slug=${slug}`).then(r => r.json()),

  // Legal Pages
  getLegalPages: () => fetch('/api/pages?type=legal', { headers: h() }).then(r => r.json()),
  getLegalPage: (slug: string) => fetch(`/api/pages?type=legal&slug=${encodeURIComponent(slug)}`).then(r => r.json()),
  createLegalPage: (data: any) => fetch('/api/pages?type=legal', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  updateLegalPage: (id: string, data: any) => fetch(`/api/pages?type=legal&id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteLegalPage: (id: string) => fetch(`/api/pages?type=legal&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  getTheme: () => fetch('/api/theme').then(r => r.json()),
  saveTheme: (data: any) => fetch('/api/theme', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
};
