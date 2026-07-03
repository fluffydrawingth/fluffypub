# FluffyPub Project Handoff

Last updated: 2026-07-04

This is the primary handoff document for future work on FluffyPub. Keep it current whenever major backend, frontend, database, deployment, payment, auth, SEO, or content-management work is completed.

## Project Overview

FluffyPub is an online marketplace and creative community for coloring books, digital downloads, artists, and cozy coloring content. It supports physical products, digital downloads, community posts, Fluffy Journal articles, free downloads, artists, creator/affiliate referrals, bilingual Thai/English content, admin management, and order/payment workflows.

The project is a production-style Vite React single-page app deployed on Vercel. Supabase provides authentication, Postgres data, and Storage. Server-side behavior lives in Vercel serverless functions under `api/`.

## Tech Stack

- Frontend: React, TypeScript, Vite.
- Routing: custom hash router in `src/lib/router.tsx`.
- Backend: Vercel Serverless Functions in CommonJS JavaScript under `api/`.
- Database/Auth/Storage: Supabase.
- External file storage: Cloudflare R2 for large downloadable files.
- Payments: PromptPay QR and PayPal/manual payment flows.
- Email: Resend when `RESEND_API_KEY` is configured.
- SEO: custom metadata helper in `src/lib/seo.tsx`, dynamic `robots.txt` and `sitemap.xml` through `api/pages.js`.
- Analytics: Google Analytics 4 via `src/lib/analytics.ts`, production-only.
- Styling: mostly inline React style objects plus global CSS in `index.html`. Tailwind CSS is listed in project context, but there is no active Tailwind config in the current repository.

## Folder Structure

- `api/`: Vercel serverless API handlers. Most backend logic is action/query-parameter based.
- `src/`: React app source.
- `src/components/`: shared UI pieces such as navbar, footer, image upload/crop/editor helpers, product/community cards, and rich text helpers.
- `src/lib/`: app contexts and client utilities: auth, API wrapper, router, cart, language/currency, theme, SEO, analytics, affiliate ref tracking.
- `src/pages/`: route-level page components for public, account, admin, checkout, artist, creator, community, journal, legal, and download experiences.
- `scripts/`: seed script plus SQL schema/migration files.
- `public/`: static assets, official branding, icons, social preview image, manifest, and fallback static robots file.
- `dist/`: Vite build output. This project currently has built assets in the repository; expect hashed asset churn after builds.
- `docs/`: project documentation. This file should be the main handoff source going forward.

## Current Architecture

### Frontend

The app is a Vite React SPA rendered from `src/App.tsx`. Providers are nested as:

1. `ThemeProvider`
2. `LangProvider`
3. `AuthProvider`
4. `FavoritesProvider`
5. `CartProvider`
6. `RouterProvider`

Routes are parsed from `window.location.hash` in `src/lib/router.tsx`. Public URLs look like `/#/products`, `/#/journal/my-article`, and `/#/community/post-id`.

Most frontend data access goes through `src/lib/api.ts`, which wraps fetch calls to `/api/*` endpoints and adds `Authorization: Bearer <fluffy_token>` when a token exists.

Page-level SEO uses `useSEO` from `src/lib/seo.tsx`. GA4 page views are sent from `src/App.tsx` on hash route changes.

### Backend

Backend logic is implemented as Vercel serverless functions:

- `api/_lib.js`: shared Supabase service client, JSON helper, auth helpers, theme branding helper.
- `api/auth.js`: login, register, logout, email confirmation, password reset, update password, `/me`.
- `api/products.js`: public product listing/detail plus admin/artist product CRUD.
- `api/orders.js`: checkout order creation, payment/slip handling, admin status updates, order emails, downloads, guest order tokens.
- `api/upload.js`: signed Supabase Storage uploads and R2 signed upload URLs.
- `api/artists.js`: artist profiles, requests, approval/reject/revoke, payouts, artist dashboard data.
- `api/users.js`: profile updates, favorites, affiliate/creator requests, affiliate codes, commissions, payout accounts.
- `api/community.js`: community posts, comments, reactions, follows, tags, external books, highlights, creator profiles, curation.
- `api/pages.js`: CMS pages, legal pages, journal, free downloads, dynamic robots and sitemap.
- `api/categories.js`: category list and admin category CRUD.
- `api/theme.js`: public theme config and admin theme save.
- `api/promptpay.js`: PromptPay QR generation.
- `api/analytics.js`: admin analytics summary.

Most API files use Supabase with the service role key, so API-level authorization checks are critical. Do not assume RLS alone protects server-side operations.

### Deployment Shape

`vercel.json` builds with `vite build --emptyOutDir`, outputs `dist`, rewrites `/robots.txt` and `/sitemap.xml` to `api/pages.js`, preserves `/api/*`, and rewrites other paths to `index.html`.

