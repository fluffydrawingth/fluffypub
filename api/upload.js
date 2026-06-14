// /api/upload — Supabase Storage uploads + Cloudflare R2 presigned URLs
const { supabase, getUser, requireAuth, json } = require('./_lib');
const crypto = require('crypto');

// ── Cloudflare R2 presigned PUT URL ─────────────────────────────────────────

const R2_ALLOWED_TYPES = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png'];
const R2_ALLOWED_EXTS  = ['pdf', 'zip', 'png'];
const R2_MAX_BYTES     = 200 * 1024 * 1024; // 200 MB

async function handleR2Upload(req, res) {
  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const { fileName, fileType, fileSize } = req.body || {};
  if (!fileName || !fileType) return json(res, 400, { error: 'fileName and fileType required' });

  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (!R2_ALLOWED_EXTS.includes(ext))
    return json(res, 400, { error: `File type .${ext} not allowed. Supported: PDF, ZIP, PNG` });
  if (!R2_ALLOWED_TYPES.includes(fileType) && fileType !== 'application/octet-stream')
    return json(res, 400, { error: `MIME type ${fileType} not allowed` });
  if (fileSize && fileSize > R2_MAX_BYTES)
    return json(res, 400, { error: 'File too large (max 200 MB)' });

  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket    = process.env.R2_BUCKET_NAME;
  if (!accountId || !bucket) return json(res, 500, { error: 'R2 env vars not configured' });

  // Lazy-require so the SDK is only loaded for this action
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

  const key = `digital-files/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      ...(fileSize ? { ContentLength: fileSize } : {}),
    });
    // 15-minute window — enough for large files on slow connections
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    return json(res, 200, { uploadUrl, r2Key: key });
  } catch (e) {
    console.error('[r2-upload] Error:', e.message);
    return json(res, 500, { error: e.message });
  }
}

// ── Supabase Storage presigned PUT URL ───────────────────────────────────────

async function handleSupabaseUpload(req, res) {
  const { fileName, fileType, bucket = 'fluffy-pub', folder = 'uploads' } = req.body || {};
  if (!fileName || !fileType) return json(res, 400, { error: 'fileName and fileType required' });

  const user = await getUser(req);
  if (folder !== 'slips' && !user)
    return json(res, 401, { error: 'Not authenticated' });
  if (folder !== 'slips' && !['admin', 'artist'].includes(user?.role))
    return json(res, 403, { error: 'Forbidden' });

  const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${safeName}`;

  try {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (signedErr) {
      console.error('Signed URL error:', signedErr.message);
      return json(res, 400, { error: `Storage error: ${signedErr.message}` });
    }
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    return json(res, 200, { uploadUrl: signedData.signedUrl, token: signedData.token, path, publicUrl });
  } catch (e) {
    console.error('Upload handler error:', e.message);
    return json(res, 500, { error: e.message });
  }
}

// ── Router ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (req.query?.action === 'r2') return handleR2Upload(req, res);
  return handleSupabaseUpload(req, res);
};
