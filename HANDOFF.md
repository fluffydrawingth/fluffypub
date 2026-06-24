# Fluffy Pub — Project Handoff

## What is this?

**Fluffy Pub** (fluffypub.com) is an e-commerce and community platform for coloring book products by Chollathip (Fluffy_Drawing). It sells physical and digital coloring books, runs a community for colorists, and publishes a bilingual journal.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite SPA |
| Routing | Custom hash router (`src/lib/router.tsx`) — no React Router |
| Backend | Vercel Serverless Functions (`api/*.js`) |
| Database | Supabase (PostgreSQL + PostgREST) |
| Auth | Supabase JWT — decoded server-side, stored as `fluffy_token` in localStorage |
| File Storage | Supabase Storage (images) + Cloudflare R2 (digital files: PDF, ZIP) |
| Payments | PromptPay QR (Thailand) + PayPal (international) |
| Email | Resend API |
| Deployment | Vercel — auto-deploys from GitHub `main` branch |

---

## CRITICAL: Vercel Hobby 12-Function Cap

The project is AT the 12 serverless function limit. **Never add a new `api/*.js` file.**
All new endpoints must go into an existing file using `?action=` or `?type=` query params.

Current 12 files:
```
_lib.js  analytics.js  artists.js  auth.js  categories.js  community.js
orders.js  pages.js  products.js  promptpay.js  theme.js  upload.js
```

---

