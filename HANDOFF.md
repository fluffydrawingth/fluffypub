# Fluffy Pub — Project Handoff

_Last updated: 2026-06-19_

A bilingual (Thai/English) e-commerce site for adorable coloring books — physical + digital
products, an artist marketplace, and an affiliate program. This document is the single
orientation point for anyone (human or AI) picking up the project.

---

## 1. Tech Stack & Architecture

- **Frontend:** React + TypeScript + Vite SPA. **Hash router** (`/#/...`), custom and tiny
  (`src/lib/router.tsx`) — no React Router.
- **Backend:** Vercel **serverless functions** in `/api/*.js` (Node, CommonJS).
- **Database:** Supabase (PostgreSQL). The API uses the **service role key** (bypasses RLS);
  all access control is enforced in code, not RLS.
- **Storage:** Supabase Storage for uploads; **Cloudflare R2** for digital product files.
- **Payments:** Thai **PromptPay** (QR + manual slip upload + admin approval). **PayPal.me**
  link for USD digital-only orders. No automated payment verification.
- **Hosting:** Vercel (Hobby plan). Auto-builds from `git push` (`buildCommand: vite build`).
- **Deploy flow:** Push via **GitHub Desktop** only (no terminal git auth on this machine).
  Vercel rebuilds the frontend AND the API from source on every push. The committed `dist/`
  is rebuilt by Vercel, so it doesn't strictly matter, but we rebuild + commit it anyway.

### Hard constraints (do not violate)
- **Vercel Hobby = max 12 serverless functions.** We are AT the cap. `_lib.js` is a shared
  module (not a function). **Never add a new `api/*.js` file** — fold new endpoints into an
  existing file via `?action=` query params.
  Current 12: `analytics, artists, auth, categories, debug, orders, pages, products,
  promptpay, theme, upload, users`.
- **Bilingual everywhere:** use `useLang().tRaw(th, en)` for user-facing text.
- **THB is the base currency.** USD is secondary. Physical products are THB-only at checkout.

---

## 2. Repository Map

```
api/
  _lib.js        Shared: supabase client, getUser/requireAuth, json() (sets no-store)
  auth.js        login / register / me / password reset / email confirm
  users.js       profile (me), favorites, admin user list, AFFILIATE program + payouts,
                 payout-account (shared artist+affiliate)
  artists.js     artist profiles, artist requests/approve/reject/revoke, ARTIST payouts
  products.js    products CRUD, ?mine=1 (artist), ?admin=1
  orders.js      order create/pay/slip/status, artist+admin order views, AFFILIATE code
                 validation & commission attribution, delivered_at stamping
  pages.js       CMS pages, free downloads (?type=free-download), legal pages (?type=legal)
  categories.js  category CRUD
  theme.js       theme/CMS config (single row id=1)
  promptpay.js   PromptPay QR generation
  upload.js      signed upload URLs
  analytics.js   admin dashboard stats
  community.js   "Share Your Colorful World" community posts + reactions

src/
  lib/   auth.tsx, router.tsx, theme.tsx, cart.tsx, lang.tsx, favorites.tsx, api.ts,
         useGuidelines.ts
  pages/ HomePage, ProductsPage, ProductDetailPage, DigitalProductsPage, CartPage,
         CheckoutPage, AccountPage, ArtistDashboardPage, AffiliateDashboardPage,
         ArtistApplicationPage, AffiliateApplicationPage, AdminPage, ArtistsPage,
         ArtistProfilePage, Legal/CMS/FreeDownload pages, etc.
  components/ Navbar, Footer, ProductCard, ImageUpload, ...

scripts/  *.sql migrations (run manually in Supabase SQL editor — see §7)
```

### `profiles` table = users AND artists
A single `profiles` row per auth user. Key columns:
- `role`: `customer | artist | admin` (admin forced for `fluffydrawing.th@gmail.com`)
- `artist_id`: links a promoted user to an artist profile (self = own id)
- `affiliate_enabled`: boolean — affiliate permission (independent of role)
- `username`: public display name (separate from real name / address)
- `payout_account_name / payout_bank_name / payout_account_number /
  payout_payment_method / payout_note`: shared payout details (artist + affiliate)
- standard: `name, first_name, last_name, email, phone, delivery_email,
  shipping_address, province, postal_code, bio, avatar_url, artist_slug, favorites`

---

## 3. Core Business Rules

### Roles & permissions (a user can hold several at once)
- **customer + artist + affiliate** can all be true simultaneously. Affiliate is a
  *permission flag*, not a role.
