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