## Environment Variables (Vercel Dashboard)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS — server-side only |
| `SUPABASE_ANON_KEY` | Public key |
| `PROMPTPAY_ID` | PromptPay phone/tax number |
| `RESEND_API_KEY` | Transactional email |
| `EMAIL_FROM` | From address for emails |
| `SITE_URL` | https://fluffypub.com |
| `ADMIN_EMAIL` | fluffydrawing.th@gmail.com |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_BUCKET_NAME` | R2 bucket for digital files |
| `R2_ACCESS_KEY_ID` | R2 credentials |
| `R2_SECRET_ACCESS_KEY` | R2 credentials |

---

## Database Tables (Supabase)

### Core
| Table | Purpose |
|---|---|
| `profiles` | All users. `role`: customer / artist / admin. Has `artist_id`, `contact_email`, `social_links` |
| `products` | Coloring books. `option_type`: physical / digital |
| `categories` | Product categories |
| `orders` | All orders. `payment_method`: promptpay / paypal. `payment_status`: pending / paid / cancelled |
| `order_email_logs` | Tracks which confirmation emails were sent |
| `theme` | Single-row live CMS config — colors, fonts, banners, maintenance mode |
| `pages` | CMS pages |
| `legal_pages` | Legal documents (terms, privacy, artist/affiliate agreements) |
| `free_downloads` | Free downloadable resources |

### Artists & Affiliates
| Table | Purpose |
|---|---|
| `artist_requests` | Artist applications — status: pending / approved / rejected |
| `artist_payouts` | Admin-managed payout records |
| `affiliate_codes` | Discount codes linked to affiliates |
| `affiliate_requests` | Affiliate program applications |
| `affiliate_payouts` | Affiliate payout records |
| `creator_commissions` | Commission tracking |

### Community
| Table | Purpose |
|---|---|
| `community_posts` | User artwork posts. Has `mediums`, `markers`, `palettes` jsonb arrays |
| `community_reactions` | Post reactions: love / inspiring / cozy / cute_palette / want_to_try / save |
| `community_highlights` | Admin events/announcements. Has `content_blocks` jsonb array, `card_size` (sm/md/lg) |
| `community_follows` | User follow relationships |
| `external_books` | Coloring books referenced in community but not sold in shop |

### Journal
| Table | Purpose |
|---|---|
| `journal_articles` | Bilingual articles. `title_th/en`, `excerpt_th/en`, `content_th/en` (HTML), `article_type`, `share_count` |
| `journal_reactions` | Love / save per article per user |

### Rule for every new table
```sql
grant all on <table> to service_role;
grant all on <table> to authenticated;
grant all on <table> to anon;
notify pgrst, 'reload schema';
```

---

## API File Map

| File | Handles |
|---|---|
| `api/_lib.js` | Shared: supabase client, `getUser()`, `requireAuth()`, `json()` |
| `api/auth.js` | Login, register, logout, me, reset password |
| `api/products.js` | Product CRUD, search, `?mine=1` for artist's own products |
| `api/orders.js` | Orders, payment slip upload, artist sales, email notifications |
| `api/artists.js` | Artist profiles, requests (apply/approve/reject/revoke), `PUT ?action=me` |
| `api/community.js` | Community posts, reactions, highlights — all via `?action=` |
| `api/pages.js` | CMS pages (`?type=page`), free downloads (`?type=free-download`), legal (`?type=legal`), journal (`?type=journal`) |
| `api/upload.js` | Supabase Storage images + Cloudflare R2 presigned URLs |
| `api/theme.js` | Live site theme and label CMS |
| `api/categories.js` | Product categories |
| `api/promptpay.js` | Generate PromptPay QR code |
| `api/analytics.js` | Admin dashboard stats |

---

## Frontend Structure

```
src/
├── lib/
│   ├── api.ts          All fetch calls — single source of truth
│   ├── auth.tsx        AuthContext — session, login/logout
│   ├── router.tsx      Hash router — parses window.location.hash
│   ├── theme.tsx       ThemeContext — live theme from /api/theme
│   ├── lang.tsx        TH/EN language switching + translations
│   ├── cart.tsx        Cart state (localStorage)
│   └── favorites.tsx   Favorites state
├── components/
│   ├── Navbar.tsx
│   └── Footer.tsx
└── pages/              One file per route
```

---

## Route Map

| URL | File |
|---|---|
| `/` | `HomePage.tsx` |
| `/products` | `ProductsPage.tsx` |
| `/products/:slug` | `ProductDetailPage.tsx` |
| `/digital-products` | `DigitalProductsPage.tsx` |
| `/cart` | `CartPage.tsx` |
| `/checkout` | `CheckoutPage.tsx` |
| `/artists` | `ArtistsPage.tsx` |
| `/artists/:slug` | `ArtistProfilePage.tsx` |
| `/free-downloads` | `FreeDownloadsPage.tsx` |
| `/free-downloads/:slug` | `FreeDownloadDetailPage.tsx` |
| `/journal` | `JournalPage.tsx` |
| `/journal/:slug` | `JournalArticlePage.tsx` |
| `/community` | `CommunityPage.tsx` |
| `/community/highlights` | `CommunityHighlightsPage.tsx` |
| `/community/highlights/:id` | `HighlightDetailPage` (same file) |
| `/community/creators` | `CommunityCreatorsPage.tsx` |
| `/community/:id` | `CommunityPostPage.tsx` |
| `/creator/:id` | `CreatorProfilePage.tsx` |
| `/community/book/:slug` | `ExternalBookPage.tsx` |
| `/account` | `AccountPage.tsx` — tabs: orders, saved, profile, favorites |
| `/admin` | `AdminPage.tsx` — admin only |
| `/artist-dashboard` | `ArtistDashboardPage.tsx` — artist only |
| `/login` | `LoginPage.tsx` |
| `/about-us` etc. | `LegalPage.tsx` |

---

## User Roles

| Role | Access |
|---|---|
| `customer` | Shop, checkout, community, apply for artist/affiliate |
| `artist` | + Read-only dashboard (own products, sales, earnings), edit own profile |
| `admin` | Everything — full admin panel |

Admin is **double-gated**: role must be `admin` AND email must be `fluffydrawing.th@gmail.com`.

---

## Key Features Summary

### Shop
- Physical (THB only) and digital (THB or USD) products
- PromptPay QR + PayPal checkout
- Order confirmation emails via Resend
- Guest checkout with order tracking

### Artist System
- Customer applies → admin approves/rejects in Admin → Artist Requests tab
- Approved: `role` set to `artist`, optional `artist_id` links to existing artist profile
- Admin can revoke back to `customer` — products/orders preserved
- Artist dashboard is read-only (no create/delete/publish/price changes)

### Affiliate System
- Separate application and approval flow
- Discount codes (`affiliate_codes`), commissions tracked in `creator_commissions`

### Community
- Artwork post feed with tags, reactions, bookmarks
- Follow creators
- Highlights & Events: admin cards with rich text+image blocks, widget-style grid sizes (sm/md/lg)

### Fluffy Journal
- Bilingual TH/EN articles written in Thai, auto-translated via Google Translate (no API key)
- Rich text editor in admin: Bold, Italic, H2/H3, lists, links, inline image upload
- 4 categories: มุมระบายสี / มุมอุปกรณ์ / มุมโปรด / เล่าให้ฟัง
- Detail page: 2-column desktop (image left, info+reactions right), stacks on mobile
- Reactions: Love / Save / Share. Saved articles appear in Account → Saved tab

### Theme & CMS
- Admin changes colors, fonts, hero text, banner, maintenance mode — live without redeploy
- Nav labels customizable per language via Language CMS in admin

---

## Deployment

1. Push to `main` on GitHub (via GitHub Desktop)
2. Vercel auto-builds and deploys (~1–2 min)
3. Database migrations run manually in **Supabase → SQL Editor**

### Pending migrations (run in order if not yet done)
```
scripts/migrate_journal_v1.sql      — creates journal_articles table
scripts/migrate_highlights_v2.sql   — adds content_blocks to community_highlights
scripts/migrate_highlights_v3.sql   — adds card_size to community_highlights
scripts/migrate_journal_v2.sql      — creates journal_reactions + share_count column
```

---

## Gotchas & Rules

| Rule | Detail |
|---|---|
| No new API files | 12-function hard cap — use `?action=` or `?type=` in existing files |
| PUT is unreliable on Vercel | All updates use `POST ?action=...-update` instead |
| New tables need GRANTs | `grant all on <table> to service_role/authenticated/anon` + `notify pgrst, 'reload schema'` |
| `uploadFile` returns `publicUrl` | Always use `r.publicUrl` not `r.url` |
| Auth token key | `fluffy_token` in localStorage, sent as `Authorization: Bearer <token>` |
| `content_blocks` format | jsonb array: `[{ type: 'text', value: '...' }, { type: 'image', url: '...' }]` |
| Journal content is HTML | Stored as raw HTML from rich text editor, rendered with `dangerouslySetInnerHTML` |
| Journal reactions API | `GET ?action=reactions&id=` must NOT be caught by the admin-only `GET && id` block — always guard that block with `&& !action` |
| RichEditor init | Uses `useLayoutEffect` (not `useEffect`) so innerHTML is set synchronously before blur fires |
