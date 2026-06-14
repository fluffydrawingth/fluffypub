import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  pending_payment: '#fef3c7', payment_submitted: '#ede9fe', paid: '#d1fae5', packing: '#dbeafe',
  shipped: '#e0e7ff', delivered: '#d1fae5', cancelled: '#fee2e2',
};
const STATUS_TEXT: Record<string, [string, string, string]> = {
  pending_payment:    ['#d97706', 'รอชำระเงิน',    'Pending Payment'],
  payment_submitted:  ['#7c3aed', 'ส่งสลิปแล้ว',   'Payment Submitted'],
  paid:               ['#059669', 'ชำระแล้ว',       'Paid'],
  packing:            ['#2563eb', 'กำลังแพ็ค',      'Preparing'],
  shipped:            ['#7c3aed', 'จัดส่งแล้ว',     'Shipped'],
  delivered:          ['#059669', 'ได้รับแล้ว',     'Delivered'],
  cancelled:          ['#dc2626', 'ยกเลิก',          'Cancelled'],
};

export default function GuestOrderPage({ token }: { token: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw, lang } = useLang();
  const p = theme.primaryColor;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [slipUploading, setSlipUploading] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    fetch(`/api/orders?action=by-token&id=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); } else { setOrder(d); }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  useEffect(() => {
    const needsQR = (order?.status === 'pending_payment' || (order?.status === 'payment_submitted' && showReplace));
    if (!order || !needsQR || order.slip_url) return;
    if (qrDataUrl || qrLoading) return;
    const amt = order.total_thb || order.total_amount;
    if (!amt) return;
    setQrLoading(true);
    fetch(`/api/promptpay?amount=${amt}`)
      .then(r => r.json())
      .then(d => { if (d.qrDataUrl) setQrDataUrl(d.qrDataUrl); })
      .catch(() => {})
      .finally(() => setQrLoading(false));
  }, [order, showReplace]);

  const uploadSlip = async (file: File) => {
    if (!order) return;
    setSlipUploading(true);
    setMsg('');
    try {
      const result = await api.uploadFile(file, 'slips');
      if (result.error) { setMsg('⚠️ ' + result.error); setSlipUploading(false); return; }
      const res = await fetch(`/api/orders?action=slip&id=${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slip_url: result.publicUrl }),
      });
      // Safe parse — Vercel may return non-JSON on timeout even if the save succeeded
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (data?.error) { setMsg('⚠️ ' + data.error); }
      else {
        setOrder((prev: any) => ({ ...prev, slip_url: result.publicUrl, status: 'payment_submitted', payment_status: 'payment_submitted', slip_reject_reason: null }));
        setShowReplace(false);
        setMsg('✓ ' + tRaw('อัปโหลดสลิปสำเร็จ! รอแอดมินยืนยัน', 'Slip uploaded! Awaiting admin confirmation.'));
      }
    } catch (e: any) {
      // Reload order to check if save succeeded despite the error
      const fresh = await fetch(`/api/orders?action=by-token&id=${order.access_token||order.id}`).then(r=>r.json()).catch(()=>null);
      if (fresh?.slip_url) {
        setOrder(fresh);
        setShowReplace(false);
        setMsg('✓ ' + tRaw('อัปโหลดสลิปสำเร็จ! รอแอดมินยืนยัน', 'Slip uploaded! Awaiting admin confirmation.'));
      } else {
        setMsg('⚠️ ' + e.message);
      }
    }
    setSlipUploading(false);
  };

  const fmtAddr = (sa: any) => {
    if (!sa) return '';
    if (typeof sa === 'string') return sa;
    return [sa.address, sa.province, sa.postal_code, sa.country].filter(Boolean).join(', ');
  };

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily }}>
      <div style={{ textAlign: 'center', color: '#888' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
        <div>Loading order…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily }}>
      <div style={{ textAlign: 'center', maxWidth: 360, padding: '0 24px' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔍</div>
        <h2 style={{ color: '#1e293b', fontWeight: 900, marginBottom: 8 }}>
          {tRaw('ไม่พบคำสั่งซื้อ', 'Order not found')}
        </h2>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
          {tRaw(
            'ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาตรวจสอบอีเมลของคุณ',
            'This link is invalid or has expired. Please check your confirmation email.'
          )}
        </p>
        <button onClick={() => navigate('/track-order')}
          style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '11px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily, marginRight: 8 }}>
          🔎 {tRaw('ค้นหาคำสั่งซื้อ', 'Find My Order')}
        </button>
        <button onClick={() => navigate('/')}
          style={{ background: 'none', border: `1.5px solid ${p}40`, color: p, cursor: 'pointer', padding: '11px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily }}>
          {tRaw('กลับหน้าแรก', 'Go Home')}
        </button>
      </div>
    </div>
  );

  const ref = '#' + (order.id || '').slice(-8).toUpperCase();
  const totalTHB = order.total_thb || order.total_amount || 0;
  const st = STATUS_TEXT[order.status];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: theme.fontFamily, padding: '32px 16px' }}>
      <div style={{ maxWidth: 540, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px 24px', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>ORDER</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: p }}>{ref}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              {new Date(order.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          </div>
          {st && (
            <span style={{ background: STATUS_COLORS[order.status] || '#f1f5f9', color: st[0], borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 700 }}>
              {lang === 'th' ? st[1] : st[2]}
            </span>
          )}
        </div>

        {/* Items */}
        <div style={{ background: 'white', borderRadius: 20, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 10, letterSpacing: 0.5 }}>
            {tRaw('รายการสินค้า', 'ITEMS')}
          </div>
          {(order.items || []).map((i: any, idx: number) => {
            const isDigital = (i.optionType || i.type) === 'digital';
            const qty = i.qty || 1;
            const unit = i.unitPriceTHB || i.price_thb || 0;
            const line = i.lineTotalTHB || unit * qty;
            return (
              <div key={idx} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: `1.5px solid ${isDigital ? '#bfdbfe' : '#bbf7d0'}` }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{i.image}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginBottom: 3 }}>{i.title}</div>
                    {i.optionName && <div style={{ fontSize: 12, color: p, fontWeight: 600, marginBottom: 4 }}>📌 {i.optionName}</div>}
                    <span style={{ fontSize: 11, fontWeight: 700, background: isDigital ? '#dbeafe' : '#d1fae5', color: isDigital ? '#1d4ed8' : '#065f46', borderRadius: 6, padding: '1px 7px' }}>
                      {isDigital ? '⬇️ Digital' : '📦 Physical'} · Qty {qty}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: 13 }}>฿{Number(line).toLocaleString('th-TH')}</div>
                    {qty > 1 && <div style={{ fontSize: 10, color: '#9ca3af' }}>฿{Number(unit).toLocaleString('th-TH')} ×{qty}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {order.shipping_thb > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#64748b', marginTop: 8 }}>
              <span>{tRaw('ค่าจัดส่ง', 'Shipping')}</span>
              <span>฿{Number(order.shipping_thb).toLocaleString('th-TH')}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#1e293b', fontSize: 16, marginTop: 8, paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
            <span>{tRaw('ยอดรวม', 'Total')}</span>
            <span style={{ color: p }}>฿{Number(totalTHB).toLocaleString('th-TH')}</span>
          </div>
        </div>

        {/* Shipping info */}
        {order.shipping_address && (
          <div style={{ background: 'white', borderRadius: 20, padding: '16px 20px', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', fontSize: 13, color: '#374151' }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>📍 {tRaw('ที่อยู่จัดส่ง', 'Shipping Address')}</div>
            <div>{order.customer_name}</div>
            <div>{fmtAddr(order.shipping_address)}</div>
            {order.customer_phone && <div>{order.customer_phone}</div>}
          </div>
        )}

        {/* Tracking */}
        {order.tracking_number && (
          <div style={{ background: '#dbeafe', borderRadius: 16, padding: '14px 18px', marginBottom: 16, fontSize: 14, color: '#1d4ed8', fontWeight: 700, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            🚚 {order.shipping_provider || 'Thailand Post'}: {order.tracking_number}
          </div>
        )}

        {/* Payment section */}
        {(order.status === 'pending_payment' || order.status === 'payment_submitted') && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            {/* Rejection notice */}
            {order.slip_reject_reason && order.status === 'pending_payment' && (
              <div style={{ background: '#fee2e2', borderRadius: 12, padding: '12px 14px', marginBottom: 14, border: '1.5px solid #fca5a5' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>❌ {tRaw('สลิปถูกปฏิเสธ', 'Payment slip rejected')}</div>
                <div style={{ fontSize: 12, color: '#7f1d1d', fontWeight: 600 }}>{order.slip_reject_reason}</div>
                {order.slip_reject_note && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{order.slip_reject_note}</div>}
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{tRaw('กรุณาอัปโหลดสลิปใหม่อีกครั้ง', 'Please upload a new payment slip below.')}</div>
              </div>
            )}

            {order.status === 'payment_submitted' && !showReplace ? (
              /* Slip submitted — preview + waiting message */
              <div>
                <div style={{ background: '#ede9fe', borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 13, color: '#5b21b6', fontWeight: 700 }}>
                  🕐 {tRaw('ส่งหลักฐานแล้ว — รอแอดมินตรวจสอบ', 'Payment proof submitted. Waiting for review.')}
                </div>
                {order.slip_url && <img src={order.slip_url} alt="Payment slip" style={{ width: '100%', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 12 }} />}
                <button onClick={() => setShowReplace(true)}
                  style={{ width: '100%', padding: '9px', background: '#f9fafb', border: '1.5px solid #d1d5db', color: '#374151', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: theme.fontFamily }}>
                  🔄 {tRaw('เปลี่ยนสลิป', 'Replace Payment Slip')}
                </button>
              </div>
            ) : (
              <div>
                {order.status === 'payment_submitted' && (
                  <div style={{ background: '#ede9fe', borderRadius: 12, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#5b21b6', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🔄 {tRaw('กำลังเปลี่ยนสลิป', 'Replacing slip')}</span>
                    <button onClick={() => setShowReplace(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: 12, fontWeight: 700, fontFamily: theme.fontFamily }}>✕ {tRaw('ยกเลิก', 'Cancel')}</button>
                  </div>
                )}

                {/* QR */}
                <div style={{ textAlign: 'center' as const, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: theme.textColor, marginBottom: 4 }}>💳 PromptPay</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                    {tRaw('สแกนด้วยแอปธนาคารเพื่อชำระเงิน', 'Scan with your banking app to pay')}
                  </div>
                  {qrLoading ? (
                    <div style={{ width: 180, height: 180, margin: '0 auto', background: '#f3f4f6', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>⏳</div>
                  ) : qrDataUrl ? (
                    <img src={qrDataUrl} alt="PromptPay QR" style={{ width: 180, height: 180, margin: '0 auto', display: 'block', borderRadius: 8 }} />
                  ) : (
                    <div style={{ background: '#fef3c7', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e' }}>
                      {tRaw('ไม่พบ QR — ติดต่อแอดมิน', 'QR unavailable — contact admin')}
                    </div>
                  )}
                  <div style={{ marginTop: 10, fontSize: 22, fontWeight: 900, color: theme.textColor }}>
                    ฿{Number(totalTHB).toLocaleString('th-TH')}
                  </div>
                </div>

                {/* Steps */}
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', marginBottom: 12, fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{tRaw('วิธีชำระเงิน', 'Payment Steps')}</div>
                  {[
                    `1. ${tRaw('สแกน QR ด้วยแอปธนาคาร', 'Scan QR with banking app')}`,
                    `2. ${tRaw(`โอนเงิน ฿${Number(totalTHB).toLocaleString('th-TH')}`, `Transfer ฿${Number(totalTHB).toLocaleString('th-TH')}`)}`,
                    `3. ${tRaw('ถ่ายสลิป แล้วอัปโหลดด้านล่าง', 'Screenshot slip and upload below')}`,
                    `4. ${tRaw('รอการยืนยัน', 'Wait for confirmation')}`,
                  ].map((s, i) => <div key={i}>{s}</div>)}
                </div>

                {msg && (
                  <div style={{ background: msg.startsWith('✓') ? '#d1fae5' : '#fee2e2', borderRadius: 10, padding: '9px 13px', marginBottom: 10, fontSize: 13, color: msg.startsWith('✓') ? '#065f46' : '#dc2626', fontWeight: 600 }}>
                    {msg}
                  </div>
                )}
                <label style={{ display: 'block', cursor: slipUploading ? 'not-allowed' : 'pointer' }}>
                  <div style={{ background: p + '10', border: `2px dashed ${p}50`, borderRadius: 12, padding: '13px 14px', textAlign: 'center' as const, fontSize: 13, color: p, fontWeight: 700 }}>
                    {slipUploading
                      ? '⏳ ' + tRaw('กำลังอัปโหลด...', 'Uploading...')
                      : '📷 ' + tRaw('อัปโหลดสลิปการโอนเงิน', 'Upload Payment Slip')}
                  </div>
                  <input type="file" accept="image/*" style={{ display: 'none' }} disabled={slipUploading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadSlip(f); }} />
                </label>
              </div>
            )}
          </div>
        )}

        {/* Digital downloads — shown as soon as payment_status=paid, regardless of fulfilment status.
            Mixed orders stay at packing/shipped after payment; digital-only jump straight to delivered.
            The API already strips digital_download_url until payment_status=paid. */}
        {order.payment_status === 'paid' && (order.items || []).some((i: any) => (i.optionType || i.type) === 'digital') && (
          <div style={{ background: 'white', borderRadius: 20, padding: '18px 20px', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: 0.5 }}>⬇️ {tRaw('ดาวน์โหลดไฟล์ดิจิทัล', 'DIGITAL DOWNLOADS')}</div>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1e40af', fontWeight: 600 }}>
              🎉 {tRaw('ไฟล์ดิจิทัลพร้อมดาวน์โหลดแล้ว', 'Your digital file is ready to download.')}
            </div>
            {(order.items || []).filter((i: any) => (i.optionType || i.type) === 'digital').map((i: any, idx: number) => (
              i.digital_download_url
                ? <a key={idx} href={i.digital_download_url} target="_blank" rel="noreferrer"
                    style={{ display: 'block', background: p, color: 'white', textDecoration: 'none', padding: '13px 20px', borderRadius: 14, fontSize: 14, fontWeight: 700, textAlign: 'center' as const, marginBottom: 8, boxShadow: `0 4px 12px ${p}44` }}>
                    ⬇️ {tRaw('ดาวน์โหลด', 'Download')}: {i.title}
                  </a>
                : <div key={idx} style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 16px', marginBottom: 8, fontSize: 13, color: '#6b7280', textAlign: 'center' as const }}>
                    📄 {i.title} — {tRaw('กรุณาติดต่อแอดมินเพื่อรับลิงค์', 'Contact admin for download link')}
                  </div>
            ))}
          </div>
        )}

        {/* Footer links */}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => navigate('/track-order')}
            style={{ flex: 1, background: 'none', border: `1.5px solid ${p}30`, color: p, cursor: 'pointer', padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>
            🔎 {tRaw('ค้นหาออเดอร์อื่น', 'Find Another Order')}
          </button>
          <button onClick={() => navigate('/')}
            style={{ flex: 1, background: 'none', border: '1.5px solid #e5e7eb', color: '#6b7280', cursor: 'pointer', padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>
            {tRaw('กลับหน้าแรก', 'Back to Shop')}
          </button>
        </div>
      </div>
    </div>
  );
}
