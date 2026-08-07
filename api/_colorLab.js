// Fluffy Color Lab integration: one handler for all resources this
// feature persists, dispatched by `?resource=`, following the same
// shape as api/categories.js — GET is public (site visitors need the
// marker reference data to see matches; the curated-palette list is
// small and non-sensitive), PUT is admin-only (uploading/editing the
// color database, authoring curated palettes). `favorites` is a third,
// differently-shaped resource: real per-customer rows, not a single
// admin-owned blob — see handleFavorites below and
// scripts/migrate_color_lab_favorites.sql. See also
// scripts/migrate_color_lab.sql and
// src/color-lab/features/marker-db/repository/SupabaseMarkerRepository.ts.
//
// Underscore-prefixed (not routed directly by Vercel) because the
// Hobby plan caps deployments at 12 Serverless Functions and this
// project's api/ folder was already at that limit — see api/pages.js's
// `resource` dispatch branch and the `/api/color-lab` rewrite in
// vercel.json, which route requests here without adding a 13th
// function file.
const { supabase, requireAuth, json } = require('./_lib');

const EMPTY_MARKERS = {
  schemaVersion: 1,
  brands: [],
  series: [],
  references: [],
  commercialSets: [],
  userSets: [],
};
const EMPTY_CURATED = [];

function resourceKey(req) {
  return req.query.resource === 'curated' ? 'curated-palettes' : 'markers';
}

function emptyFor(req) {
  return req.query.resource === 'curated' ? EMPTY_CURATED : EMPTY_MARKERS;
}

// Per-customer favorite palettes — a real `color_lab_favorites` table
// (user_id, colors, label, created_at), not the single-admin-owned
// `color_lab_data` blob the two resources above use. Every read/write is
// scoped to `requireAuth(req, res)` (any signed-in role, not just admin)
// and the caller's own `user.id` — never a client-supplied id, so one
// customer can never list or delete another's favorites.
async function handleFavorites(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('color_lab_favorites')
      .select('id, colors, label, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return json(res, 400, { error: error.message });
    const favorites = (data || []).map((row) => ({
      id: row.id,
      colors: row.colors,
      label: row.label ?? undefined,
      createdAt: row.created_at,
    }));
    return json(res, 200, favorites);
  }

  if (req.method === 'POST') {
    const colors = Array.isArray(req.body?.colors) ? req.body.colors : null;
    if (!colors || colors.length === 0) return json(res, 400, { error: 'colors is required' });
    const label = typeof req.body?.label === 'string' ? req.body.label : null;
    const { data, error } = await supabase
      .from('color_lab_favorites')
      .insert({ user_id: user.id, colors, label })
      .select('id, colors, label, created_at')
      .single();
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { id: data.id, colors: data.colors, label: data.label ?? undefined, createdAt: data.created_at });
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) return json(res, 400, { error: 'id is required' });
    const { error } = await supabase.from('color_lab_favorites').delete().eq('id', id).eq('user_id', user.id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { ok: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
}

module.exports = async function handleColorLab(req, res) {
  if (req.query.resource === 'favorites') return handleFavorites(req, res);

  const key = resourceKey(req);

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('color_lab_data').select('data').eq('key', key).single();
    if (error && error.code !== 'PGRST116') return json(res, 400, { error: error.message });
    return json(res, 200, data?.data ?? emptyFor(req));
  }

  if (req.method === 'PUT') {
    const user = await requireAuth(req, res, ['admin']); if (!user) return;
    const body = req.body !== undefined && req.body !== null ? req.body : emptyFor(req);
    const { error } = await supabase
      .from('color_lab_data')
      .upsert({ key, data: body, updated_at: new Date().toISOString() });
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, body);
  }

  return json(res, 405, { error: 'Method not allowed' });
};
