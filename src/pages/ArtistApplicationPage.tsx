import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const GUIDELINES = [
  { th: 'ผลงานต้องเป็นต้นฉบับของคุณเองเท่านั้น', en: 'Original artwork only — no copied or traced work' },
  { th: 'สินค้าต้องผ่านการอนุมัติจากแอดมินก่อนเผยแพร่', en: 'Products require admin approval before publishing' },
  { th: 'รายได้อาจแตกต่างกันตามผลิตภัณฑ์หรือข้อตกลงความร่วมมือ', en: 'Revenue sharing may vary by product or collaboration' },
  { th: 'การจ่ายเงินในปัจจุบันดำเนินการด้วยตนเองโดย Fluffy Pub', en: 'Payouts are currently handled manually by Fluffy Pub' },
  { th: 'ห้ามละเมิดลิขสิทธิ์ไม่ว่าในกรณีใด', en: 'Copyright violations are strictly prohibited' },
  { th: 'Fluffy Pub อาจระงับสิทธิ์ศิลปินได้หากจำเป็น', en: 'Fluffy Pub may suspend artist access if necessary' },
];

export default function ArtistApplicationPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user, refreshUser } = useAuth();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'artist') { navigate('/artist-dashboard'); return; }
    api.myArtistRequest().then(r => {
      const req = r && !r.error ? r : null;
      setExisting(req);
      setLoaded(true);
      if (req?.status === 'approved') refreshUser();
    }).catch(() => setLoaded(true));
  }, [user]);

  if (!user) return null;
  if (!loaded) return <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:theme.fontFamily, color:'#94a3b8', fontSize:14 }}>Loading…</div>;

  const status = existing?.status;

  const submit = async () => {
    if (!agreed) return;
    setBusy(true); setErr('');
    const res = await api.requestArtist(message);
    if (res?.error) { setErr(res.error); setBusy(false); return; }
    setDone(true); setBusy(false);
  };

  // Already submitted states
  if (status === 'pending' || done) return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'white', borderRadius:20, padding:40, maxWidth:480, width:'100%', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:10 }}>
          {tRaw('คำขออยู่ระหว่างการตรวจสอบ', 'Application Under Review')}
        </h2>
        <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7 }}>
          {tRaw('ทีมงาน Fluffy Pub กำลังตรวจสอบคำขอของคุณ เราจะแจ้งให้ทราบเมื่อมีการอัปเดต', 'The Fluffy Pub team is reviewing your application. We\'ll update you once a decision is made.')}
        </p>
        <button onClick={() => navigate('/account')} style={{ marginTop:24, background:p, color:'white', border:'none', cursor:'pointer', padding:'11px 28px', borderRadius:14, fontSize:14, fontWeight:800, fontFamily:theme.fontFamily }}>
          {tRaw('กลับไปยังโปรไฟล์', 'Back to Profile')}
        </button>
      </div>
    </div>
  );

  if (status === 'approved') return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'white', borderRadius:20, padding:40, maxWidth:480, width:'100%', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#065f46', marginBottom:10 }}>
          {tRaw('คุณได้รับการอนุมัติเป็นศิลปินแล้ว!', 'You\'re an Approved Artist!')}
        </h2>
        <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7, marginBottom:24 }}>
          {tRaw('เปิด Artist Studio เพื่อจัดการผลงานและยอดขายของคุณ', 'Open your Artist Studio to manage your products and sales.')}
        </p>
        <button onClick={async () => { await refreshUser(); navigate('/artist-dashboard'); }} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'11px 28px', borderRadius:14, fontSize:14, fontWeight:800, fontFamily:theme.fontFamily }}>
          {tRaw('เปิด Artist Studio →', 'Open Artist Studio →')}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ maxWidth:600, margin:'0 auto', padding:'40px 24px 60px' }}>

        {/* Back */}
        <button onClick={() => navigate('/account')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:14, fontWeight:600, padding:'0 0 24px', display:'flex', alignItems:'center', gap:6 }}>
          ← {tRaw('กลับ', 'Back')}
        </button>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎨</div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#1e293b', margin:'0 0 12px' }}>
            {tRaw('สมัครเป็นศิลปิน', 'Become an Artist')}
          </h1>
          <p style={{ fontSize:15, color:'#64748b', lineHeight:1.7, margin:0 }}>
            {tRaw(
              'เข้าร่วม Fluffy Pub ในฐานะศิลปินและแบ่งปันสมุดระบายสีของคุณกับชุมชนของเรา',
              'Join Fluffy Pub as an artist and share your coloring books with our community.'
            )}
          </p>
        </div>

        {/* Rejected / Revoked notice */}
        {status === 'rejected' && (
          <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#991b1b', fontWeight:600, marginBottom:24 }}>
            {tRaw('คำขอก่อนหน้าของคุณไม่ได้รับการอนุมัติ คุณสามารถส่งคำขอใหม่ได้', 'Your previous application was not approved. You may submit a new one.')}
          </div>
        )}
        {status === 'revoked' && (
          <div style={{ background:'#fffbeb', border:'1.5px solid #fcd34d', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#92400e', fontWeight:600, marginBottom:24 }}>
            {tRaw('สิทธิ์ศิลปินของคุณถูกถอดถอน คุณสามารถส่งคำขอใหม่ได้', 'Your artist access was removed. You may apply again.')}
          </div>
        )}

        {/* Guidelines card */}
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:'#1e293b', marginBottom:16, margin:'0 0 16px' }}>
            {tRaw('แนวทางปฏิบัติสำหรับศิลปิน', 'Artist Guidelines')}
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {GUIDELINES.map((g, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <span style={{ color:'#22c55e', fontWeight:800, fontSize:16, flexShrink:0, marginTop:1 }}>✓</span>
                <span style={{ fontSize:14, color:'#374151', lineHeight:1.5 }}>{tRaw(g.th, g.en)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #f1f5f9' }}>
            <a onClick={() => navigate('/artist-guidelines')} style={{ fontSize:12, color:p, cursor:'pointer', textDecoration:'underline', marginRight:16 }}>
              {tRaw('ดูแนวทางฉบับเต็ม', 'View Full Artist Guidelines')}
            </a>
            <a onClick={() => navigate('/artist-agreement')} style={{ fontSize:12, color:p, cursor:'pointer', textDecoration:'underline' }}>
              {tRaw('ดูข้อตกลงศิลปิน', 'View Artist Agreement')}
            </a>
          </div>
        </div>

        {/* Message */}
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:20 }}>
          <label style={{ display:'block', fontSize:14, fontWeight:700, color:'#374151', marginBottom:8 }}>
            {tRaw('ข้อความถึงทีมงาน', 'Message to the Team')}{' '}
            <span style={{ color:'#9ca3af', fontWeight:400 }}>({tRaw('ไม่บังคับ', 'optional')})</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            placeholder={tRaw('แนะนำตัวเองและแบ่งปันเกี่ยวกับผลงานศิลปะของคุณ...', 'Tell us about yourself and your art...')}
            style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, resize:'vertical', boxSizing:'border-box' }}
          />
        </div>

        {/* Agreement checkbox */}
        <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:24 }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ width:18, height:18, marginTop:2, accentColor:p, cursor:'pointer', flexShrink:0 }}
            />
            <span style={{ fontSize:14, color:'#374151', lineHeight:1.6 }}>
              {tRaw(
                'ฉันได้อ่านและยอมรับแนวทางปฏิบัติสำหรับศิลปินและข้อตกลงศิลปินแล้ว',
                'I have read and agree to the Artist Guidelines and Artist Agreement.'
              )}
            </span>
          </label>
        </div>

        {/* Error */}
        {err && (
          <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>
            ⚠️ {err}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!agreed || busy}
          style={{
            width:'100%',
            padding:'14px',
            borderRadius:14,
            border:'none',
            cursor: (!agreed || busy) ? 'not-allowed' : 'pointer',
            background: (!agreed || busy) ? '#e2e8f0' : p,
            color: (!agreed || busy) ? '#94a3b8' : 'white',
            fontSize:15,
            fontWeight:800,
            fontFamily:theme.fontFamily,
            transition:'all 0.15s',
          }}
        >
          {busy
            ? tRaw('กำลังส่งคำขอ...', 'Submitting...')
            : tRaw('ส่งใบสมัคร', 'Submit Application')}
        </button>

        {!agreed && (
          <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:10 }}>
            {tRaw('กรุณายืนยันว่าคุณได้อ่านและยอมรับแนวทางปฏิบัติก่อนส่งใบสมัคร', 'Please confirm you have read and agreed to the guidelines before submitting.')}
          </p>
        )}
      </div>
    </div>
  );
}
