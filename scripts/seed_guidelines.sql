-- Seed the editable Guidelines as Legal Pages (Admin → Legal Pages).
-- Guidelines = the short bullet list shown before submitting a request.
-- One bullet per line in `content`. Admins edit / add / remove / reorder lines.
-- Safe to run multiple times: it will NOT overwrite pages you've already edited.

insert into legal_pages (slug, title, content, published)
select 'artist-guidelines', 'Artist Guidelines',
'Original artwork only
Products require admin approval before publishing
Revenue sharing may vary by product or collaboration
Payouts are currently handled manually by Fluffy Pub
Copyright violations are strictly prohibited
Fluffy Pub may suspend artist access if necessary',
 true
where not exists (select 1 from legal_pages where slug = 'artist-guidelines');

insert into legal_pages (slug, title, content, published)
select 'affiliate-guidelines', 'Affiliate Guidelines',
'Share Fluffy Pub organically
No spam or misleading promotions
Commissions are earned only after successful delivery
Affiliate codes apply to Physical Products only
Fluffy Pub may revoke affiliate access if necessary',
 true
where not exists (select 1 from legal_pages where slug = 'affiliate-guidelines');

-- Full agreements (Policy) — linked from Artist Studio / Affiliate Dashboard.
-- Placeholder content; edit the full royalty/commission terms in Admin → Legal Pages.
insert into legal_pages (slug, title, content, published)
select 'artist-agreement', 'Artist Agreement',
'This Artist Agreement explains how royalties, payouts, product approval and content ownership work for artists on Fluffy Pub.

Edit this page in Admin → Legal Pages to add your full terms (royalty rates, payout schedule, content rights, suspension policy, etc.).',
 true
where not exists (select 1 from legal_pages where slug = 'artist-agreement');

insert into legal_pages (slug, title, content, published)
select 'affiliate-agreement', 'Affiliate Agreement',
'This Affiliate Agreement explains how commissions, discount codes, payouts and eligibility work for affiliates on Fluffy Pub.

Edit this page in Admin → Legal Pages to add your full terms (commission amount, payout schedule, physical-only rules, revocation policy, etc.).',
 true
where not exists (select 1 from legal_pages where slug = 'affiliate-agreement');
