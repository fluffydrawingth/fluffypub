// /api/orders
const { supabase, requireAuth, getUser, json, getThemeBranding } = require('./_lib');
const crypto = require('crypto');

const SITE = process.env.SITE_URL || 'https://fluffypub.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'fluffydrawing.th@gmail.com';

// ── Email helpers ────────────────────────────────────────────────────────────

async function emailWrapper(bodyHtml) {
  const brand = await getThemeBranding();
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#fdf2f8;font-family:'Nunito',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;padding:32px 16px">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(244,114,182,0.12)">
  <tr><td style="background:linear-gradient(135deg,#fce7f3,#fdf4ff);padding:28px 32px;text-align:center;border-bottom:2px solid #f9a8d4">
    <div style="font-size:28px;margin-bottom:6px">🐰</div>
    <div style="font-size:22px;font-weight:900;color:${brand.primaryColor};letter-spacing:-0.5px">${brand.logoText}</div>
    <div style="font-size:12px;color:#c084fc;font-weight:600;margin-top:2px">adorable coloring books 🌸</div>
  </td></tr>
  <tr><td style="padding:28px 32px">${bodyHtml}</td></tr>
  <tr><td style="background:#fafafa;padding:16px 32px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="margin:0;font-size:11px;color:#9ca3af">${brand.logoText} · <a href="${SITE}" style="color:${brand.primaryColor};text-decoration:none">${SITE}</a></p>
    <p style="margin:4px 0 0;font-size:11px;color:#d1d5db">© ${new Date().getFullYear()} ${brand.logoText}. All rights reserved.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function fmtOrderAmount(value, isUSD) {
  if (isUSD) return `$${Number(value || 0).toFixed(2)}`;
  return `฿${Number(value || 0).toLocaleString('th-TH')}`;
}

function orderItemsHtml(items, isUSD) {
  return (items || []).map(i => {
    const isDigital = (i.optionType || i.type) === 'digital';
    const qty = i.qty || 1;
    let lineAmt;
    if (isUSD) {
      lineAmt = fmtOrderAmount((i.unitPriceUSD ?? 0) * qty, true);
    } else {
      const price = i.unitPriceTHB || i.price_thb || 0;
      lineAmt = fmtOrderAmount(i.lineTotalTHB || price * qty, false);
    }
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 0;font-size:13px">
        <div style="font-weight:700;color:#111827">${i.title || ''}</div>
        ${i.optionName ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">📌 ${i.optionName}</div>` : ''}
        <div style="font-size:11px;color:${isDigital?'#1d4ed8':'#065f46'};font-weight:600;margin-top:3px">${isDigital?'⬇️ Digital':'📦 Physical'} · Qty: ${qty}</div>
      </td>
      <td style="padding:10px 0;text-align:right;font-weight:800;color:#111827;font-size:13px">${lineAmt}</td>
    </tr>`;
  }).join('');
}

function orderSummaryHtml(order) {
  const isUSD = order.currency === 'USD';
  const total = isUSD ? order.total_usd : (order.total_thb || order.total_amount || 0);
  const shipping = isUSD ? 0 : (order.shipping_thb || 0);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">
      ${orderItemsHtml(order.items, isUSD)}
    </table>
    ${shipping > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:4px"><span>Shipping</span><span>${fmtOrderAmount(shipping, false)}</span></div>` : ''}
    <div style="border-top:2px solid #f3f4f6;padding-top:10px;display:flex;justify-content:space-between;font-weight:900;font-size:16px;color:#111827">
      <span>Total</span><span style="color:#f472b6">${fmtOrderAmount(total, isUSD)}</span>
    </div>`;
}

// ── Link helper ───────────────────────────────────────────────────────────────
// Only expose the public guest-order token link for true guest orders.
// Registered-user orders must be viewed after login at /account/orders.
function orderLink(order) {
  return (!order.user_id && order.access_token)
    ? `${SITE}/#/guest-order/${order.access_token}`
    : `${SITE}/#/account/orders`;
}

// ── Masking helpers (for public token-based responses) ────────────────────────
function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email[0] + '***';
  return local.slice(0, 1) + '***@' + domain;
}
function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length > 4 ? '*'.repeat(digits.length - 4) + digits.slice(-4) : '****';
}

// Templates ─────────────────────────────────────────────────────────────────

async function tplOrderCreated(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  const link = orderLink(order);
  const isPayPal = order.payment_method === 'paypal';

  if (isPayPal) {
    const totalUSD = order.total_usd;
    const usdDisplay = totalUSD != null ? `$${Number(totalUSD).toFixed(2)} USD` : '(see order page for amount)';
    // English-only email for international PayPal customers
    return await emailWrapper(`
      <h2 style="margin:0 0 6px;color:#111827;font-size:20px">🎉 Thank you for your order!</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:13px">We've received your order and it's waiting for payment confirmation.</p>
      <div style="background:#fdf2f8;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #f9a8d4">
        <div style="font-size:12px;color:#9ca3af;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">ORDER NUMBER</div>
        <div style="font-size:22px;font-weight:900;color:#f472b6">#${ref}</div>
        ${totalUSD != null ? `<div style="font-size:16px;font-weight:700;color:#0070ba;margin-top:4px">${usdDisplay}</div>` : ''}
      </div>
      <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Your Items</h3>
      ${orderSummaryHtml(order)}
      <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-top:20px;border:1px solid #bfdbfe">
        <div style="font-weight:700;color:#1e40af;font-size:14px;margin-bottom:8px">🅿️ How to Pay via PayPal</div>
        <ol style="margin:0;padding-left:20px;color:#1e3a8a;font-size:13px;line-height:1.8">
          <li>Open your order page using the button below</li>
          <li>Click the <strong>"Pay with PayPal →"</strong> button on the page</li>
          <li>Complete your payment of <strong>${usdDisplay}</strong> on PayPal</li>
          <li>Screenshot your PayPal payment confirmation</li>
          <li>Return to the order page and upload the screenshot as proof of payment</li>
          <li>We'll confirm your payment within 24 hours 🌸</li>
        </ol>
        <a href="${link}" style="display:inline-block;margin-top:12px;background:#0070ba;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">🅿️ View My Order & Pay with PayPal →</a>
      </div>
      <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-top:16px;border:1px solid #bbf7d0;text-align:center">
        <div style="font-size:12px;color:#9ca3af;font-weight:700;margin-bottom:6px">⬇️ Your Digital Download</div>
        <p style="margin:0 0 12px;font-size:12px;color:#374151">Once your payment is confirmed, your download link will be sent to this email address automatically.</p>
        <a href="${link}" style="display:inline-block;background:#16a34a;color:white;text-decoration:none;padding:10px 24px;border-radius:20px;font-weight:700;font-size:13px">🔍 Track My Order →</a>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">Questions? Reply to this email and we'll be happy to help. 💕</p>
    `);
  }

  // Thai/English bilingual email for PromptPay customers
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">🎉 ขอบคุณสำหรับการสั่งซื้อ!</h2>
    <p style="margin:0 0 20px;color:#6b7280;font-size:13px">Thank you for your order! We've received it and are waiting for payment.</p>
    <div style="background:#fdf2f8;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #f9a8d4">
      <div style="font-size:12px;color:#9ca3af;font-weight:700;letter-spacing:0.5px;margin-bottom:4px">ORDER NUMBER</div>
      <div style="font-size:22px;font-weight:900;color:#f472b6">#${ref}</div>
    </div>
    <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">รายการสินค้า / Items</h3>
    ${orderSummaryHtml(order)}
    <div style="background:#fef3c7;border-radius:12px;padding:16px;margin-top:20px;border:1px solid #fcd34d">
      <div style="font-weight:700;color:#92400e;font-size:14px;margin-bottom:8px">💳 วิธีชำระเงิน / Payment Instructions</div>
      <ol style="margin:0;padding-left:20px;color:#78350f;font-size:13px;line-height:1.8">
        <li>โอนเงินผ่าน PromptPay ตามยอดที่ระบุ</li>
        <li>ถ่ายรูปสลิปการโอนเงิน</li>
        <li>อัปโหลดสลิปในหน้าคำสั่งซื้อ</li>
      </ol>
      <a href="${link}" style="display:inline-block;margin-top:12px;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">📱 ดูคำสั่งซื้อ / View Order →</a>
    </div>
    <div style="background:#fdf2f8;border-radius:12px;padding:14px 16px;margin-top:16px;border:1px solid #f9a8d4;text-align:center">
      <div style="font-size:12px;color:#9ca3af;font-weight:700;margin-bottom:6px">🔗 ติดตามคำสั่งซื้อ / Track Your Order</div>
      <p style="margin:0 0 12px;font-size:12px;color:#374151">บันทึกลิงก์นี้ไว้เพื่อดูสถานะออเดอร์ / Click the button to view your order.</p>
      <a href="${link}" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:10px 24px;border-radius:20px;font-weight:700;font-size:13px">🔍 ดูสถานะออเดอร์ / Track Order →</a>
    </div>
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">หลังจากยืนยันการชำระเงิน ทีมงานจะดำเนินการต่อภายใน 24 ชม. 🌸</p>
  `);
}

async function tplAdminNewOrder(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const isUSD = order.currency === 'USD';
  const total = isUSD ? order.total_usd : (order.total_thb || order.total_amount || 0);
  const totalDisplay = fmtOrderAmount(total, isUSD);
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:18px">🛍️ New Order Received</h2>
    <div style="background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:14px 0;border:1px solid #86efac">
      <div style="font-weight:700;color:#065f46;font-size:14px">#${ref} · ${totalDisplay}</div>
      <div style="font-size:12px;color:#374151;margin-top:4px">👤 ${order.customer_name} · ${order.customer_email}</div>
      ${order.customer_phone ? `<div style="font-size:12px;color:#374151">📞 ${order.customer_phone}</div>` : ''}
    </div>
    ${orderSummaryHtml(order)}
    <a href="${SITE}/admin" style="display:inline-block;margin-top:16px;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">⚙️ View in Admin →</a>
  `);
}

