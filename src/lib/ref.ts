// Fluffy Creator referral tracking.
// When a visitor opens a creator's tagged-product link (…?ref=<creatorId>), we remember
// that creator (last-click, 30-day window). If the visitor later buys physical products,
// the order is attributed to that creator for commission — via the SAME affiliate_user_id
// field the existing commission/payout system already uses. No discount is applied for
// ref links (that's the affiliate-code path); ref only tracks commission.

const KEY = 'fluffy_ref';
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Call on every navigation: if the URL hash carries ?ref=, store it.
export function captureRefFromHash() {
  try {
    const h = window.location.hash || '';
    const qi = h.indexOf('?');
    if (qi < 0) return;
    const ref = new URLSearchParams(h.slice(qi + 1)).get('ref');
    if (ref) localStorage.setItem(KEY, JSON.stringify({ id: ref, ts: Date.now() }));
  } catch {}
}

// The currently-attributed creator id, or null if none / expired.
export function getActiveRef(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o?.id) return null;
    if (Date.now() - (o.ts || 0) > WINDOW_MS) { localStorage.removeItem(KEY); return null; }
    return o.id;
  } catch { return null; }
}

export function clearRef() { try { localStorage.removeItem(KEY); } catch {} }

// Stable anonymous browser id — lets logged-out visitors react once per post/type
// (dedupe = light spam protection) without an account.
const GUEST_KEY = 'fluffy_guest_id';
export function getGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `g_${Date.now()}_${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `g_${Math.random().toString(36).slice(2)}`;
  }
}