Important: Vercel Hobby deployments have previously failed because too many serverless functions were added. The repository currently has more top-level `api/*.js` files than the older 12-function warning allowed. Avoid creating new serverless function files unless deployment plan/capacity is confirmed.

## Database Overview

Supabase Postgres is the source of truth. The schema is split across `scripts/schema.sql` and many migration files in `scripts/`.

Important table groups:

- Accounts and roles: `profiles`.
- Products and shop: `products`, `categories`.
- Orders/payments/downloads: `orders`, `order_email_logs`.
- Artists: `artist_requests`, `artist_payouts`, artist fields on `profiles`.
- Affiliates/creators: `affiliate_requests`, `affiliate_codes`, `creator_commissions`, `affiliate_payouts`, affiliate fields on `profiles`.
- Community: `community_posts`, comments/reactions/follows/tags/external book/highlight related tables from migrations.
- Journal/CMS: `journal_articles`, `journal_reactions`, `pages`, `legal_pages`.
- Free downloads: `free_downloads`.
- Theme: `theme`.

RLS is enabled in the base schema for core tables such as `profiles`, `products`, `orders`, and `theme`. Because the Vercel backend uses the service role key, backend routes must enforce roles and ownership carefully with `requireAuth` and explicit checks.

Migrations are manual SQL files. If a feature reports missing columns, check the relevant migration first and run only additive/backward-compatible SQL. Do not drop or overwrite existing content.

## Authentication Flow

Backend auth lives in `api/_lib.js` and `api/auth.js`.

- Registration creates a Supabase auth user and always inserts a customer profile.
- Email confirmation redirects through `/api/auth?action=confirm`.
- Login uses Supabase email/password sign-in, checks email confirmation, reads the matching profile, and returns an access token plus user/profile data.
- The client stores the token in `localStorage` as `fluffy_token` and the user object as `fluffy_user`.
- `/api/auth?action=me` calls `requireAuth`, which verifies the token with `supabase.auth.getUser(token)`.
- After token verification, role/profile data is read from `profiles`.
- Route protection happens in `ProtectedRoute` in `src/App.tsx`.

Current role names are `admin`, `artist`, `creator`, and `customer`. Preserve them.

Important auth details:

- The server-side JWT verification fix is in place: backend auth does not trust manually decoded JWT payloads.
- The frontend still has a hardcoded admin email override in `src/lib/auth.tsx`, `src/components/Navbar.tsx`, and `src/pages/AdminPage.tsx`.
- `refreshUser()` in `src/lib/auth.tsx` currently fetches `/api/auth?action=me` with `cache: 'no-store'`.
- The frontend has a fallback that decodes JWT claims if `/me` fails, but that fallback should not be used for backend permission decisions.

## Payment Flow

Checkout is frontend-driven from cart state and posts an order to `api/orders.js`.

Current payment/order behavior:

- Cart state is stored locally under `fluffy_cart`.
- Thai language forces THB. USD is only available outside Thai mode and only when items support USD pricing.
- Physical shipping is currently THB-oriented: one physical item has a small shipping fee, multiple physical items are free shipping, and digital-only carts have no shipping.
- PromptPay QR data is generated by `api/promptpay.js` using `PROMPTPAY_ID`.
- PayPal/manual payment support is handled in the checkout/order flow rather than through a fully automated PayPal webhook.
- Payment slip uploads go through `api/upload.js`; the `slips` folder intentionally allows unauthenticated upload metadata for guest checkout.
- Admin payment approval uses `api/orders.js?action=pay&id=...`.
- Digital downloads are served through controlled order/download actions and should remain gated by paid order state.
- Guest orders use access tokens so buyers can view order details without logging in.
- Emails are sent through Resend when configured, with logs in `order_email_logs`.

Payment and download logic is security-sensitive. Changes to `api/orders.js`, `src/pages/CheckoutPage.tsx`, or storage/upload permissions should be reviewed carefully.

## Main Features Completed

- Customer registration/login/logout/profile.
- Admin dashboard with products, orders, users, theme, journal, community, artists, affiliates/creators, free downloads, and pages.
- Product catalog with physical and digital product support.
- Cart and checkout.
- PromptPay QR flow and PayPal/manual payment support.
- Order status, payment review, shipping/tracking, email templates, guest order links.
- Digital download gating and download limit management.
- Artist public profiles, artist request/approve/reject/revoke lifecycle, artist dashboard, artist products, payouts.
- Creator/affiliate application and referral/commission flows.
- Community posts, reactions, comments, creator profiles, follows, saved posts, tags, external books, highlights, and curation.
- Fluffy Journal with layout blocks, bilingual fields, rich text support, CTA blocks, reactions, saved articles, and public article pages.
- Free downloads with public listing/detail/download actions.
- CMS/legal pages.
- Theme/branding configuration.
- Bilingual Thai/English UI and content fallback behavior.
- SEO foundation: default metadata, page metadata, canonical URLs, OG/Twitter tags, JSON-LD, robots, sitemap, official favicons/social preview.
- GA4 production-only page-view tracking.
- Maintenance mode handling for non-admin public/shop paths.