async function tplPaymentReminder(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const total = order.total_thb || order.total_amount || 0;
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">⏰ แจ้งเตือนการชำระเงิน</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">คำสั่งซื้อของคุณยังรอการชำระเงินอยู่ / Your order is still awaiting payment.</p>
    <div style="background:#fef3c7;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #fcd34d">
      <div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px">คำสั่งซื้อ / ORDER</div>
      <div style="font-size:22px;font-weight:900;color:#d97706">#${ref}</div>
      <div style="font-size:18px;font-weight:800;color:#92400e;margin-top:4px">฿${Number(total).toLocaleString('th-TH')}</div>
    </div>
    <p style="font-size:13px;color:#374151;margin:0 0 12px">กรุณาชำระเงินเพื่อยืนยันคำสั่งซื้อของคุณ / Please complete payment to confirm your order.</p>
    <a href="${orderLink(order)}" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:12px 24px;border-radius:20px;font-weight:700;font-size:14px">💳 ชำระเงินตอนนี้ / Pay Now →</a>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">หากต้องการยกเลิก กรุณาติดต่อเรา / To cancel, please contact us. 🌸</p>
  `);
}

async function tplPaymentConfirmed(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const link = orderLink(order);
  const isDigitalOnly = (order.items || []).length > 0 && (order.items || []).every(i => (i.optionType || i.type) === 'digital');
  const isUSD = order.currency === 'USD';

  // English-only email for USD orders
  if (isUSD) {
    return await emailWrapper(`
      <h2 style="margin:0 0 6px;color:#111827;font-size:20px">✅ Payment Confirmed!</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:13px">${isDigitalOnly ? 'Your digital files are ready on your order page. 🎉' : "We're preparing your order. 🌸"}</p>
      <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #86efac">
        <div style="font-size:12px;color:#065f46;font-weight:700;margin-bottom:4px">ORDER</div>
        <div style="font-size:22px;font-weight:900;color:#059669">#${ref}</div>
        <div style="font-size:12px;color:#374151;margin-top:6px">${isDigitalOnly ? '⬇️ Ready to download on your order page' : '🎁 Preparing your items...'}</div>
      </div>
      <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">Items</h3>
      ${orderSummaryHtml(order)}
      ${isDigitalOnly ? `<div style="background:#eff6ff;border-radius:12px;padding:12px 16px;margin-top:16px;border:1.5px solid #93c5fd;font-size:13px;color:#1e40af">⬇️ Your digital files are ready on your order page.</div>` : ''}
      <a href="${link}" style="display:inline-block;margin-top:16px;background:#059669;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">${isDigitalOnly ? '⬇️ View Order →' : '📦 Track Order →'}</a>
      ${!isDigitalOnly ? '<p style="margin:16px 0 0;font-size:12px;color:#9ca3af">Your order will be shipped within 1-3 business days. 🌸</p>' : ''}
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af">Questions? Reply to this email and we'll be happy to help. 💕</p>
    `);
  }

  // Thai/English bilingual email for THB orders
  const hasDigital = (order.items || []).some(i => (i.optionType || i.type) === 'digital');
  const digitalNote = hasDigital
    ? `<div style="background:#eff6ff;border-radius:12px;padding:12px 16px;margin-top:16px;border:1.5px solid #93c5fd;font-size:13px;color:#1e40af">⬇️ ไฟล์ดิจิทัลพร้อมในหน้าคำสั่งซื้อแล้ว / Your digital files are ready on your order page.</div>`
    : '';
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">✅ ยืนยันการชำระเงินแล้ว!</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">Payment confirmed! ${isDigitalOnly ? 'Your digital files are ready on your order page. 🎉' : 'We\'re preparing your order. 🌸'}</p>
    <div style="background:#f0fdf4;border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1.5px solid #86efac">
      <div style="font-size:12px;color:#065f46;font-weight:700;margin-bottom:4px">คำสั่งซื้อ / ORDER</div>
      <div style="font-size:22px;font-weight:900;color:#059669">#${ref}</div>
      <div style="font-size:12px;color:#374151;margin-top:6px">${isDigitalOnly ? '⬇️ พร้อมดาวน์โหลดในหน้าคำสั่งซื้อ' : '🎁 กำลังเตรียมสินค้า / Preparing your items...'}</div>
    </div>
    <h3 style="margin:0 0 10px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px">รายการสินค้า / Items</h3>
    ${orderSummaryHtml(order)}
    ${digitalNote}
    <a href="${link}" style="display:inline-block;margin-top:16px;background:#059669;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">${isDigitalOnly ? '⬇️ ดูคำสั่งซื้อ / View Order →' : '📦 ติดตามคำสั่งซื้อ / Track Order →'}</a>
    ${!isDigitalOnly ? '<p style="margin:16px 0 0;font-size:12px;color:#9ca3af">ทีมงานจะดำเนินการจัดส่งภายใน 1-3 วันทำการ 🌸</p>' : ''}
  `);
}