- **Artist access** = `role === 'artist'` (and `artist_id` set). Grants Artist Studio.
- **Affiliate access** = `affiliate_enabled === true`. Grants Affiliate Dashboard.

### Artist royalties / earnings
- Physical: **100 THB per item** (default; admin-editable per product
  `artist_physical_royalty_thb`).
- Digital: **80% of sale price** to artist (default; `digital_artist_royalty_percent`),
  20% platform.
- THB and USD earnings tracked separately.
- Only paid statuses count: `paid, packing, shipped, delivered`.

### Affiliate program
- Codes: **uppercase, ≤10 chars, unique**. Each code has `discount_amount` (default 10 THB)
  and `affiliate_commission` (default 20 THB), `active` flag.
- Codes apply to **physical products ONLY**, **THB only**, **min ฿200** physical subtotal.
- Discount applies to physical items only; digital items never discounted.
- **Codes are REUSABLE** — any account/email may use a code on unlimited orders. The only
  off-switch is the admin deactivating/deleting the code. (No one-per-customer limit.)
- One affiliate code per order. Affiliates cannot use their own code.
- **Commission counts ONLY when order `status = 'delivered'`** and the order has physical
  items. Pending/submitted/cancelled/digital never count.
- **Monthly payout bucket = delivery month** (`orders.delivered_at`, stamped when an order
  first becomes delivered; falls back to `created_at` for old orders).
- Affiliate dashboard summary cards are **lifetime cumulative**; the monthly payout
  section is per-month.

### Payouts (artist & affiliate)
- Manual. Admin auto-calculates per artist/affiliate + month/year, can adjust the paid
  amount, set status pending/paid, upload proof, add a note, record paid date.
- Payout account details live on the user's own profile and are shown to the admin near
  the payout form. For linked artists, the admin lookup resolves the promoted user's row.

### Guidelines vs Policy vs Settings (keep separate)
- **Guidelines** = short bullet list shown before requesting artist/affiliate (CMS Legal
  Pages `artist-guidelines` / `affiliate-guidelines`, one bullet per line; parser handles
  plain text OR HTML lists). Loaded via `src/lib/useGuidelines.ts` with built-in fallback.
- **Policy/Agreement** = full docs (`artist-agreement` / `affiliate-agreement`), linked
  from inside Artist Studio / Affiliate Dashboard (post-approval).
- **Settings** = calculation values (royalty %, commission). Never mixed with copy.

---

## 4. Completed Systems

- ✅ Storefront: products (physical/digital), product detail, cart, checkout, categories.
  Homepage category cards deep-link to `/products?cat=<name>` (pre-filters the shop).
  Homepage hero stats are CMS-editable and hide when left blank.
- ✅ Auth: email/password, email confirm, password reset. `/me` is the single source of
  truth; responses are `no-store` (uncacheable). `getUser` uses `select('*')` so a
  not-yet-migrated column can never break auth.
- ✅ Checkout: PromptPay (QR + slip upload + admin approve), PayPal.me (USD digital-only),
  guest checkout, order tracking, confirmation emails.
- ✅ Artist marketplace: request → admin approve (sets role+artist_id) → Artist Studio
  (profile, products read-only, sales, earnings, payout account). Revoke supported.
- ✅ Affiliate program: request → admin approve (sets affiliate_enabled + creates code) →
  Affiliate Dashboard (code, earnings, history, payout account). Checkout code field.
  Admin Affiliates tab (dropdown selector) with codes, earnings, monthly payouts, proof
  upload, enable/disable, revoke.
- ✅ Admin panel: dashboard, products, orders, artists, artist requests, artist payouts,
  affiliate requests, affiliates, categories, CMS pages, free downloads, legal pages,
  theme & CMS, language CMS.
- ✅ Username (display name) for customers — editable in profile, shown in account header,
  affiliate request name, and admin artist/affiliate request + payout dropdowns.
- ✅ Legal pages fully dynamic: any single-segment slug (e.g. `/contactus`) resolves to a
  legal page; unknown ones show LegalPage's own "not found" (no homepage redirect).

---

## 5. Known Recurring Pitfalls (root causes, now fixed — keep in mind)

These caused repeated "approved but can't access dashboard" bugs. Root causes & fixes:
1. **Cached `/me`** — browser served stale current-user. Fix: `json()` sends
   `Cache-Control: no-store`; client `refreshUser()` uses `cache:'no-store'` + cache-bust.