## Features In Progress Or Recently Touched

- Fluffy Journal block editor, rich text persistence, CTA styling, cover crop support, and article readability polish.
- Artist lifecycle access sync after approve/revoke/reapprove.
- Auth performance and `/me` refresh timing.
- SEO polish and favicon consistency.
- Frontend performance image loading/CLS improvements.
- Highlight detail UI polish.
- General font-size/readability pass.

When touching these areas, inspect recent code rather than relying on older notes.

## Known Issues And Sharp Edges

- `api/community.js` contains a NUL byte and some tools treat it as binary. Use `rg -a` or repair carefully if editing.
- `src/lib/router.tsx` checks `/checkout` before `/checkout/success`, so the checkout success route appears unreachable in the current parser order.
- `package.json` has `build`, `preview`, and `seed`, but no `dev` script. Older docs still mention `npm run dev`.
- Older `HANDOFF.md`, `README.md`, and `DEPLOY.md` are partially stale. Prefer this document after creation.
- There are many top-level `api/*.js` files. Adding another may trigger Vercel Hobby serverless-function limits.
- `src/lib/auth.tsx` accepts a `refreshUser` options parameter but currently always performs a no-store `/me` request. Revisit before performance-sensitive auth work.
- Hardcoded admin email checks still exist in frontend files. Do not expand this pattern without an intentional role/security decision.
- `api/categories.js` detects admin listing by the presence of an auth header, then calls `getUser`; invalid tokens should be tested when modifying this flow.
- `api/promptpay.js` imports auth helpers but does not require auth. This appears intentional because checkout needs QR generation.
- Journal migrations are fragmented. Missing `journal_articles.content_blocks` or `journal_articles.cover_crop` means the relevant additive migration has not been run in Supabase.
- Some API operations perform multiple writes without database transactions/RPC. Artist approval/revoke and payment/order flows deserve future transactional hardening.

## Important Implementation Details

- Hash routes are canonical in the frontend and SEO canonical URLs currently include the hash path.
- `src/lib/api.ts` is the main client API surface. Add new frontend API calls there when possible.
- `api/_lib.js` sets API responses to `no-store`.
- `api/_lib.js` creates missing profiles on `/me` as customers but does not upsert over existing roles.
- Product visibility: public product lists require `active = true` and `status = 'published'`; admin product lists can see more.
- Product delete is a soft delete via `active: false`.
- Artist-owned products use `artist_id`; for artists the effective artist id can be `profile.artist_id || user.id`.
- Journal layout blocks are the intended source of truth for article body content. Legacy content should be converted/fallback-loaded, not deleted.
- Free download large files can use R2 metadata/keys. R2 signed URL code also appears in order download logic.
- Affiliate/creator ref tracking stores a 30-day last-click ref in `localStorage` under `fluffy_ref`.
- Anonymous community reaction dedupe uses `fluffy_guest_id`.
- Language/currency state uses `fluffy_lang` and `fluffy_currency`.
- Theme config cache uses `fluffy_theme_cache`.
- Uploaded public URLs usually come from Supabase Storage signed upload metadata returned by `api/upload.js`.

## Coding Conventions

- Prefer small, focused changes over broad rewrites.
- Match existing inline style patterns and component structure unless a task explicitly asks for broader UI work.
- Use existing contexts/hooks/utilities before adding new state systems.
- Keep serverless shared behavior in `api/_lib.js`.
- Prefer extending existing API handlers over adding new top-level API files, especially because of Vercel function-count limits.
- Preserve role names and existing permission semantics.
- Use action/type query parameters consistently with existing API style.
- Keep database changes additive and backward-compatible.
- Keep bilingual fields and Thai-to-English fallback behavior intact.
- Avoid changing route paths or URL structure unless explicitly requested.
- Run `npm run build` after code changes. For documentation-only changes, a build is usually unnecessary.

## Deployment Notes

- Vercel build command: `vite build --emptyOutDir`.
- Output directory: `dist`.
- Preview locally with `npm run preview` after building.
- There is currently no `npm run dev` script in `package.json`; add one only if the team wants that behavior.
- `vercel.json` rewrites:
  - `/robots.txt` to `/api/pages?type=robots`
  - `/sitemap.xml` to `/api/pages?type=sitemap`
  - `/api/:path*` to API functions
  - all other paths to `/index.html`
- Do not push or merge deployment changes unless explicitly asked.
- If Vercel build fails with a serverless function limit, consolidate API files rather than adding more functions.

