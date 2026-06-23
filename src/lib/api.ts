import { getGuestId } from './ref';

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
  deleteArtistRequest: (id: string) => fetch(`/api/artists?action=delete-request&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  deleteArtistPayout: (id: string) => fetch(`/api/artists?action=delete-payout&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  getArtistOrdersForAdmin: (artistId: string) => fetch(`/api/orders?action=admin-artist&artist_id=${artistId}`, { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalizeOrder) : d),
  getMyProducts: () => fetch('/api/products?mine=1', { headers: h() }).then(r => r.json()).then((d: any) => Array.isArray(d) ? d.map(normalize) : d),
  updateArtist: (id: string, data: any) => fetch(`/api/artists?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteArtist: (id: string) => fetch(`/api/artists?id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Affiliate program
  requestAffiliate: (data: { username?: string; social_media_link: string; platform: string; message?: string }) =>
    fetch('/api/users?action=affiliate-request', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  myAffiliateRequest: () => fetch('/api/users?action=affiliate-my-request', { headers: h() }).then(r => r.json()),
  getAffiliateRequests: () => fetch('/api/users?action=affiliate-requests', { headers: h() }).then(r => r.json()),
  approveAffiliate: (id: string, data: { code: string; discount_amount?: number; affiliate_commission?: number }) =>
    fetch(`/api/users?action=affiliate-approve&id=${id}`, { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  rejectAffiliate: (id: string) => fetch(`/api/users?action=affiliate-reject&id=${id}`, { method: 'POST', headers: h() }).then(r => r.json()),
  deleteAffiliateRequest: (id: string) => fetch(`/api/users?action=affiliate-delete-request&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  revokeAffiliate: (userId: string) => fetch(`/api/users?action=affiliate-revoke&id=${userId}`, { method: 'POST', headers: h() }).then(r => r.json()),
  enableAffiliate: (userId: string) => fetch(`/api/users?action=affiliate-enable&id=${userId}`, { method: 'POST', headers: h() }).then(r => r.json()),
  searchUsers: (q: string) => fetch(`/api/users?action=user-search&q=${encodeURIComponent(q)}`, { headers: h() }).then(r => r.json()),
  inviteAffiliate: (userId: string) => fetch(`/api/users?action=affiliate-invite&id=${userId}`, { method: 'POST', headers: h() }).then(r => r.json()),
  getCreatorCommissions: (creatorId = '') => fetch(`/api/users?action=creator-commissions${creatorId ? `&creator_id=${creatorId}` : ''}`, { headers: h() }).then(r => r.json()),
  markCommissionPaid: (id: string) => fetch(`/api/users?action=commission-mark-paid&id=${id}`, { method: 'POST', headers: h() }).then(r => r.json()),
  getAffiliates: () => fetch('/api/users?action=affiliate-list', { headers: h() }).then(r => r.json()),
  getMyAffiliate: () => fetch('/api/users?action=affiliate-my', { headers: h() }).then(r => r.json()),
  createAffiliateCode: (data: any) => fetch('/api/users?action=affiliate-code', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  updateAffiliateCode: (id: string, data: any) => fetch(`/api/users?action=affiliate-code&id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteAffiliateCode: (id: string) => fetch(`/api/users?action=affiliate-code&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  markAffiliatePaid: (orderId: string, data: any) => fetch(`/api/users?action=affiliate-mark-paid&id=${orderId}`, { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  validateAffiliateCode: (code: string) => fetch(`/api/orders?action=affiliate-validate&code=${encodeURIComponent(code)}`, { headers: h() }).then(r => r.json()),
  // Payout account details (shared by artist & affiliate; updates own profile)
  updatePayoutAccount: (data: any) => fetch('/api/users?action=payout-account', { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  getPayoutAccount: (userId: string) => fetch(`/api/users?action=payout-account&user_id=${userId}`, { headers: h() }).then(r => r.json()),
  // Affiliate payouts (monthly records)
  getAffiliatePayouts: (affiliateId?: string) => fetch(`/api/users?action=affiliate-payouts${affiliateId ? `&affiliate_id=${affiliateId}` : ''}`, { headers: h() }).then(r => r.json()),
  saveAffiliatePayout: (data: any) => fetch('/api/users?action=affiliate-payout', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteAffiliatePayout: (id: string) => fetch(`/api/users?action=affiliate-payout&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

  // Community — "Share Your Colorful World"
  getCommunityPosts: (opts: { page?: number; limit?: number; product_id?: string; external_book_id?: string; user_id?: string; palette?: string; marker?: string; medium?: string; month?: string; post_type?: string } = {}) => {
    const q = new URLSearchParams({ action: 'list', page: String(opts.page ?? 0), limit: String(opts.limit ?? 20) });
    if (opts.product_id) q.set('product_id', opts.product_id);
    if (opts.external_book_id) q.set('external_book_id', opts.external_book_id);
    if (opts.user_id) q.set('user_id', opts.user_id);
    if (opts.post_type) q.set('post_type', opts.post_type);
    if (opts.palette) q.set('palette', opts.palette);
    if (opts.marker) q.set('marker', opts.marker);
    if (opts.medium) q.set('medium', opts.medium);
    if (opts.month) q.set('month', opts.month);
    q.set('guest_id', getGuestId());
    return fetch(`/api/community?${q.toString()}`, { headers: h() }).then(r => r.json());
  },
  getCommunityPost: (id: string) => fetch(`/api/community?action=one&id=${id}&guest_id=${getGuestId()}`, { headers: h() }).then(r => r.json()),
  getCommunityByProduct: (productId: string, limit = 6) => fetch(`/api/community?action=by-product&product_id=${productId}&limit=${limit}`, { headers: h() }).then(r => r.json()),
  getCommunityCreator: (userId: string) => fetch(`/api/community?action=creator&user_id=${userId}&guest_id=${getGuestId()}`, { headers: h() }).then(r => r.json()),
  getCommunityComments: (postId: string) => fetch(`/api/community?action=comments&post_id=${postId}`).then(r => r.json()),
  addCommunityComment: (postId: string, body: string) => fetch('/api/community?action=comment', { method: 'POST', headers: h(), body: JSON.stringify({ post_id: postId, body }) }).then(r => r.json()),
  deleteCommunityComment: (id: string) => fetch(`/api/community?action=comment&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  createCommunityPost: (data: any) => fetch('/api/community', { method: 'POST', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  deleteCommunityPost: (id: string) => fetch(`/api/community?id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  reactCommunity: (postId: string, type: string) => fetch('/api/community?action=react', { method: 'POST', headers: h(), body: JSON.stringify({ post_id: postId, type, guest_id: getGuestId() }) }).then(r => r.json()),
  getCommunityTrending: (limit = 8) => fetch(`/api/community?action=trending&limit=${limit}`, { headers: h() }).then(r => r.json()),
  getCommunityCreators: (limit = 6) => fetch(`/api/community?action=creators&limit=${limit}`, { headers: h() }).then(r => r.json()),
  getSavedPosts: () => fetch('/api/community?action=saved-posts', { headers: h() }).then(r => r.json()),
  getMyFollows: () => fetch('/api/community?action=my-follows', { headers: h() }).then(r => r.json()),
  followCreator: (creator_id: string) => fetch('/api/community?action=follow', { method: 'POST', headers: h(), body: JSON.stringify({ creator_id }) }).then(r => r.json()),
  unfollowCreator: (creator_id: string) => fetch(`/api/community?action=follow&creator_id=${creator_id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  getFollowedCreators: () => fetch('/api/community?action=followed-creators', { headers: h() }).then(r => r.json()),
  getCommunityFacets: () => fetch('/api/community?action=facets').then(r => r.json()),
  getCommunityArchive: () => fetch('/api/community?action=archive').then(r => r.json()),
  getCommunityCozyPicks: () => fetch(`/api/community?action=cozy-picks&guest_id=${getGuestId()}`, { headers: h() }).then(r => r.json()),
  updateCommunityPost: (id: string, data: any) => fetch(`/api/community?id=${id}`, { method: 'PUT', headers: h(), body: JSON.stringify(data) }).then(r => r.json()),
  // Admin — Community Dashboard
  getCommunityStats: () => fetch('/api/community?action=admin-stats', { headers: h() }).then(r => r.json()),
  getCommunityAdminList: (opts: { status?: string; page?: number; q?: string; featured?: boolean; date_from?: string; date_to?: string } = {}) => {
    const qs = new URLSearchParams({ action: 'admin-list', page: String(opts.page ?? 0) });
    if (opts.status) qs.set('status', opts.status);
    if (opts.q) qs.set('q', opts.q);
    if (opts.featured) qs.set('featured', '1');
    if (opts.date_from) qs.set('date_from', opts.date_from);
    if (opts.date_to) qs.set('date_to', opts.date_to);
    return fetch(`/api/community?${qs.toString()}`, { headers: h() }).then(r => r.json());
  },
  setCommunityStatus: (id: string, status: string) => fetch(`/api/community?action=admin-status&id=${id}`, { method: 'POST', headers: h(), body: JSON.stringify({ status }) }).then(r => r.json()),
  featureCommunityPost: (id: string, on: boolean) => fetch(`/api/community?action=admin-feature&id=${id}`, { method: 'POST', headers: h(), body: JSON.stringify({ on }) }).then(r => r.json()),
  mergeCommunityTags: (field: string, from: string[], to: string) => fetch('/api/community?action=admin-merge-tags', { method: 'POST', headers: h(), body: JSON.stringify({ field, from, to }) }).then(r => r.json()),
  // Tag Library
  getCommunityTags: (type: string) => fetch(`/api/community?action=tags&type=${type}`).then(r => r.json()),
  submitCommunityTag: (type: string, name: string) => fetch('/api/community?action=tag-submit', { method: 'POST', headers: h(), body: JSON.stringify({ type, name }) }).then(r => r.json()),
  getAdminTags: (type = '') => fetch(`/api/community?action=admin-tags&type=${type}`, { headers: h() }).then(r => r.json()),
  approveTag: (id: string, name?: string) => fetch(`/api/community?action=admin-tag-approve&id=${id}`, { method: 'POST', headers: h(), body: JSON.stringify({ name }) }).then(r => r.json()),
  deleteTag: (id: string) => fetch(`/api/community?action=admin-tag&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  // Community Curation
  getCommunityCuration: () => fetch('/api/community?action=curation').then(r => r.json()),
  // External Book Library
  getExternalBooks: (q = '') => fetch(`/api/community?action=external-books&q=${encodeURIComponent(q)}`).then(r => r.json()),
  getExternalAuthors: (q = '') => fetch(`/api/community?action=external-authors&q=${encodeURIComponent(q)}`).then(r => r.json()),
  getExternalBook: (slug: string) => fetch(`/api/community?action=external-book&slug=${encodeURIComponent(slug)}&guest_id=${getGuestId()}`, { headers: h() }).then(r => r.json()),
  getCommunityRelated: (id: string) => fetch(`/api/community?action=related&id=${id}&guest_id=${getGuestId()}`, { headers: h() }).then(r => r.json()),
  searchFeaturedCreators: (q: string) => fetch(`/api/community?action=admin-creators-search&q=${encodeURIComponent(q)}`, { headers: h() }).then(r => r.json()),
  searchCommunity: (q: string, page = 0) => fetch(`/api/community?action=search&q=${encodeURIComponent(q)}&page=${page}&guest_id=${getGuestId()}`, { headers: h() }).then(r => r.json()),
  // Admin External Book Library
  getAdminAllTags: (type: string) => fetch(`/api/community?action=admin-all-tags&type=${type}`, { headers: h() }).then(r => r.json()),
  setTagStatus: (type: string, name: string, status: string) => fetch('/api/community?action=admin-tag-status', { method: 'POST', headers: h(), body: JSON.stringify({ type, name, status }) }).then(r => r.json()),
  deleteTagByName: (type: string, name: string) => fetch(`/api/community?action=admin-tag-by-name&type=${type}&name=${encodeURIComponent(name)}`, { method: 'DELETE', headers: h() }).then(r => r.json()),
  getAdminBooks: () => fetch('/api/community?action=admin-books', { headers: h() }).then(r => r.json()),
  renameAdminBook: (id: string, title: string, author: string) => fetch(`/api/community?action=admin-book-rename&id=${id}`, { method: 'POST', headers: h(), body: JSON.stringify({ title, author }) }).then(r => r.json()),
  mergeAdminBooks: (from: string[], to: string) => fetch('/api/community?action=admin-book-merge', { method: 'POST', headers: h(), body: JSON.stringify({ from, to }) }).then(r => r.json()),
  deleteAdminBook: (id: string) => fetch(`/api/community?action=admin-book&id=${id}`, { method: 'DELETE', headers: h() }).then(r => r.json()),

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