async function tplAdminPaymentConfirmed(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const isUSD = order.currency === 'USD';
  const total = isUSD ? order.total_usd : (order.total_thb || order.total_amount || 0);
  const totalDisplay = fmtOrderAmount(total, isUSD);
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:18px">💰 Payment Received</h2>
    <div style="background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:14px 0;border:1px solid #86efac">
      <div style="font-weight:700;color:#065f46;font-size:14px">#${ref} · ${totalDisplay}</div>
      <div style="font-size:12px;color:#374151;margin-top:4px">👤 ${order.customer_name} · ${order.customer_email}</div>
    </div>
    <p style="font-size:13px;color:#374151">Payment confirmed. Order is ready for fulfillment.</p>
    <a href="${SITE}/admin" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">⚙️ Fulfill Order →</a>
  `);
}

async function tplTrackingAdded(order) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const tracking = order.tracking_number || '—';
  const provider = order.shipping_provider || 'Thailand Post';
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">🚚 สินค้าถูกจัดส่งแล้ว!</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">Your order has been shipped! 📦</p>
    <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:20px;border:1.5px solid #93c5fd">
      <div style="font-size:12px;color:#1e40af;font-weight:700;margin-bottom:8px">TRACKING NUMBER</div>
      <div style="font-size:24px;font-weight:900;color:#1d4ed8;letter-spacing:1px">${tracking}</div>
      <div style="font-size:13px;color:#374151;margin-top:6px">🚚 ${provider}</div>
    </div>
    <div style="font-size:13px;color:#374151;margin-bottom:16px">
      <strong>คำสั่งซื้อ / Order #${ref}</strong>
    </div>
    <a href="${orderLink(order)}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">📦 ติดตามพัสดุ / Track Package →</a>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af">กรุณารอรับพัสดุภายใน 3-7 วันทำการ 🌸</p>
  `);
}

async function tplSlipRejected(order, reason, note) {
  const ref = (order.id || '').slice(-8).toUpperCase();
  const link = orderLink(order);
  return await emailWrapper(`
    <h2 style="margin:0 0 6px;color:#111827;font-size:20px">⚠️ Payment Proof Requires Attention</h2>
    <p style="margin:0 0 16px;color:#6b7280;font-size:13px">We could not verify your payment slip. Please upload a new one.</p>
    <div style="background:#fef3c7;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1.5px solid #fcd34d">
      <div style="font-size:12px;color:#92400e;font-weight:700;margin-bottom:4px">คำสั่งซื้อ / ORDER</div>
      <div style="font-size:22px;font-weight:900;color:#d97706">#${ref}</div>
    </div>
    <div style="background:#fee2e2;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1.5px solid #fca5a5">
      <div style="font-size:12px;color:#7f1d1d;font-weight:700;margin-bottom:6px">❌ Reason / เหตุผล</div>
      <div style="font-size:14px;font-weight:700;color:#dc2626">${reason}</div>
      ${note ? `<div style="font-size:13px;color:#374151;margin-top:6px">${note}</div>` : ''}
    </div>
    <p style="font-size:13px;color:#374151;margin:0 0 16px">กรุณาอัปโหลดสลิปการโอนเงินใหม่อีกครั้ง / Please upload a new payment slip.</p>
    <a href="${link}" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:12px 24px;border-radius:20px;font-weight:700;font-size:14px">💳 Upload New Slip →</a>
    <p style="margin:16px 0 0;font-size:11px;color:#9ca3af">หากมีคำถาม กรุณาติดต่อเรา / If you have questions, please contact us. 🌸</p>
  `);
}

// Core send + log ─────────────────────────────────────────────────────────────

