import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import { useGuidelines } from '../lib/useGuidelines';

// Bilingual fallback bullets — used only until the admin edits the
// "affiliate-guidelines" Legal Page (Admin → Legal Pages).
const DEFAULT_GUIDELINES = [
  { th: 'แชร์ Fluffy Pub อย่างเป็นธรรมชาติ', en: 'Share Fluffy Pub organically' },
  { th: 'ห้ามสแปมหรือโปรโมตที่ทำให้เข้าใจผิด', en: 'No spam or misleading promotions' },
  { th: 'ค่าคอมมิชชันจะได้รับหลังจากจัดส่งสำเร็จเท่านั้น', en: 'Commissions are earned only after successful delivery' },
  { th: 'โค้ดแอฟฟิลิเอตใช้ได้กับสินค้าจริง (Physical) เท่านั้น', en: 'Affiliate codes apply to Physical Products only' },
  { th: 'Fluffy Pub อาจยกเลิกสิทธิ์แอฟฟิลิเอตได้หากจำเป็น', en: 'Fluffy Pub may revoke affiliate access if necessary' },
];

const PLATFORMS: { value: string; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'other', label: 'Other' },
];

export default function AffiliateApplicationPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { tRaw } = useLang();
  const p = theme.primaryColor;
  const { bullets: guidelines } = useGuidelines('affiliate-guidelines', DEFAULT_GUIDELINES.map(g => tRaw(g.th, g.en)));

  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [platform, setPlatform] = useState('tiktok');
  const [message, setMessage] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.affiliate_enabled) { navigate('/affiliate-dashboard'); return; }
    setName((user as any).username || user.name || '');
    api.myAffiliateRequest().then(r => {
      setExisting(r && !r.error ? r : null);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user]);

  if (!user) return null;
  if (!loaded) return <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:theme.fontFamily, color:'#94a3b8', fontSize:14 }}>Loading…</div>;

  const status = existing?.status;

  const submit = async () => {
    if (!agreed || !link.trim()) return;
    setBusy(true); setErr('');
    const res = await api.requestAffiliate({ username: name.trim() || undefined, social_media_link: link.trim(), platform, message: message.trim() || undefined });
    if (res?.error) { setErr(res.error); setBusy(false); return; }
    setDone(true); setBusy(false);
  };

  if (status === 'pending' || done) return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div style={{ background:'white', borderRadius:20, padding:40, maxWidth:480, width:'100%', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', textAlign:'center' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>⏳</div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#1e293b', marginBottom:10 }}>
          {tRaw('คำขออยู่ระหว่างการตรวจสอบ', 'Application Under Review')}
        </h2>
        <p style={{ fontSize:14, color:'#64748b', lineHeight:1.7 }}>
          {tRaw('ทีมงาน Fluffy Pub กำลังตรวจสอบคำขอแอฟฟิลิเอตของคุณ', 'The Fluffy Pub team is reviewing your affiliate application.')}
        </p>
        <button onClick={() => navigate('/account')} style={{ marginTop:24, background:p, color:'white', border:'none', cursor:'pointer', padding:'11px 28px', borderRadius:14, fontSize:14, fontWeight:800, fontFamily:theme.fontFamily }}>
          {tRaw('กลับไปยังโปรไฟล์', 'Back to Profile')}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ maxWidth:600, margin:'0 auto', padding:'40px 24px 60px' }}>
        <button onClick={() => navigate('/account')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:14, fontWeight:600, padding:'0 0 24px', display:'flex', alignItems:'center', gap:6 }}>
          ← {tRaw('กลับ', 'Back')}
        </button>

        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🤝</div>
          <h1 style={{ fontSize:26, fontWeight:900, color:'#1e293b', margin:'0 0 12px' }}>
            {tRaw('สมัครเป็นแอฟฟิลิเอต', 'Become an Affiliate')}
          </h1>
          <p style={{ fontSize:15, color:'#64748b', lineHeight:1.7, margin:0 }}>
            {tRaw('แชร์ Fluffy Pub และรับค่าคอมมิชชันจากการแนะนำสินค้าจริง', 'Share Fluffy Pub and earn commission for referring physical product sales.')}
          </p>
        </div>

        {status === 'rejected' && (
          <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:12, padding:'12px 16px', fontSize:13, color:'#991b1b', fontWeight:600, marginBottom:24 }}>
            {tRaw('คำขอก่อนหน้าของคุณไม่ได้รับการอนุมัติ คุณสามารถส่งคำขอใหม่ได้', 'Your previous application was not approved. You may submit a new one.')}
          </div>
        )}

        {/* Guidelines */}
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:20 }}>
          <h2 style={{ fontSize:16, fontWeight:800, color:'#1e293b', margin:'0 0 16px' }}>
            {tRaw('แนวทางสำหรับแอฟฟิลิเอต', 'Affiliate Guidelines')}
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {guidelines.map((g, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                <span style={{ color:'#22c55e', fontWeight:800, fontSize:16, flexShrink:0, marginTop:1 }}>✓</span>
                <span style={{ fontSize:14, color:'#374151', lineHeight:1.5 }}>{g}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, paddingTop:14, borderTop:'1px solid #f1f5f9' }}>
            <span style={{ fontSize:12, color:'#94a3b8' }}>
              {tRaw('รายละเอียดเพิ่มเติมจะแสดงหลังจากได้รับการอนุมัติ', 'More details will be available after approval.')}
            </span>
          </div>
        </div>

        {/* Form */}
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:20 }}>
          <label style={{ display:'block', fontSize:14, fontWeight:700, color:'#374151', marginBottom:6 }}>{tRaw('ชื่อ', 'Name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={tRaw('ชื่อของคุณ', 'Your name')} style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, marginBottom:16, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }} />

          <label style={{ display:'block', fontSize:14, fontWeight:700, color:'#374151', marginBottom:6 }}>
            {tRaw('ลิงก์โซเชียลมีเดีย', 'Social Media Link')} <span style={{ color:'#ef4444' }}>*</span>
          </label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://" style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, marginBottom:16, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }} />

          <label style={{ display:'block', fontSize:14, fontWeight:700, color:'#374151', marginBottom:6 }}>{tRaw('แพลตฟอร์ม', 'Platform')}</label>
          <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, marginBottom:16, outline:'none', fontFamily:theme.fontFamily, background:'white', boxSizing:'border-box' }}>
            {PLATFORMS.map(pl => <option key={pl.value} value={pl.value}>{pl.label}</option>)}
          </select>

          <label style={{ display:'block', fontSize:14, fontWeight:700, color:'#374151', marginBottom:6 }}>
            {tRaw('ข้อความถึงทีมงาน', 'Message to the Team')} <span style={{ color:'#9ca3af', fontWeight:400 }}>({tRaw('ไม่บังคับ', 'optional')})</span>
          </label>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder={tRaw('เล่าเกี่ยวกับช่องทางของคุณ...', 'Tell us about your audience...')} style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, resize:'vertical', boxSizing:'border-box' }} />
        </div>

        {/* Agreement */}
        <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:24 }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width:18, height:18, marginTop:2, accentColor:p, cursor:'pointer', flexShrink:0 }} />
            <span style={{ fontSize:14, color:'#374151', lineHeight:1.6 }}>
              {tRaw('ฉันได้อ่านและยอมรับแนวทางสำหรับแอฟฟิลิเอตแล้ว', 'I have read and agree to the Affiliate Guidelines.')}
            </span>
          </label>
        </div>

        {err && (
          <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {err}</div>
        )}

        <button onClick={submit} disabled={!agreed || !link.trim() || busy} style={{ width:'100%', padding:'14px', borderRadius:14, border:'none', cursor:(!agreed || !link.trim() || busy)?'not-allowed':'pointer', background:(!agreed || !link.trim() || busy)?'#e2e8f0':p, color:(!agreed || !link.trim() || busy)?'#94a3b8':'white', fontSize:15, fontWeight:800, fontFamily:theme.fontFamily }}>
          {busy ? tRaw('กำลังส่งคำขอ...', 'Submitting...') : tRaw('ส่งใบสมัคร', 'Submit Application')}
        </button>
        {!agreed && (
          <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:10 }}>
            {tRaw('กรุณายืนยันว่าคุณยอมรับแนวทางก่อนส่งใบสมัคร', 'Please agree to the guidelines before submitting.')}
          </p>
        )}
      </div>
    </div>
  );
}
