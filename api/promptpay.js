// /api/promptpay?amount=xxx — generate PromptPay QR code data URI
const { requireAuth, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const { amount } = req.query;
  if (!amount) return json(res, 400, { error: 'amount required' });

  const promptpayId = process.env.PROMPTPAY_ID;
  if (!promptpayId) return json(res, 500, { error: 'PROMPTPAY_ID not configured' });

  try {
    const generatePayload = require('promptpay-qr');
    const QRCode = require('qrcode');

    const payload = generatePayload(promptpayId, { amount: parseFloat(amount) });
    const qrDataUrl = await QRCode.toDataURL(payload, {
      width: 300,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    return json(res, 200, { qrDataUrl, promptpayId, amount: parseFloat(amount) });
  } catch (e) {
    console.error('QR error:', e);
    return json(res, 500, { error: 'Failed to generate QR: ' + e.message });
  }
};
