// /api/upload — handle file uploads to Supabase Storage
const { supabase, getUser, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { fileName, fileType, bucket = 'fluffy-pub', folder = 'uploads' } = req.body || {};
  if (!fileName || !fileType) return json(res, 400, { error: 'fileName and fileType required' });

  // Slip uploads allowed for all (including guests); other folders require auth
  const user = await getUser(req);
  if (folder !== 'slips' && !user) {
    return json(res, 401, { error: 'Not authenticated' });
  }
  if (folder !== 'slips' && !['admin','artist'].includes(user?.role)) {
    return json(res, 403, { error: 'Forbidden' });
  }

  // Generate unique path
  const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${safeName}`;

  try {
    // Try signed upload URL first
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);

    if (signedErr) {
      console.error('Signed URL error:', signedErr.message);
      return json(res, 400, { error: `Storage error: ${signedErr.message}. Ensure bucket '${bucket}' exists and is public.` });
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

    return json(res, 200, {
      uploadUrl: signedData.signedUrl,
      token: signedData.token,
      path,
      publicUrl,
    });
  } catch (e) {
    console.error('Upload handler error:', e.message);
    return json(res, 500, { error: e.message });
  }
};
