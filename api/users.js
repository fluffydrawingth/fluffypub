// /api/users?action=me|list|favorites&productId=xxx
//   + Affiliate Program: affiliate-request, affiliate-my-request, affiliate-requests,
//     affiliate-approve, affiliate-reject, affiliate-delete-request, affiliate-revoke,
//     affiliate-list, affiliate-my, affiliate-code (POST/PUT/DELETE), affiliate-mark-paid
const { supabase, requireAuth, json } = require('./_lib');

const PLATFORMS = ['tiktok', 'instagram', 'facebook', 'youtube', 'other'];
const PAID_DELIVERED = 'delivered';

// Does an order contain any physical item? (affiliate commission is physical-only)
function orderHasPhysical(order) {
  return (order.items || []).some(i => (i.optionType || i.type) === 'physical');
}

// Build the earnings summary for one affiliate from their referred orders.
// Commission only counts when the order is delivered, has physical items,
// AND was placed on or after the creator's affiliate_approved_at date.
function summarizeAffiliate(orders, approvedAt) {
  let ordersReferred = 0, physicalRevenueTHB = 0, commissionEarned = 0, paidCommission = 0;
  for (const o of (orders || [])) {
    if (o.status === 'cancelled') continue;
    // Never count orders placed before the creator was approved
    if (approvedAt && o.created_at < approvedAt) continue;
    ordersReferred += 1;
    const delivered = o.status === PAID_DELIVERED && orderHasPhysical(o);
    if (!delivered) continue;
    // Physical revenue = physical line totals on this order
    const physTHB = (o.items || [])
      .filter(i => (i.optionType || i.type) === 'physical')
      .reduce((s, i) => s + (i.lineTotalTHB ?? (i.unitPriceTHB || 0) * (i.qty || 1)), 0);
    physicalRevenueTHB += physTHB;
    const commission = Number(o.affiliate_commission_thb || 0);
    commissionEarned += commission;
    if (o.affiliate_paid_at) paidCommission += commission;
  }
  const pendingCommission = commissionEarned - paidCommission;
  return { ordersReferred, physicalRevenueTHB, commissionEarned, paidCommission, pendingCommission };
}