2. **Curated SELECT breaking on new columns** — adding a column to a hand-listed select
   threw `42703` and dropped fields/logged users out. Fix: `getUser` uses `select('*')`.
3. **upsert clobbering role** — a transient profile read fell through to an upsert that
   reset role to `customer`. Fix: insert-only when truly missing; never overwrite role.
4. **Profile page used request *status* while guards used *permission*.** Rule: request
   status ≠ permission. Always gate on profile permission fields.
5. **Affiliate access made server-authoritative** — the Account card and the dashboard now
   verify via `getMyAffiliate()` (server checks `affiliate_enabled` in DB) instead of
   trusting the possibly-stale client flag.

**Golden rule going forward:** run the SQL migration BEFORE pushing code that uses a new
column (migrations are `add column if not exists`, safe to run early). This eliminates the
"works after refresh / rerun SQL" class of bug entirely.

---

## 6. Unresolved / Watch-list

- **No automated payment verification** (by design) — admin manually approves PromptPay
  slips.
- **Legal page content is single-language** (one `content` field). Guidelines fall back to
  bilingual defaults until edited, but once an admin edits, it's whatever language they
  type. True per-language legal CMS is a future enhancement.
- **Linked-artist payout edge case:** payout account is on the user's own profile; the
  admin Artist Payouts lookup resolves the promoted user for linked artists. Self-promoted
  artists (the common case) are unaffected.
- **Username not yet surfaced** in public-facing spots beyond account header / requests
  (e.g., no public reviews/profile use yet).
- **Pre-existing TypeScript errors** exist (theme fields, Navbar) — Vite build ignores them
  (`vite build` doesn't typecheck). Not blocking, but `tsc --noEmit` is noisy.
- **Bundle size** > 500kB (single chunk) — code-splitting is a future optimization.

---

## 7. Database Migrations (run manually in Supabase SQL editor)

All are idempotent (`if not exists`). Run a migration **before** deploying code that needs
its columns. Affiliate-related (most recent work):
- `migrate_affiliate.sql` — affiliate_enabled, affiliate_requests, affiliate_codes,
  affiliate_payouts, payout_* columns, grants.
- `migrate_delivered_at.sql` — `orders.delivered_at` (+ backfill) for delivery-month payout
  buckets. **Required.**
- `migrate_username.sql` — `profiles.username`. **Required for username features.**
- `seed_guidelines.sql` — creates editable Legal Pages: artist/affiliate guidelines +
  agreements (won't overwrite existing edits).

Older: earnings, currency/USD pricing, artist requests, email logs, free downloads, guest
token, payment-submitted, R2 fields, search keywords, plus base `schema*.sql`.

> If new tables ever raise "permission denied for table ...", add
> `grant all privileges on <table> to anon, authenticated, service_role;`

---

## 8. Future Roadmap (suggested)

- Per-language legal/CMS content (TH/EN fields).
- Surface usernames publicly (reviews, artist credits).
- Affiliate analytics (clicks, conversion), shareable referral links.
- Automated payout exports / accounting integration.
- Code-splitting & performance pass.
- Optional: stricter TypeScript (resolve pre-existing errors, add CI typecheck).

---

## 9. Development Rules (read before changing code)

1. **Never add a new `api/*.js` file** (12-function cap). Fold into existing via `?action=`.
2. **Do not change** without explicit need: checkout flow, order creation, payment/PromptPay,
   PayPal, digital download/R2 logic, artist payout calculation. These are load-bearing.
3. **Run the SQL migration before pushing** code that references a new column.
4. **All user-facing strings bilingual** via `tRaw(th, en)`.
5. **THB behavior must stay unchanged**; physical = THB only.
6. **Permission, not request status**, gates dashboard access. Prefer server-authoritative
   checks for affiliate access.
7. **API responses stay uncacheable** (`json()` already sets no-store) — don't reintroduce
   caching on user/permission endpoints.
8. **Use `select('*')` (or tolerant queries) for the profile** in auth paths; don't
   hand-list columns that break when a migration lags.
9. **Verify with a build** (`npx vite build`) and, for API, `node -e "require('./api/x.js')"`
   to catch syntax errors. Use the preview tools to sanity-check UI where possible.
10. Admin is `fluffydrawing.th@gmail.com` (role forced to admin client+server side).

---

## 10. Key Accounts / Config

- **Admin email:** `fluffydrawing.th@gmail.com`
- **Env (Vercel):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, R2 creds,
  email creds. (Not in repo.)
- **Git author:** fluffydrawingth · default branch `main`.