async function sendEmail(to, subject, html, opts = {}) {
  const { orderId, eventType } = opts;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM = process.env.EMAIL_FROM || 'noreply@fluffypub.vercel.app';

  // Check duplicate: if orderId + eventType already sent successfully, skip
  if (orderId && eventType) {
    try {
      const { data: existing } = await supabase
        .from('order_email_logs')
        .select('id')
        .eq('order_id', orderId)
        .eq('event_type', eventType)
        .eq('recipient_email', to)
        .eq('status', 'sent')
        .limit(1);
      if (existing && existing.length > 0) {
        console.log(`[EMAIL] Duplicate skip: ${eventType} for order ${orderId}`);
        return { skipped: true };
      }
    } catch (e) { /* table may not exist yet — proceed */ }
  }

  let status = 'sent';
  let errorMsg = null;

  if (!RESEND_KEY) {
    console.log('[EMAIL] No RESEND_API_KEY. Would send to:', to, 'Subject:', subject);
    status = 'dev_skip';
  } else {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_KEY}` },
        body: JSON.stringify({ from: `Fluffy Pub <${FROM}>`, to, subject, html }),
      });
      if (!resp.ok) {
        const body = await resp.text();
        status = 'error';
        errorMsg = `HTTP ${resp.status}: ${body}`;
        console.error('[EMAIL] Resend error:', errorMsg);
      }
    } catch(e) {
      status = 'error';
      errorMsg = e.message;
      console.error('[EMAIL] Send failed:', e.message);
    }
  }

  // Log
  if (orderId && eventType) {
    try {
      await supabase.from('order_email_logs').insert({
        order_id: orderId,
        event_type: eventType,
        recipient_email: to,
        subject,
        status,
        error: errorMsg,
      });
    } catch (e) { console.warn('[EMAIL] Log failed (table may not exist):', e.message); }
  }

  return { status, error: errorMsg };
}


// Adjust variant stock for an order's items
async function adjustStock(items, delta) {
  if (!items?.length) return;
  for (const item of items) {
    if (!item.productId || !item.optionId || item.optionType !== 'physical') continue;
    const { data: prod } = await supabase.from('products').select('variants').eq('id', item.productId).single();
    if (!prod?.variants) continue;
    const variants = prod.variants.map(v => {
      if (v.id !== item.optionId) return v;
      const currentStock = v.stock_quantity !== undefined ? Number(v.stock_quantity) : (v.stock !== undefined ? Number(v.stock) : null);
      if (currentStock === null) return v; // unlimited
      const newStock = Math.max(0, currentStock + (delta * (item.qty || 1)));
      return { ...v, stock_quantity: newStock, stock: newStock };
    });
    await supabase.from('products').update({ variants }).eq('id', item.productId);
  }
}

module.exports = async function handler(req, res) {
  const { action, id } = req.query;

  // GET my orders
  if (req.method === 'GET' && action === 'my') {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const safe = (data || []).map(o => {
      const unlocked = o.payment_status === 'paid' || o.status === 'delivered';
      return {
        ...o,
        items: (o.items || []).map(i => ({
          ...i,
          digital_download_url: unlocked ? i.digital_download_url : null,
          download_instruction: unlocked ? i.download_instruction : null,
        }))
      };
    });
    return json(res, 200, safe);
  }

  // GET single order by ref
  if (req.method === 'GET' && action === 'ref' && id) {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
    if (error || !data) return json(res, 404, { error: 'Order not found' });
    // Shipping: 25 THB for 1 physical book, free for 2+
    const physicalCount = orderItems.filter(i => i.type === 'physical' || i.type === 'both').length;
    const shipping_thb = physicalCount === 1 ? 25 : 0;
    const grand_total_thb = final_thb + shipping_thb;
    const authUser = await getUser(req);
    // Allow if owner or admin
    if (data.user_id && authUser?.id !== data.user_id && authUser?.role !== 'admin') {
      // Allow by guest email match
      if (authUser?.email !== data.customer_email && data.guest_email !== authUser?.email) {
        return json(res, 403, { error: 'Forbidden' });
      }
    }
    return json(res, 200, data);
  }

  // GET artist orders
  // GET order by access token — no auth required (guest order page)
  if (req.method === 'GET' && action === 'by-token' && id) {
    const { data, error } = await supabase.from('orders').select('*').eq('access_token', id).single();
    if (error || !data) return json(res, 404, { error: 'Order not found or link has expired' });
    // Strip access_token so token never leaks back to client JS
    const { access_token: _tok, ...safeOrder } = data;
    // Mask sensitive PII — this endpoint is publicly accessible via token link
    safeOrder.customer_email = maskEmail(safeOrder.customer_email);
    safeOrder.customer_phone = maskPhone(safeOrder.customer_phone);
    // Only expose download links if paid or delivered
    const unlocked = safeOrder.payment_status === 'paid' || safeOrder.status === 'delivered';
    if (!unlocked) {
      safeOrder.items = (safeOrder.items || []).map(i => ({ ...i, digital_download_url: null, download_instruction: null }));
    }
    return json(res, 200, safeOrder);
  }

  // POST resend order access link — no auth required
  if (req.method === 'POST' && action === 'resend-link') {
    const { email, orderRef } = req.body || {};
    if (!email || !orderRef) return json(res, 400, { error: 'email and orderRef required' });
    const ref = orderRef.replace(/^#/, '').toUpperCase();
    // Find orders by email, then match the 8-char ref
    const { data: rows } = await supabase.from('orders').select('id,access_token,customer_email,total_thb,total_amount,status,created_at').eq('customer_email', email);
    const order = (rows || []).find(o => (o.id || '').slice(-8).toUpperCase() === ref);
    if (!order || !order.access_token) {
      // Return generic success to avoid leaking which emails exist
      return json(res, 200, { ok: true });
    }
    const orderLink = `${SITE}/#/guest-order/${order.access_token}`;
    const orderRefFmt = '#' + (order.id || '').slice(-8).toUpperCase();
    await sendEmail(email, `🔗 ลิงก์ติดตามคำสั่งซื้อ ${orderRefFmt} — Fluffy Pub`,
      await emailWrapper(`
        <h2 style="margin:0 0 6px;color:#111827;font-size:20px">🔗 ลิงก์ติดตามคำสั่งซื้อของคุณ</h2>
        <p style="margin:0 0 16px;color:#6b7280;font-size:13px">Here is your order access link / นี่คือลิงก์สำหรับดูคำสั่งซื้อของคุณ</p>
        <div style="background:#fdf2f8;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1.5px solid #f9a8d4">
          <div style="font-size:12px;color:#9ca3af;font-weight:700;margin-bottom:4px">ORDER</div>
          <div style="font-size:22px;font-weight:900;color:#f472b6">${orderRefFmt}</div>
        </div>
        <a href="${orderLink}" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:12px 24px;border-radius:20px;font-weight:700;font-size:14px;margin-bottom:16px">📱 ดูคำสั่งซื้อ / View Order →</a>
        <p style="margin:0;font-size:11px;color:#9ca3af;word-break:break-all">${orderLink}</p>
        <p style="margin:16px 0 0;font-size:11px;color:#d1d5db">หากคุณไม่ได้ขอลิงก์นี้ กรุณาเพิกเฉย / If you did not request this, please ignore. 🌸</p>
      `),
      { orderId: order.id, eventType: 'access_link_resent' }
    );
    return json(res, 200, { ok: true });
  }

  // GET /api/orders?action=admin-artist&artist_id=X — admin fetches orders for a specific artist
  // Used for auto-calculating payout earnings in the admin payout tab.
  if (req.method === 'GET' && action === 'admin-artist') {
    const admin = await requireAuth(req, res, ['admin']);
    if (!admin) return;
    const artistId = req.query.artist_id;
    if (!artistId) return json(res, 400, { error: 'artist_id required' });
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const filtered = (data || [])
      .filter(o => (o.items||[]).some(i => i.artistId === artistId))
      .map(o => ({ ...o, items: (o.items||[]).filter(i => i.artistId === artistId) }));
    return json(res, 200, filtered);
  }

  if (req.method === 'GET' && action === 'artist') {
    const user = await requireAuth(req, res, ['artist']);
    if (!user) return;
    const effectiveArtistId = user.artist_id || user.id;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    const filtered = (data || []).filter(o => (o.items||[]).some(i => i.artistId === effectiveArtistId))
      .map(o => ({ ...o, items: (o.items||[]).filter(i => i.artistId === effectiveArtistId) }));
    return json(res, 200, filtered);
  }

  // GET ?action=affiliate-validate&code=XXX — check an affiliate code at checkout.
  // Physical-only / min-subtotal / once-per-customer are enforced authoritatively at
  // order creation; this just confirms the code exists & is active and returns its terms.
  if (req.method === 'GET' && action === 'affiliate-validate') {
    const code = (req.query.code || '').toUpperCase().trim();
    if (!code) return json(res, 400, { error: 'code required' });
    const { data: row } = await supabase.from('affiliate_codes').select('*').eq('code', code).eq('active', true).single();
    if (!row) return json(res, 404, { error: 'Invalid or inactive affiliate code.' });
    // Don't let an affiliate use their own code
    const authUser = await getUser(req);
    if (authUser && authUser.id === row.user_id) return json(res, 400, { error: 'You cannot use your own affiliate code.' });
    return json(res, 200, { code: row.code, discount_amount: Number(row.discount_amount || 0), affiliate_commission: Number(row.affiliate_commission || 0), min_subtotal_thb: 200 });
  }

  // GET all (admin)
  if (req.method === 'GET' && !action) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) return json(res, 500, { error: error.message });
    return json(res, 200, data);
  }

  // POST create order
  if (req.method === 'POST' && !action) {
    const { items, customerName, customerEmail, customerPhone, shippingAddress, promoCode, affiliateCode, refCreatorId, total_thb, total_usd, shipping_thb: shippingFromCart, subtotal_thb, subtotal_usd, payment_method, currency: reqCurrency } = req.body || {};
    if (!items?.length || !customerName || !customerEmail) return json(res, 400, { error: 'items, name, email required' });

    // Validate products exist and get image/artist data only (do NOT override prices or types)
    const ids = [...new Set(items.map(i => i.productId))];
    const { data: products } = await supabase
      .from('products')
      .select('id,title,image,artist_id,artist_name,digital_download_url,download_instruction')
      .in('id', ids);
    const productMap = Object.fromEntries((products || []).map(p => [p.id, p]));

    // Build order items from CART SNAPSHOT — preserve exact optionType, optionName, price, qty
    const orderItems = items.map(cartItem => {
      const prod = productMap[cartItem.productId] || {};
      const qty = cartItem.qty || 1;
      const unitPriceTHB = cartItem.unitPriceTHB || 0;
      return {
        productId: cartItem.productId,
        title: prod.title || cartItem.title || '',
        image: prod.image || '📚',
        artistId: prod.artist_id || null,
        artistName: prod.artist_name || '',
        // SNAPSHOT — these come from cart, never recalculated
        optionId: cartItem.optionId || '',
        optionName: cartItem.optionName || '',
        optionType: cartItem.optionType || 'digital',  // NEVER default - must come from cart
        unitPriceTHB,
        unitPriceUSD: cartItem.unitPriceUSD ?? null,
        qty,
        lineTotalTHB: unitPriceTHB * qty,
        // Digital download links (unlocked after payment)
        digital_download_url: null,
        download_instruction: null,
      };
    });

    // Use totals from cart (already calculated correctly on frontend)
    const shipping_thb = shippingFromCart || 0;
    const grand_total_thb = total_thb || (subtotal_thb + shipping_thb);
    const hasPhysical = orderItems.some(i => i.optionType === 'physical');
    // Shipping based on physical qty from cart (already calculated correctly)
    const physicalQtyFromCart = orderItems.filter(i => i.optionType === 'physical').reduce((s, i) => s + i.qty, 0);

    const authUser = await getUser(req);

    // ── Affiliate code (physical-only, THB-only, flat discount, validated server-side) ──
    let affiliate = null;        // { code, user_id, discount_thb, commission_thb }
    if (affiliateCode && reqCurrency !== 'USD') {
      const code = String(affiliateCode).toUpperCase().trim();
      const physicalSubtotalTHB = orderItems
        .filter(i => i.optionType === 'physical')
        .reduce((s, i) => s + (i.lineTotalTHB || 0), 0);
      const { data: codeRow } = await supabase.from('affiliate_codes').select('*').eq('code', code).eq('active', true).single();
      if (!codeRow) return json(res, 400, { error: 'Invalid or inactive affiliate code.' });
      if (!hasPhysical) return json(res, 400, { error: 'Affiliate codes apply to physical products only.' });
      if (physicalSubtotalTHB < 200) return json(res, 400, { error: 'Affiliate code requires at least ฿200 of physical products.' });
      if (authUser && authUser.id === codeRow.user_id) return json(res, 400, { error: 'You cannot use your own affiliate code.' });
      // Codes are REUSABLE: any account/email may use a code on as many orders as they
      // like, with no lifetime limit — as long as the code is still active. The only
      // off-switch is the admin deactivating/deleting the code (the .eq('active', true)
      // check above). One affiliate code per order is still enforced (single field).
      const discount = Math.min(Number(codeRow.discount_amount || 0), physicalSubtotalTHB);
      affiliate = { code, user_id: codeRow.user_id, discount_thb: discount, commission_thb: Number(codeRow.affiliate_commission || 0) };
    }

    // ── Fluffy Creator referral (?ref=<creatorId>) — commission only, NO discount ──
    // Applies only when NO affiliate code was used, the order has physical items, it's a
    // THB order, the buyer isn't the creator, and the creator is an enabled Fluffy Creator.
    // Commission attributes to the creator via the same affiliate_user_id field, so it
    // flows into the existing commission/payout system automatically.
    if (!affiliate && refCreatorId && hasPhysical && reqCurrency !== 'USD' && (!authUser || authUser.id !== refCreatorId)) {
      const { data: creator } = await supabase.from('profiles').select('id,affiliate_enabled').eq('id', refCreatorId).single();
      if (creator && creator.affiliate_enabled) {
        const { data: codes } = await supabase.from('affiliate_codes').select('affiliate_commission').eq('user_id', refCreatorId).eq('active', true).limit(1);
        const commission = (codes && codes.length) ? Number(codes[0].affiliate_commission || 0) : 20;
        affiliate = { code: null, user_id: refCreatorId, discount_thb: 0, commission_thb: commission };
      }
    }

    // Affiliate discount reduces the THB grand total (server is authoritative).
    const affiliateDiscount = affiliate ? affiliate.discount_thb : 0;
    const final_total_thb = Math.max(0, grand_total_thb - affiliateDiscount);

    const accessToken = crypto.randomBytes(32).toString('hex');
    const { data: order, error } = await supabase.from('orders').insert({
      user_id: authUser?.id || null,
      guest_email: authUser ? null : customerEmail,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      shipping_address: shippingAddress || null,
      items: orderItems,
      // Required NOT NULL columns (original schema)
      subtotal: subtotal_thb || grand_total_thb,
      total: final_total_thb,
      discount: affiliateDiscount,
      // THB columns (added via migration)
      subtotal_thb: subtotal_thb || 0,
      shipping_thb: shipping_thb,
      total_thb: final_total_thb,
      total_amount: final_total_thb,
      total_usd: total_usd || null,
      subtotal_usd: subtotal_usd || null,
      currency: reqCurrency === 'USD' ? 'USD' : 'THB',
      promo_code: promoCode || null,
      // Affiliate attribution + commission snapshot (commission counts only at delivery)
      affiliate_code: affiliate ? affiliate.code : null,
      affiliate_user_id: affiliate ? affiliate.user_id : null,
      affiliate_discount_thb: affiliateDiscount,
      affiliate_commission_thb: affiliate ? affiliate.commission_thb : 0,
      status: 'pending_payment',
      payment_status: 'pending',
      type: hasPhysical ? 'physical' : 'digital',
      payment_method: payment_method || 'promptpay',
      access_token: accessToken,
    }).select().single();
    if (error) {
      console.error('[orders POST] INSERT ERROR:', error.code, error.message, error.details, error.hint);
      return json(res, 400, { error: error.message, code: error.code, hint: error.hint });
    }
    // ── Digital creator commission ledger (separate from physical code/commission) ──
    // Never blocks checkout: if the v8 schema isn't applied, this is skipped silently.
    try {
      if (refCreatorId && (!authUser || authUser.id !== refCreatorId)) {
        const { data: creator } = await supabase.from('profiles').select('id,affiliate_enabled,affiliate_approved_at').eq('id', refCreatorId).single();
        const approvedAt = creator && creator.affiliate_approved_at ? new Date(creator.affiliate_approved_at) : null;
        // No retroactive commission: creator must be approved before this order
        if (creator && creator.affiliate_enabled && approvedAt && approvedAt <= new Date()) {
          const digitalItems = orderItems.filter(i => (i.optionType || i.type) === 'digital');
          if (digitalItems.length) {
            const isUSD = order.currency === 'USD';
            const dpids = [...new Set(digitalItems.map(i => i.productId))];
            const { data: cset } = await supabase.from('products')
              .select('id,commission_enabled,creator_commission_percent,minimum_price_thb,minimum_price_usd').in('id', dpids);
            const csMap = Object.fromEntries((cset || []).map(p => [p.id, p]));
            const rows = [];
            for (const it of digitalItems) {
              const cs = csMap[it.productId];
              if (!cs || !cs.commission_enabled) continue;
              const unit = isUSD ? (it.unitPriceUSD || 0) : (it.unitPriceTHB || 0);
              const min = isUSD ? Number(cs.minimum_price_usd != null ? cs.minimum_price_usd : 2.99) : Number(cs.minimum_price_thb != null ? cs.minimum_price_thb : 99);
              if (unit < min) continue; // below minimum eligible price → no commission
              const lineTotal = isUSD ? unit * it.qty : (it.lineTotalTHB || 0);
              const pct = Number(cs.creator_commission_percent != null ? cs.creator_commission_percent : 5);
              const amount = Math.round(lineTotal * pct) / 100; // pct% of line total, 2dp
              if (amount <= 0) continue;
              rows.push({ creator_id: refCreatorId, order_id: order.id, product_id: it.productId, product_title: it.title, buyer_id: authUser ? authUser.id : null, sale_amount: lineTotal, currency: order.currency, commission_percent: pct, commission_amount: amount, status: 'pending' });
            }
            if (rows.length) await supabase.from('creator_commissions').insert(rows);
          }
        }
      }
    } catch (e) { console.error('[digital commission] skipped:', e.message); }

    // Send confirmation emails
    const orderRef = (order.id || '').slice(-8).toUpperCase();
    await sendEmail(customerEmail, `✅ คำสั่งซื้อ #${orderRef} รับแล้ว — Fluffy Pub`, await tplOrderCreated(order), { orderId: order.id, eventType: 'order_created' });
    const _adminTotal = order.currency === 'USD' ? fmtOrderAmount(order.total_usd, true) : fmtOrderAmount(order.total_thb || 0, false);
    await sendEmail(ADMIN_EMAIL, `🛍️ New Order #${orderRef} — ${_adminTotal}`, await tplAdminNewOrder(order), { orderId: order.id, eventType: 'admin_order_created' });

    return json(res, 201, order);
  }

  // POST upload slip
  if (req.method === 'POST' && action === 'slip' && id) {
    const { slip_url, access_token } = req.body || {};
    if (!slip_url) return json(res, 400, { error: 'slip_url required' });
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    // SECURITY: only the order's owner may attach a slip — a logged-in user who owns it
    // (or admin), or a guest who proves possession of the order's secret access_token.
    // Prevents anyone from posting slips to arbitrary order IDs.
    const slipUser = await getUser(req);
    const ownsOrder =
      (slipUser && (slipUser.id === order.user_id || slipUser.role === 'admin')) ||
      (!!access_token && access_token === order.access_token);
    if (!ownsOrder) return json(res, 403, { error: 'Forbidden' });
    const { data, error } = await supabase.from('orders').update({
      slip_url,
      slip_uploaded_at: new Date().toISOString(),
      status: 'payment_submitted',
      payment_status: 'payment_submitted',
      // Clear any previous rejection info on re-upload
      slip_reject_reason: null,
      slip_reject_note: null,
      slip_rejected_at: null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });

    const ref = (order.id||'').slice(-8).toUpperCase();
    const _isUSD = order.currency === 'USD';
    const _total = _isUSD ? order.total_usd : (order.total_thb || order.total_amount || 0);
    const _totalDisplay = fmtOrderAmount(_total, _isUSD);
    // No eventType → bypasses dedup so every re-upload notifies admin
    await sendEmail(ADMIN_EMAIL, `💳 Payment Slip Uploaded — Order #${ref}`,
      await emailWrapper(`<h2 style="margin:0 0 10px;color:#111827;font-size:18px">💳 Payment Slip Uploaded</h2>
        <p style="color:#374151;font-size:13px"><strong>${order.customer_name}</strong> uploaded a payment slip for Order <strong>#${ref}</strong> · ${_totalDisplay}</p>
        <img src="${slip_url}" alt="slip" style="width:100%;max-width:320px;border-radius:8px;border:1px solid #e5e7eb;margin:8px 0">
        <a href="${SITE}/admin" style="display:inline-block;margin-top:8px;background:#f472b6;color:white;text-decoration:none;padding:10px 20px;border-radius:20px;font-weight:700;font-size:13px">⚙️ Review in Admin →</a>`)
    );
    await supabase.from('order_email_logs').insert({ order_id: order.id, event_type: 'slip_uploaded', recipient_email: ADMIN_EMAIL, subject: `Payment Slip Uploaded — Order #${ref}`, status: 'sent' }).catch(() => {});
    return json(res, 200, data);
  }

  // POST reject slip (admin)
  if (req.method === 'POST' && action === 'reject-slip' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { reason, note } = req.body || {};
    if (!reason) return json(res, 400, { error: 'reason required' });
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    const { data, error } = await supabase.from('orders').update({
      status: 'pending_payment',
      payment_status: 'pending',
      slip_url: null,
      slip_uploaded_at: null,
      slip_reject_reason: reason,
      slip_reject_note: note || null,
      slip_rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });

    const ref = (order.id||'').slice(-8).toUpperCase();
    // No eventType → bypasses dedup so every rejection sends a fresh email
    const rejSubject = `⚠️ Payment Proof Requires Attention — Order #${ref}`;
    await sendEmail(order.customer_email, rejSubject, await tplSlipRejected(order, reason, note));
    await supabase.from('order_email_logs').insert({ order_id: order.id, event_type: 'slip_rejected', recipient_email: order.customer_email, subject: rejSubject, status: 'sent', sent_by: user.email }).catch(() => {});
    return json(res, 200, data);
  }

  // POST mark paid (admin)
  if (req.method === 'POST' && action === 'pay' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    let enrichedItems = order.items || [];
    const hasAnyDigital = enrichedItems.some(i => (i.optionType || i.type) === 'digital');
    if (hasAnyDigital) {
      const digitalIds = enrichedItems.filter(i => (i.optionType || i.type) === 'digital').map(i => i.productId);
      const { data: products } = await supabase.from('products').select('id,digital_download_url,download_instruction,r2_key,r2_file_name').in('id', digitalIds);
      enrichedItems = enrichedItems.map(item => {
        if ((item.optionType || item.type) !== 'digital') return item;
        const p = products?.find(x => x.id === item.productId);
        return {
          ...item,
          digital_download_url: p?.digital_download_url || null,
          download_instruction: p?.download_instruction || null,
          r2_key: p?.r2_key || null,
          r2_file_name: p?.r2_file_name || null,
          download_limit: 3,
          download_count: 0,
        };
      });
    }
    const isDigitalOnly = enrichedItems.length > 0 && enrichedItems.every(i => (i.optionType || i.type) === 'digital');
    const { data, error } = await supabase.from('orders').update({
      payment_status: 'paid',
      status: isDigitalOnly ? 'delivered' : 'paid',
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: enrichedItems,
    }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });

    // Digital-only orders deliver instantly on payment → confirm their commission now
    if (isDigitalOnly) {
      try { await supabase.from('creator_commissions').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('order_id', id).eq('status', 'pending'); } catch (_) { /* not migrated */ }
    }

    // Decrease stock for physical items now that payment is confirmed
    await adjustStock(data.items, -1);

    // Send payment confirmed email to customer only — admin chose to mark as paid themselves
    const ref = (data.id||'').slice(-8).toUpperCase();
    const _confirmSubject = data.currency === 'USD'
      ? `✅ Payment Confirmed – Your Digital Files Are Ready — Fluffy Pub`
      : `✅ ยืนยันการชำระเงิน Order #${ref} — Fluffy Pub`;
    await sendEmail(data.customer_email, _confirmSubject, await tplPaymentConfirmed(data), { orderId: data.id, eventType: 'payment_confirmed' });

    return json(res, 200, data);
  }

  // PUT update status/tracking (admin)
  if (req.method === 'PUT' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { status, tracking_number, shipping_provider } = req.body || {};

    // Fetch current order to detect tracking change
    const { data: before } = await supabase.from('orders').select('*').eq('id', id).single();

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (tracking_number !== undefined) updates.tracking_number = tracking_number;
    if (shipping_provider !== undefined) updates.shipping_provider = shipping_provider;
    // Stamp the delivery time the first time an order becomes 'delivered', so affiliate
    // commission can be bucketed by delivery month. (Does not affect totals/calc.)
    if (status === 'delivered' && before?.status !== 'delivered' && !before?.delivered_at) {
      updates.delivered_at = new Date().toISOString();
    }

    const { data, error } = await supabase.from('orders').update(updates).eq('id', id).select().single();
    if (error) return json(res, 404, { error: 'Order not found' });

    // Digital commission: confirm on delivery, cancel on cancellation (matches physical rule)
    try {
      if (status === 'delivered' && before?.status !== 'delivered') {
        await supabase.from('creator_commissions').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('order_id', id).eq('status', 'pending');
      } else if (status === 'cancelled') {
        await supabase.from('creator_commissions').update({ status: 'cancelled' }).eq('order_id', id).in('status', ['pending', 'confirmed']);
      }
    } catch (_) { /* schema not migrated yet — ignore */ }

    // Send shipped notification when status changes to 'shipped', or tracking is newly added
    const trackingAdded = tracking_number && tracking_number !== before?.tracking_number;
    const justShipped = status === 'shipped' && before?.status !== 'shipped';
    if (data.customer_email) {
      const ref = (data.id||'').slice(-8).toUpperCase();
      if (justShipped) {
        // One email covers both shipped status + any new tracking number
        await sendEmail(data.customer_email, `🚚 สินค้าถูกจัดส่งแล้ว! Order #${ref} — Fluffy Pub`, await tplTrackingAdded(data), { orderId: data.id, eventType: 'shipped_notification' });
      } else if (trackingAdded) {
        // Tracking updated without shipping status change (e.g., adding tracking later)
        await sendEmail(data.customer_email, `🚚 อัปเดตหมายเลขพัสดุ Order #${ref} — Fluffy Pub`, await tplTrackingAdded(data), { orderId: data.id, eventType: 'tracking_added' });
      }
    }

    return json(res, 200, data);
  }

  // POST cancel order (customer — only if pending_payment and no slip uploaded)
  if (req.method === 'POST' && action === 'cancel' && id) {
    const user = await requireAuth(req, res);
    if (!user) return;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    // Only owner or admin can cancel
    if (order.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
    // Block cancel if slip uploaded or already paid/processing
    if (order.slip_url) return json(res, 400, { error: 'Cannot cancel: payment slip already uploaded.' });
    if (['paid','packing','shipped','delivered'].includes(order.status)) return json(res, 400, { error: `Cannot cancel: order is already ${order.status}.` });
    const { data: cancelData, error } = await supabase.from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    // Cancel any digital commission attributed to this order
    try { await supabase.from('creator_commissions').update({ status: 'cancelled' }).eq('order_id', id).in('status', ['pending', 'confirmed']); } catch (_) { /* not migrated */ }
    // Restore stock if order was paid
    if (cancelData.payment_status === 'paid') {
      await adjustStock(cancelData.items, +1);
    }
    return json(res, 200, cancelData);
  }

  // POST send payment reminder (admin) — supports single id via query or bulk via body
  if (req.method === 'POST' && action === 'reminder') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    // Support single order via ?id= or bulk via body.orderIds
    const orderIds = id ? [id] : (req.body?.orderIds || []);
    if (!orderIds.length) return json(res, 400, { error: 'orderIds required' });
    const results = [];
    for (const oid of orderIds) {
      const { data: order } = await supabase.from('orders').select('*').eq('id', oid).single();
      if (!order) { results.push({ id: oid, error: 'Not found' }); continue; }
      const ref = (order.id || '').slice(-8).toUpperCase();
      const result = await sendEmail(
        order.customer_email,
        `⏰ แจ้งเตือน: รอชำระเงินคำสั่งซื้อ #${ref} — Fluffy Pub`,
        await tplPaymentReminder(order),
        { orderId: order.id, eventType: 'payment_reminder' }
      );
      await supabase.from('orders').update({ payment_reminder_sent_at: new Date().toISOString() }).eq('id', oid);
      results.push({ id: oid, sent: true, skipped: result?.skipped });
    }
    return json(res, 200, { results });
  }

  // GET email logs for an order (admin)
  if (req.method === 'GET' && action === 'email-logs' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('order_email_logs')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });
      if (error) return json(res, 200, []); // table may not exist yet
      return json(res, 200, data || []);
    } catch (e) {
      return json(res, 200, []);
    }
  }

  // POST custom message email to customer (admin only)
  if (req.method === 'POST' && action === 'custom-email' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { subject, message } = req.body || {};
    if (!subject?.trim() || !message?.trim()) return json(res, 400, { error: 'Subject and message are required.' });
    const { data: order, error: orderErr } = await supabase.from('orders').select('id,user_id,customer_name,customer_email,access_token').eq('id', id).single();
    if (orderErr || !order) return json(res, 404, { error: 'Order not found.' });
    const ref = order.id.slice(-8).toUpperCase();
    const link = orderLink(order);
    const html = await emailWrapper(`
      <div style="background:#fdf2f8;border-radius:10px;padding:10px 14px;margin-bottom:18px;border:1px solid #f9a8d4">
        <div style="font-size:11px;color:#9ca3af;font-weight:700;letter-spacing:0.5px">ORDER</div>
        <div style="font-size:16px;font-weight:900;color:#f472b6">#${ref}</div>
        <div style="font-size:12px;color:#374151;margin-top:2px">👤 ${order.customer_name}</div>
      </div>
      <div style="font-size:14px;color:#111827;line-height:1.8;white-space:pre-wrap">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div style="margin-top:20px;text-align:center">
        <a href="${link}" style="display:inline-block;background:#f472b6;color:white;text-decoration:none;padding:10px 24px;border-radius:20px;font-weight:700;font-size:13px">📦 ดูคำสั่งซื้อ / View Order →</a>
      </div>
    `);
    // Custom messages always send (no dedup) — call sendEmail without eventType to skip dedup check, then log manually
    await sendEmail(order.customer_email, subject.trim(), html, {});
    await supabase.from('order_email_logs').insert({ order_id: order.id, event_type: 'custom_message', recipient_email: order.customer_email, subject: subject.trim(), status: 'sent', sent_by: user.email }).catch(() => {});
    return json(res, 200, { success: true });
  }

  // GET generate signed R2 download URL — enforces per-item download limit
  if (req.method === 'GET' && action === 'download') {
    const { token: accessToken, item: itemIdx } = req.query;
    let order = null;
    let isAdmin = false;

    if (accessToken) {
      const { data } = await supabase.from('orders').select('*').eq('access_token', accessToken).single();
      order = data;
    } else {
      const user = await requireAuth(req, res);
      if (!user) return;
      const { data } = await supabase.from('orders').select('*').eq('id', id).single();
      if (!data) return json(res, 404, { error: 'Order not found' });
      if (data.user_id !== user.id && user.role !== 'admin') return json(res, 403, { error: 'Forbidden' });
      isAdmin = user.role === 'admin';
      order = data;
    }

    if (!order) return json(res, 404, { error: 'Order not found' });
    if (order.payment_status !== 'paid') return json(res, 403, { error: 'Payment not confirmed' });

    const idx = parseInt(itemIdx) || 0;
    const items = [...(order.items || [])];
    const item = items[idx];
    if (!item) return json(res, 404, { error: 'Item not found' });
    if ((item.optionType || item.type) !== 'digital') return json(res, 400, { error: 'Not a digital item' });

    // Enforce download limit (admins bypass)
    const limit = item.download_limit ?? 3;
    const count = item.download_count ?? 0;
    if (!isAdmin && count >= limit) {
      return json(res, 429, { error: 'Download limit reached. Please contact support.' });
    }

    // Increment count before serving URL; record timestamp
    items[idx] = { ...item, download_count: count + 1, last_download_at: new Date().toISOString() };
    await supabase.from('orders').update({ items, updated_at: new Date().toISOString() }).eq('id', order.id);

    // Generate signed URL
    if (item.r2_key) {
      const accountId = process.env.R2_ACCOUNT_ID;
      const bucket    = process.env.R2_BUCKET_NAME;
      if (!accountId || !bucket) return json(res, 500, { error: 'R2 not configured' });
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
      const client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID || '', secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '' },
      });
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: item.r2_key,
        ResponseContentDisposition: `attachment; filename="${item.r2_file_name || 'download'}"`,
      });
      const url = await getSignedUrl(client, command, { expiresIn: 300 });
      return json(res, 200, { url, fileName: item.r2_file_name, downloadsUsed: count + 1, downloadsLeft: Math.max(0, limit - count - 1) });
    }

    if (item.digital_download_url) {
      return json(res, 200, { url: item.digital_download_url, fileName: item.title, downloadsUsed: count + 1, downloadsLeft: Math.max(0, limit - count - 1) });
    }

    return json(res, 404, { error: 'No download file available for this item yet' });
  }

  // POST reset download count for a specific item (admin only)
  if (req.method === 'POST' && action === 'reset-downloads') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { item: itemIdx } = req.query;
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    const idx = parseInt(itemIdx) || 0;
    const items = [...(order.items || [])];
    if (!items[idx]) return json(res, 404, { error: 'Item not found' });
    const prevCount = items[idx].download_count ?? 0;
    items[idx] = { ...items[idx], download_count: 0 };
    const { data, error } = await supabase.from('orders').update({ items, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    await supabase.from('order_email_logs').insert({
      order_id: id,
      event_type: 'download_reset',
      recipient_email: order.customer_email,
      subject: `[Admin] Reset download count for "${items[idx].title}" (was ${prevCount}, now 0)`,
      status: 'admin_action',
      sent_by: user.email,
    }).catch(() => {});
    return json(res, 200, { success: true, items: data.items });
  }

  // POST increase download limit for a specific item (admin only)
  if (req.method === 'POST' && action === 'increase-download-limit') {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { item: itemIdx, amount } = req.query;
    const add = parseInt(amount) || 1;
    if (![1, 3, 5].includes(add)) return json(res, 400, { error: 'amount must be 1, 3, or 5' });
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
    if (!order) return json(res, 404, { error: 'Order not found' });
    const idx = parseInt(itemIdx) || 0;
    const items = [...(order.items || [])];
    if (!items[idx]) return json(res, 404, { error: 'Item not found' });
    const prevLimit = items[idx].download_limit ?? 3;
    const newLimit = prevLimit + add;
    items[idx] = { ...items[idx], download_limit: newLimit };
    const { data, error } = await supabase.from('orders').update({ items, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) return json(res, 400, { error: error.message });
    await supabase.from('order_email_logs').insert({
      order_id: id,
      event_type: 'download_limit_changed',
      recipient_email: order.customer_email,
      subject: `[Admin] Increased download limit for "${items[idx].title}" from ${prevLimit} to ${newLimit} (+${add})`,
      status: 'admin_action',
      sent_by: user.email,
    }).catch(() => {});
    return json(res, 200, { success: true, items: data.items });
  }

  // DELETE order (admin)
  if (req.method === 'DELETE' && id) {
    const user = await requireAuth(req, res, ['admin']);
    if (!user) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) return json(res, 400, { error: error.message });
    return json(res, 200, { success: true });
  }

  return json(res, 405, { error: 'Method not allowed' });
};
