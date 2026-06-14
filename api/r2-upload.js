// /api/r2-upload — generate a presigned PUT URL for direct browser-to-R2 upload
const { requireAuth, json } = require('./_lib');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const ALLOWED_TYPES = ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'image/png'];
const ALLOWED_EXTS  = ['pdf', 'zip', 'png'];
const MAX_SIZE_BYTES = 200 * 1024 * 1024; // 200 MB

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error('R2_ACCOUNT_ID env var not set');
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireAuth(req, res, ['admin']);
  if (!user) return;

  const { fileName, fileType, fileSize } = req.body || {};
  if (!fileName || !fileType) return json(res, 400, { error: 'fileName and fileType required' });

  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTS.includes(ext)) {
    return json(res, 400, { error: `File type .${ext} not allowed. Supported: PDF, ZIP, PNG` });
  }
  if (!ALLOWED_TYPES.includes(fileType) && fileType !== 'application/octet-stream') {
    return json(res, 400, { error: `MIME type ${fileType} not allowed` });
  }
  if (fileSize && fileSize > MAX_SIZE_BYTES) {
    return json(res, 400, { error: 'File too large (max 200 MB)' });
  }

  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return json(res, 500, { error: 'R2_BUCKET_NAME env var not set' });

  // Unique key: digital-files/<random>.<ext>
  const key = `digital-files/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

  try {
    const client = r2Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize || undefined,
    });
    // URL expires in 15 minutes — enough time for large file upload
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    return json(res, 200, { uploadUrl, r2Key: key });
  } catch (e) {
    console.error('[r2-upload] Error:', e.message);
    return json(res, 500, { error: e.message });
  }
};
