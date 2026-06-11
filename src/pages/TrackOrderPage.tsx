import React, { useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function TrackOrderPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  const [orderRef, setOrderRef] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRef.trim() || !email.trim()) {
      setError(tRaw('กรุณากรอกข้อมูลให้ครบ', 'Please fill in all fields.'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders?action=resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), orderRef: orderRef.trim() }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else { setSent(true); }
    } catch {
      setError(tRaw('เกิดข้อผิดพลาด กรุณาลองใหม่', 'Something went wrong. Please try again.'));
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: theme.fontFamily, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ background: 'white', borderRadius: 24, padding: '36px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center' as const, marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🔎</div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', margin: '0 0 6px' }}>
            {tRaw('ติดตามคำสั่งซื้อ', 'Track Your Order')}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {tRaw(
              'กรอกหมายเลขออเดอร์และอีเมล เราจะส่งลิงก์ให้ทางอีเมล',
              'Enter your order number and email — we\'ll send you the access link.'
            )}
          </p>
        </div>

        {sent ? (
          <div>
            <div style={{ background: '#d1fae5', borderRadius: 16, padding: '20px', textAlign: 'center' as const, marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📧</div>
              <div style={{ fontWeight: 800, color: '#065f46', fontSize: 15, marginBottom: 6 }}>
                {tRaw('ส่งลิงก์แล้ว!', 'Link Sent!')}
              </div>
              <div style={{ fontSize: 13, color: '#047857' }}>
                {tRaw(
                  'หากอีเมลและหมายเลขออเดอร์ถูกต้อง ลิงก์จะถูกส่งไปยังอีเมลของคุณภายในไม่กี่นาที',
                  'If the email and order number match, you\'ll receive the link shortly. Check your spam folder too.'
                )}
              </div>
            </div>
            <button onClick={() => { setSent(false); setOrderRef(''); setEmail(''); }}
              style={{ width: '100%', padding: '11px', background: 'none', border: `1.5px solid ${p}30`, color: p, cursor: 'pointer', borderRadius: 12, fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily }}>
              {tRaw('ค้นหาออเดอร์อื่น', 'Track Another Order')}
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                {tRaw('หมายเลขคำสั่งซื้อ', 'Order Number')}
              </label>
              <input
                type="text"
                value={orderRef}
                onChange={e => setOrderRef(e.target.value)}
                placeholder="เช่น AB123456 / e.g. AB123456"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box' as const }}
                onFocus={e => e.target.style.borderColor = p}
                onBlur={e => e.target.style.borderColor = p + '30'}
              />
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {tRaw('อยู่ในอีเมลยืนยันออเดอร์ เช่น #AB123456', 'Found in your confirmation email, e.g. #AB123456')}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 5 }}>
                {tRaw('อีเมล', 'Email Address')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={tRaw('อีเมลที่ใช้สั่งซื้อ', 'Email used when ordering')}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${p}30`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily, boxSizing: 'border-box' as const }}
                onFocus={e => e.target.style.borderColor = p}
                onBlur={e => e.target.style.borderColor = p + '30'}
              />
            </div>

            {error && (
              <div style={{ background: '#fee2e2', borderRadius: 10, padding: '9px 13px', marginBottom: 14, fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '13px', background: loading ? p + '88' : p, color: 'white', border: 'none', cursor: loading ? 'wait' : 'pointer', borderRadius: 14, fontSize: 15, fontWeight: 800, fontFamily: theme.fontFamily, boxShadow: `0 4px 12px ${p}44` }}>
              {loading ? '⏳ ' + tRaw('กำลังส่ง...', 'Sending...') : '📧 ' + tRaw('ส่งลิงก์ให้ฉัน', 'Send Me the Link')}
            </button>

            <button type="button" onClick={() => navigate('/')}
              style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: theme.fontFamily, marginTop: 10 }}>
              ← {tRaw('กลับหน้าแรก', 'Back to Shop')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
