// /api/upload — handle file uploads to Supabase Storage
const { supabase, requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireAuth(req, res, ['admin', 'artist']);
  if (!user) return;

  const { fileName, fileType, bucket = 'fluffy-pub', folder = 'uploads' } = req.body || {};
  if (!fileName || !fileType) return json(res, 400, { error: 'fileName and fileType required' });

  // Generate a unique path
  const ext = fileName.split('.').pop();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // Create a signed upload URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) return json(res, 400, { error: error.message });

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

  return json(res, 200, {
    uploadUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl,
  });
};