module.exports = async function handler(req, res) {
  const { action, productId } = req.query;

  // ─────────────────────────── Affiliate Program ───────────────────────────

  // POST ?action=affiliate-request — a logged-in user applies to become an affiliate
  if (req.method === 'POST' && action === 'affiliate-request') {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (user.affiliate_enabled) return json(res, 400, { error: 'You already have affiliate access.' });
    const { username, social_media_link, platform, message } = req.body || {};
    if (!social_media_link) return json(res, 400, { error: 'Social media link is required.' });
    const plat = PLATFORMS.includes((platform || '').toLowerCase()) ? platform.toLowerCase() : 'other';
    const { data: existing } = await supabase.from('affiliate_requests').select('id').eq('user_id', user.id).eq('status', 'pending').limit(1);
    if (existing && existing.length) return json(res, 409, { error: 'You already have a pending request.' });
    const { data, error } = await supabase.from('affiliate_requests').insert({
      user_id: user.id, username: (username || user.name || '').trim(), email: user.email || '',
      social_media_link, platform: plat, message: message || '', status: 'pending',
    }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // GET ?action=affiliate-my-request — caller's latest request (button state)
  if (req.method === 'GET' && action === 'affiliate-my-request') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data } = await supabase.from('affiliate_requests').select('*').eq('user_id', user.id).order('request_date', { ascending: false }).limit(1);
    return json(res, 200, (data && data[0]) || null);
  }

  // GET ?action=affiliate-requests — admin lists all requests
  if (req.method === 'GET' && action === 'affiliate-requests') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { data, error } = await supabase.from('affiliate_requests').select('*').order('request_date', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data || []);
  }

  // POST ?action=affiliate-approve&id=<requestId> — admin approves + creates a code
  if (req.method === 'POST' && action === 'affiliate-approve') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'request id required' });
    const { data: reqRow } = await supabase.from('affiliate_requests').select('*').eq('id', id).single();
    if (!reqRow) return json(res, 404, { error: 'Request not found' });
    const b = req.body || {};
    const code = (b.code || '').toUpperCase().trim();
    if (!code || !/^[A-Z0-9]{1,10}$/.test(code)) return json(res, 400, { error: 'Code must be uppercase letters/numbers, max 10 chars.' });
    const { data: dup } = await supabase.from('affiliate_codes').select('id').eq('code', code).limit(1);
    if (dup && dup.length) return json(res, 409, { error: 'That code is already taken.' });
    // Grant affiliate permission on the SAME profile row the user logs in with.
    const approvedAt = new Date().toISOString();
    const { data: updatedProfile, error: pErr } = await supabase.from('profiles')
      .update({ affiliate_enabled: true, affiliate_approved_at: approvedAt, updated_at: approvedAt })
      .eq('id', reqRow.user_id)
      .select('id,email,role,artist_id,affiliate_enabled,affiliate_approved_at')
      .single();
    if (pErr) return json(res, 400, { error: pErr.message });
    // Create the affiliate code linked to this user/profile
    const { data: newCode, error: cErr } = await supabase.from('affiliate_codes').insert({
      user_id: reqRow.user_id, code,
      discount_amount: b.discount_amount != null ? Number(b.discount_amount) : 10,
      affiliate_commission: b.affiliate_commission != null ? Number(b.affiliate_commission) : 20,
      active: true,
    }).select('id,code,user_id,active').single();
    if (cErr) return json(res, 400, { error: cErr.message });
    await supabase.from('affiliate_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: admin.id }).eq('id', id);
    console.log('[affiliate approve] profile:', JSON.stringify(updatedProfile), 'code:', JSON.stringify(newCode));
    return json(res, 200, { success: true, profile: updatedProfile, code: newCode });
  }

  // POST ?action=affiliate-reject&id=<requestId>
  if (req.method === 'POST' && action === 'affiliate-reject') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'request id required' });
    const { error } = await supabase.from('affiliate_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: admin.id }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // DELETE ?action=affiliate-delete-request&id=<requestId>
  if (req.method === 'DELETE' && action === 'affiliate-delete-request') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('affiliate_requests').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // POST ?action=affiliate-revoke&id=<userId> — disable access, keep all history
  if (req.method === 'POST' && action === 'affiliate-revoke') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'user id required' });
    const { error } = await supabase.from('profiles').update({ affiliate_enabled: false, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    // Deactivate their codes so they stop validating at checkout (orders/commissions untouched)
    await supabase.from('affiliate_codes').update({ active: false, updated_at: new Date().toISOString() }).eq('user_id', id);
    return json(res, 200, { success: true });
  }

  // POST ?action=affiliate-enable&id=<userId> — re-enable a previously revoked affiliate
  if (req.method === 'POST' && action === 'affiliate-enable') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'user id required' });
    const { error } = await supabase.from('profiles').update({ affiliate_enabled: true, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    await supabase.from('affiliate_codes').update({ active: true, updated_at: new Date().toISOString() }).eq('user_id', id);
    return json(res, 200, { success: true });
  }

  // GET ?action=affiliate-list — admin: all affiliates with codes + earnings
  if (req.method === 'GET' && action === 'affiliate-list') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { data: profiles } = await supabase.from('profiles')
      .select('id,name,username,email,role,affiliate_enabled,affiliate_approved_at,payout_account_name,payout_bank_name,payout_account_number,payout_payment_method,payout_note')
      .eq('affiliate_enabled', true).order('name');
    const { data: codes } = await supabase.from('affiliate_codes').select('*').order('created_at', { ascending: false });
    const { data: orders } = await supabase.from('orders').select('id,status,items,total_thb,affiliate_user_id,affiliate_code,affiliate_discount_thb,affiliate_commission_thb,affiliate_paid_at,created_at,delivered_at').not('affiliate_user_id', 'is', null);
    const { data: payouts } = await supabase.from('affiliate_payouts').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    const result = (profiles || []).map(pf => {
      const myOrders = (orders || []).filter(o => o.affiliate_user_id === pf.id);
      return {
        ...pf,
        codes: (codes || []).filter(c => c.user_id === pf.id),
        orders: myOrders,
        payouts: (payouts || []).filter(py => py.affiliate_user_id === pf.id),
        summary: summarizeAffiliate(myOrders, pf.affiliate_approved_at),
      };
    });
    return json(res, 200, result);
  }

  // GET ?action=affiliate-my — affiliate dashboard (own codes + referred orders + summary)
  if (req.method === 'GET' && action === 'affiliate-my') {
    const user = await requireAuth(req, res);
    if (!user) return;
    if (!user.affiliate_enabled) return json(res, 403, { error: 'No affiliate access' });
    const { data: codes } = await supabase.from('affiliate_codes').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    const { data: orders } = await supabase.from('orders')
      .select('id,status,items,total_thb,affiliate_code,affiliate_discount_thb,affiliate_commission_thb,affiliate_paid_at,created_at,delivered_at')
      .eq('affiliate_user_id', user.id).gte('created_at', user.affiliate_approved_at || '1970-01-01').order('created_at', { ascending: false });
    const { data: payouts } = await supabase.from('affiliate_payouts').select('*').eq('affiliate_user_id', user.id).order('year', { ascending: false }).order('month', { ascending: false });
    const payoutAccount = {
      payout_account_name: user.payout_account_name || '',
      payout_bank_name: user.payout_bank_name || '',
      payout_account_number: user.payout_account_number || '',
      payout_payment_method: user.payout_payment_method || '',
      payout_note: user.payout_note || '',
    };
    return json(res, 200, { codes: codes || [], orders: orders || [], payouts: payouts || [], payoutAccount, summary: summarizeAffiliate(orders || []) });
  }

  // POST ?action=affiliate-code — admin creates an extra code for an affiliate
  if (req.method === 'POST' && action === 'affiliate-code') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const b = req.body || {};
    const code = (b.code || '').toUpperCase().trim();
    if (!b.user_id) return json(res, 400, { error: 'user_id required' });
    if (!code || !/^[A-Z0-9]{1,10}$/.test(code)) return json(res, 400, { error: 'Code must be uppercase letters/numbers, max 10 chars.' });
    const { data: dup } = await supabase.from('affiliate_codes').select('id').eq('code', code).limit(1);
    if (dup && dup.length) return json(res, 409, { error: 'That code is already taken.' });
    const { data, error } = await supabase.from('affiliate_codes').insert({
      user_id: b.user_id, code,
      discount_amount: b.discount_amount != null ? Number(b.discount_amount) : 10,
      affiliate_commission: b.affiliate_commission != null ? Number(b.affiliate_commission) : 20,
      active: b.active !== false,
    }).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // PUT ?action=affiliate-code&id=<codeId> — admin edits code/discount/commission/active
  if (req.method === 'PUT' && action === 'affiliate-code') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const b = req.body || {};
    const updates = { updated_at: new Date().toISOString() };
    if (b.code !== undefined) {
      const code = (b.code || '').toUpperCase().trim();
      if (!/^[A-Z0-9]{1,10}$/.test(code)) return json(res, 400, { error: 'Code must be uppercase letters/numbers, max 10 chars.' });
      const { data: dup } = await supabase.from('affiliate_codes').select('id').eq('code', code).neq('id', id).limit(1);
      if (dup && dup.length) return json(res, 409, { error: 'That code is already taken.' });
      updates.code = code;
    }
    if (b.discount_amount !== undefined) updates.discount_amount = Number(b.discount_amount);
    if (b.affiliate_commission !== undefined) updates.affiliate_commission = Number(b.affiliate_commission);
    if (b.active !== undefined) updates.active = !!b.active;
    const { data, error } = await supabase.from('affiliate_codes').update(updates).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // DELETE ?action=affiliate-code&id=<codeId> — admin deletes a (test) code
  if (req.method === 'DELETE' && action === 'affiliate-code') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('affiliate_codes').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // POST ?action=affiliate-mark-paid&id=<orderId> — admin marks commission paid
  if (req.method === 'POST' && action === 'affiliate-mark-paid') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'order id required' });
    const b = req.body || {};
    const updates = {
      affiliate_paid_at: b.unpay ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (b.payout_proof_url !== undefined) updates.affiliate_payout_proof_url = b.payout_proof_url;
    if (b.payout_note !== undefined) updates.affiliate_payout_note = b.payout_note;
    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select('id,affiliate_paid_at,affiliate_payout_proof_url,affiliate_payout_note').single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // PUT ?action=payout-account — the caller edits their OWN payout account details
  //   (shared by artists & affiliates; both stored on profiles).
  if (req.method === 'PUT' && action === 'payout-account') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const b = req.body || {};
    const fields = ['payout_account_name', 'payout_bank_name', 'payout_account_number', 'payout_payment_method', 'payout_note'];
    const updates = { updated_at: new Date().toISOString() };
    fields.forEach(f => { if (b[f] !== undefined) updates[f] = b[f]; });
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', user.id)
      .select('id,payout_account_name,payout_bank_name,payout_account_number,payout_payment_method,payout_note').single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, data);
  }

  // GET ?action=payout-account&user_id=X — admin reads a user's payout account details.
  // Payout details live on the person's OWN profile. For artists, the admin may pass an
  // artist *profile* id that's linked to a promoted user — so if the passed row has no
  // payout details, resolve the promoted user (profiles.artist_id = X) and use theirs.
  if (req.method === 'GET' && action === 'payout-account') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const uid = req.query.user_id;
    if (!uid) return json(res, 400, { error: 'user_id required' });
    const COLS = 'id,name,email,payout_account_name,payout_bank_name,payout_account_number,payout_payment_method,payout_note';
    const hasDetails = (r) => r && (r.payout_account_name || r.payout_account_number || r.payout_bank_name || r.payout_payment_method);
    const { data, error } = await supabase.from('profiles').select(COLS).eq('id', uid).single();
    if (error) return json(res, 404, { error: 'Not found' });
    if (hasDetails(data)) return json(res, 200, data);
    // Look for a promoted user linked to this artist profile (excluding self).
    const { data: linked } = await supabase.from('profiles').select(COLS).eq('artist_id', uid).neq('id', uid).limit(1);
    if (linked && linked.length && hasDetails(linked[0])) return json(res, 200, linked[0]);
    return json(res, 200, data);
  }

  // GET ?action=affiliate-payouts — payout records (admin: all/by affiliate_id; affiliate: own)
  if (req.method === 'GET' && action === 'affiliate-payouts') {
    const user = await requireAuth(req, res);
    if (!user) return;
    let q = supabase.from('affiliate_payouts').select('*').order('year', { ascending: false }).order('month', { ascending: false });
    if (user.role === 'admin') {
      const affiliateId = req.query.affiliate_id;
      if (affiliateId) q = q.eq('affiliate_user_id', affiliateId);
    } else {
      q = q.eq('affiliate_user_id', user.id);
    }
    const { data, error } = await q;
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data || []);
  }

  // POST ?action=affiliate-payout — admin creates/updates a payout record
  if (req.method === 'POST' && action === 'affiliate-payout') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const b = req.body || {};
    const FIELDS = ['calculated_commission', 'paid_amount', 'status', 'payout_proof_url', 'payout_note', 'paid_at'];
    if (b.id) {
      const updates = { updated_at: new Date().toISOString() };
      FIELDS.forEach(k => { if (b[k] !== undefined) updates[k] = b[k]; });
      const { data, error } = await supabase.from('affiliate_payouts').update(updates).eq('id', b.id).select().single();
      if (error) return json(res, 400, { error: error.message });
      return json(res, 200, data);
    }
    if (!b.affiliate_user_id || !b.month || !b.year) return json(res, 400, { error: 'affiliate_user_id, month, year required' });
    const row = { affiliate_user_id: b.affiliate_user_id, month: parseInt(b.month), year: parseInt(b.year), status: b.status || 'pending' };
    FIELDS.filter(k => k !== 'status').forEach(k => { if (b[k] !== undefined) row[k] = b[k]; });
    const { data, error } = await supabase.from('affiliate_payouts').insert(row).select().single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 201, data);
  }

  // DELETE ?action=affiliate-payout&id=<payoutId> — admin deletes a (test) record
  if (req.method === 'DELETE' && action === 'affiliate-payout') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const { id } = req.query;
    if (!id) return json(res, 400, { error: 'id required' });
    const { error } = await supabase.from('affiliate_payouts').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  // ─────────────────────────── End Affiliate ───────────────────────────

  if (action === 'me') {
    if (req.method === 'GET') {
      const user = await requireAuth(req, res);
      if (!user) return;
      return json(res, 200, user);
    }
    if (req.method === 'PUT') {
      const user = await requireAuth(req, res);
      if (!user) return;
      const body = req.body || {};
      const fields = ['name','username','bio','first_name','last_name','phone','delivery_email','shipping_address','province','postal_code','preferred_lang','community_about','community_country','community_favorite_medium'];
      const updates = { updated_at: new Date().toISOString() };
      fields.forEach(f => { if (body[f] !== undefined) updates[f] = body[f]; });

      // Fluffy Creator profile — stored inside the existing social_links jsonb
      // (under a "creator" sub-object) so it needs NO new DB columns/migration.
      const creatorKeys = ['creator_bio','creator_tiktok','creator_instagram','creator_youtube','creator_website'];
      if (creatorKeys.some(k => body[k] !== undefined)) {
        const { data: cur } = await supabase.from('profiles').select('social_links').eq('id', user.id).single();
        const sl = (cur && cur.social_links) || {};
        const creator = { ...(sl.creator || {}) };
        creatorKeys.forEach(k => { if (body[k] !== undefined) creator[k.replace('creator_', '')] = body[k]; });
        updates.social_links = { ...sl, creator };
      }
      console.log('[users PUT] user:', user.id, 'updating:', JSON.stringify(updates));

      // upsert keyed by user.id (auth.users.id) — NEVER by email
      // Each user always has exactly one profile row
      const upsertData = {
        id: user.id,          // primary key = auth user id
        email: user.email,
        role: user.role || 'customer',
        ...updates,
      };
      const PROFILE_SELECT = 'id,email,name,username,role,bio,artist_slug,favorites,first_name,last_name,phone,delivery_email,shipping_address,province,postal_code,preferred_lang,community_about,community_country,community_favorite_medium,social_links';
      const { data, error } = await supabase
        .from('profiles')
        .upsert(upsertData, { onConflict: 'id' })
        .select(PROFILE_SELECT)
        .single();

      if (error) {
        console.error('[users PUT] UPSERT ERROR:', error.code, error.message, error.details, error.hint);
        // Fallback: try plain update
        const { data: d2, error: e2 } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select(PROFILE_SELECT)
          .single();
        if (e2) {
          console.error('[users PUT] UPDATE FALLBACK ERROR:', e2.code, e2.message, e2.hint);
          return json(res, 400, { error: e2.message, code: e2.code });
        }
        console.log('[users PUT] fallback update succeeded');
        return json(res, 200, d2);
      }
      console.log('[users PUT] upsert succeeded, returning:', JSON.stringify(data));
      return json(res, 200, data);
    }
  }

  if (action === 'favorites') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('favorites').eq('id', user.id).single();
    const current = profile?.favorites || [];
    if (req.method === 'GET') return json(res, 200, current);
    if (req.method === 'POST') {
      const updated = current.includes(productId) ? current : [...current, productId];
      await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
      return json(res, 200, { favorites: updated });
    }
    if (req.method === 'DELETE') {
      const updated = current.filter(id => id !== productId);
      await supabase.from('profiles').update({ favorites: updated }).eq('id', user.id);
      return json(res, 200, { favorites: updated });
    }
  }

  // GET /api/users (admin list all)
  if (req.method === 'GET' && !action) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('profiles').select('id,email,name,role,artist_slug,created_at').order('created_at');
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  return json(res, 405, { error: 'Method not allowed' });
};
