// Fluffy Color Lab integration: one endpoint for both resources this
// feature persists, dispatched by `?resource=`, following the same
// shape as api/categories.js — GET is public (site visitors need the
// marker reference data to see matches; the curated-palette list is
// small and non-sensitive), PUT is admin-only (uploading/editing the
// color database, authoring curated palettes). See
// scripts/migrate_color_lab.sql and
// src/color-lab/features/marker-db/repository/SupabaseMarkerRepository.ts.
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

module.exports = async function handler(req, res) {
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