## Environment Variables

Do not expose secret values in documentation, logs, or commits. Expected variables include:

- `SUPABASE_URL`: Supabase project URL for backend service clients.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key for serverless APIs.
- `SUPABASE_ANON_KEY`: Supabase anon key used for password update/session operations.
- `PROMPTPAY_ID`: PromptPay recipient id for QR generation.
- `RESEND_API_KEY`: Resend API key for transactional email.
- `EMAIL_FROM`: From address for order emails.
- `SITE_URL`: Production site origin used in links and auth redirects.
- `ADMIN_EMAIL`: Admin notification email fallback for order emails.
- `R2_ACCOUNT_ID`: Cloudflare R2 account id.
- `R2_BUCKET_NAME`: Cloudflare R2 bucket name.
- `R2_ACCESS_KEY_ID`: Cloudflare R2 access key id.
- `R2_SECRET_ACCESS_KEY`: Cloudflare R2 secret access key.

Frontend GA4 currently uses the hardcoded measurement id in `src/lib/analytics.ts`.

## Manual Testing Checklist

Use this checklist after meaningful changes:

- Desktop: home, shop, product detail, cart, checkout, community, journal, free downloads, admin.
- Mobile: same critical public/admin paths with no horizontal overflow.
- TH language: navigation, product content, journal blocks, checkout totals, legal pages.
- EN language: same flows with English fallbacks and USD behavior where supported.
- Guest: browse, cart, checkout, upload slip, guest order link, community reactions where allowed.
- Logged-in customer: profile, orders, favorites, community posting/commenting, journal saves/reactions.
- Admin: dashboard loads, products CRUD, orders/payment approval, journal save/publish/edit, community moderation, theme save.
- Artist: request artist, admin approve, Artist Studio access, product management, revoke/reapprove.
- Creator/affiliate: apply/approve, referral links, affiliate code validation, commission visibility.
- Payment: PromptPay QR, PayPal/manual path, slip upload, admin mark paid, reject slip.
- Downloads: no paid order means no protected download; paid order can download within limits.
- Storage: cover uploads, community uploads, slip uploads, R2 downloads if configured.
- SEO: page title/meta, favicon, OG fallback image, `/robots.txt`, `/sitemap.xml`.
- Analytics: GA4 loads only in production and not on localhost.
- Existing features unaffected: checkout, auth, admin permissions, artist system, creator system, community posting.

## Future Roadmap

- Consolidate serverless API files or move related handlers behind fewer functions to avoid Vercel Hobby limits.
- Add automated tests for auth, payment/download gating, artist lifecycle, journal save/load, and community moderation.
- Move multi-write operations such as artist approval/revoke and payment status changes into database RPCs or transactions.
- Complete a fresh RLS audit against current schema and API behavior.
- Update `README.md` and `DEPLOY.md` to match the current scripts, env vars, and deployment shape.
- Improve local development scripts and sample environment documentation.
- Continue safe performance work: code splitting, image sizing, and avoiding duplicate auth/profile calls.
- Stabilize Journal editor/content-block architecture as the single source of truth.
- Consider centralizing admin email/role policy fully server-side.

## Files And Modules To Modify Carefully

- `api/_lib.js`: auth verification, service client, shared response behavior.
- `src/lib/auth.tsx`: token/session persistence and route auth state.
- `src/App.tsx`: providers, protected routes, maintenance gating, route switch, analytics page views.
- `src/lib/router.tsx`: hash routing and affiliate ref capture.
- `src/lib/api.ts`: frontend API contract and token headers.
- `api/orders.js`: payment, order status, emails, guest tokens, digital download security.
- `src/pages/CheckoutPage.tsx`: checkout totals, payment flow, order creation.
- `api/upload.js`: upload permissions, public/private storage behavior, R2 signing.
- `api/pages.js`: Journal, free downloads, CMS/legal pages, robots, sitemap.
- `api/community.js`: broad community feature surface and binary/NUL-byte sharp edge.
- `api/artists.js`: artist role/profile/request lifecycle.
- `api/users.js`: profile, favorites, affiliate/creator flow.
- `api/products.js`: public product visibility, artist/admin ownership, digital file metadata.
- `src/pages/AdminPage.tsx`: large admin surface touching many backend features.
- `src/pages/JournalPage.tsx` and `src/pages/JournalArticlePage.tsx`: Journal listing/detail and content block rendering.
- `scripts/*.sql`: schema and migrations. Run additively and verify Supabase schema cache.
- `vercel.json`: routing, SEO endpoints, deployment behavior.
- `public/`: official branding, favicon, social preview, manifest, static fallbacks.

When in doubt, inspect the current implementation first, make the smallest safe change, run the relevant checks, and document the result here.
