import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const thb = (n: number) => `฿${Number(n || 0).toLocaleString('th-TH')}`;
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_LABEL: Record<string, { t: string; c: string; bg: string }> = {
  pending_payment:   { t: 'Pending Payment',   c: '#d97706', bg: '#fef3c7' },
  payment_submitted: { t: 'Payment Submitted', c: '#2563eb', bg: '#dbeafe' },
  paid:              { t: 'Paid',              c: '#0d9488', bg: '#ccfbf1' },
  packing:           { t: 'Packing',           c: '#7c3aed', bg: '#ede9fe' },
  shipped:           { t: 'Shipped',           c: '#0891b2', bg: '#cffafe' },
  delivered:         { t: 'Delivered',         c: '#059669', bg: '#d1fae5' },
  cancelled:         { t: 'Cancelled',         c: '#dc2626', bg: '#fee2e2' },
};

export default function AffiliateDashboardPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Payout account form
  const [acct, setAcct] = useState({ payout_account_name:'', payout_bank_name:'', payout_account_number:'', payout_payment_method:'Bank Transfer', payout_note:'' });
  const [acctMsg, setAcctMsg] = useState('');
  const [acctSaving, setAcctSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    // Server-authoritative access: getMyAffiliate returns data only if the profile's
    // affiliate_enabled is true (checked server-side via the DB). If it errors (403),
    // the user genuinely isn't an affiliate → send them to their account page.
    api.getMyAffiliate().then(d => {
      if (!d || d.error) { navigate('/account'); return; }
      setData(d);
      if (d?.payoutAccount) setAcct(a => ({ ...a, ...Object.fromEntries(Object.entries(d.payoutAccount).map(([k,v]) => [k, v || (k==='payout_payment_method'?'Bank Transfer':'')])) }) as any);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const saveAcct = async () => {
    setAcctSaving(true); setAcctMsg('');
    const res = await api.updatePayoutAccount(acct);
    setAcctSaving(false);
    setAcctMsg(res?.error ? ('⚠️ ' + res.error) : '✓ Saved');
    setTimeout(() => setAcctMsg(''), 3000);
  };

  if (!user) return null;
  if (loading) return <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>⏳</div>;

  const codes = data?.codes || [];
  const orders = data?.orders || [];
  const s = data?.summary || { ordersReferred:0, physicalRevenueTHB:0, commissionEarned:0, paidCommission:0, pendingCommission:0 };

  const cards = [
    { label: tRaw('คำสั่งซื้อที่แนะนำ','Orders Referred'), value: s.ordersReferred, icon:'📦', color:'#10b981' },
    { label: tRaw('ยอดขายสินค้าจริง','Physical Revenue'), value: thb(s.physicalRevenueTHB), icon:'💰', color:'#f59e0b' },
    { label: tRaw('คอมมิชชันที่ได้รับ','Commission Earned'), value: thb(s.commissionEarned), icon:'🏦', color:'#8b5cf6' },
    { label: tRaw('คอมมิชชันค้างจ่าย','Pending Commission'), value: thb(s.pendingCommission), icon:'⏳', color:'#ef4444' },
    { label: tRaw('คอมมิชชันที่จ่ายแล้ว','Paid Commission'), value: thb(s.paidCommission), icon:'✅', color:'#06b6d4' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ maxWidth:980, margin:'0 auto', padding:'32px 24px 60px' }}>
        <button onClick={() => navigate('/account')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b', fontSize:14, fontWeight:600, padding:'0 0 20px', display:'flex', alignItems:'center', gap:6 }}>
          ← {tRaw('กลับ', 'Back')}
        </button>

        <h1 style={{ fontSize:24, fontWeight:900, color:'#1e293b', marginBottom:6 }}>🤝 {tRaw('แดชบอร์ดแอฟฟิลิเอต','Affiliate Dashboard')}</h1>
        <p style={{ fontSize:13, color:'#94a3b8', marginBottom:24 }}>{tRaw('คอมมิชชันจะนับเมื่อคำสั่งซื้อจัดส่งสำเร็จเท่านั้น','Commission counts only once an order is delivered.')}</p>

        {/* My code(s) */}
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
          {codes.length === 0 && (
            <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', color:'#94a3b8', fontSize:14 }}>
              {tRaw('ยังไม่มีโค้ด ทีมงานจะสร้างให้เมื่ออนุมัติ','No code yet — the team assigns one on approval.')}
            </div>
          )}
          {codes.map((c: any) => (
            <div key={c.id} style={{ background:'white', borderRadius:16, padding:'18px 22px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', borderLeft:`4px solid ${c.active ? p : '#cbd5e1'}` }}>
              <div style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:4 }}>{tRaw('โค้ดของฉัน','My Code')}</div>
              <div style={{ fontSize:26, fontWeight:900, color:'#1e293b', letterSpacing:1 }}>{c.code}</div>
              <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
                {tRaw('ส่วนลด','Discount')} {thb(c.discount_amount)} · {tRaw('คอมมิชชัน','Commission')} {thb(c.affiliate_commission)}
                {!c.active && <span style={{ color:'#dc2626', fontWeight:700, marginLeft:8 }}>({tRaw('ปิดใช้งาน','inactive')})</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(170px,1fr))', gap:14, marginBottom:28 }}>
          {cards.map(c => (
            <div key={c.label} style={{ background:'white', borderRadius:16, padding:18, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', borderLeft:`4px solid ${c.color}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:4 }}>{c.label}</div>
                  <div style={{ fontSize:20, fontWeight:900, color:'#1e293b' }}>{c.value}</div>
                </div>
                <span style={{ fontSize:22 }}>{c.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        <h2 style={{ fontSize:18, fontWeight:800, color:'#1e293b', marginBottom:12 }}>{tRaw('ประวัติแอฟฟิลิเอต','Affiliate History')}</h2>
        <div style={{ background:'white', borderRadius:16, overflow:'auto', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
            <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
              {['Order ID','Date','Code','Order Amount','Discount','Commission','Status'].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{orders.map((o: any) => {
              const si = STATUS_LABEL[o.status] || { t:o.status, c:'#64748b', bg:'#f1f5f9' };
              const earned = o.status === 'delivered';
              return (
                <tr key={o.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:p, fontSize:12 }}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, fontWeight:700, color:'#1e293b' }}>{o.affiliate_code || '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#1e293b' }}>{thb(o.total_thb)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, color:'#dc2626' }}>−{thb(o.affiliate_discount_thb)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:800, color: earned ? '#059669' : '#94a3b8' }}>
                    {thb(o.affiliate_commission_thb)}{!earned && <span style={{ fontSize:10, fontWeight:600, marginLeft:4 }}>({tRaw('รอจัดส่ง','pending')})</span>}
                    {earned && o.affiliate_paid_at && <span style={{ fontSize:10, fontWeight:600, marginLeft:4, color:'#06b6d4' }}>({tRaw('จ่ายแล้ว','paid')})</span>}
                  </td>
                  <td style={{ padding:'10px 14px' }}><span style={{ background:si.bg, color:si.c, borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>{si.t}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          {!orders.length && <div style={{ textAlign:'center', padding:36, color:'#94a3b8' }}>{tRaw('ยังไม่มีคำสั่งซื้อที่แนะนำ','No referred orders yet.')}</div>}
        </div>

        {/* Payout history */}
        <h2 style={{ fontSize:18, fontWeight:800, color:'#1e293b', margin:'28px 0 12px' }}>{tRaw('ประวัติการจ่ายเงิน','Payout History')}</h2>
        <div style={{ background:'white', borderRadius:16, overflow:'auto', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
            <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
              {['Month','Calculated','Paid','Status','Paid Date','Proof','Note'].map(hh => (
                <th key={hh} style={{ textAlign:'left', padding:'11px 14px', fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase', whiteSpace:'nowrap' }}>{hh}</th>
              ))}
            </tr></thead>
            <tbody>{(data?.payouts||[]).map((py:any) => {
              const paid = py.status === 'paid';
              return (
                <tr key={py.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap' }}>{MONTHS[py.month]} {py.year}</td>
                  <td style={{ padding:'10px 14px', fontSize:13 }}>{thb(py.calculated_commission)}</td>
                  <td style={{ padding:'10px 14px', fontSize:13, fontWeight:800, color:'#059669' }}>{thb(py.paid_amount)}</td>
                  <td style={{ padding:'10px 14px' }}><span style={{ background:paid?'#d1fae5':'#fef3c7', color:paid?'#059669':'#d97706', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{paid?tRaw('จ่ายแล้ว','Paid'):tRaw('รอดำเนินการ','Pending')}</span></td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>{py.paid_at ? new Date(py.paid_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:12 }}>{py.payout_proof_url ? <a href={py.payout_proof_url} target="_blank" rel="noreferrer" style={{ color:p }}>{tRaw('ดู','View')}</a> : '—'}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', maxWidth:200 }}>{py.payout_note || '—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
          {!(data?.payouts||[]).length && <div style={{ textAlign:'center', padding:36, color:'#94a3b8' }}>{tRaw('ยังไม่มีประวัติการจ่ายเงิน','No payouts yet.')}</div>}
        </div>

        {/* Payout account details */}
        <h2 style={{ fontSize:18, fontWeight:800, color:'#1e293b', margin:'28px 0 12px' }}>{tRaw('ข้อมูลบัญชีรับเงิน','Payout Account Details')}</h2>
        <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize:12, color:'#94a3b8', marginTop:0, marginBottom:16 }}>{tRaw('ทีมงานจะใช้ข้อมูลนี้ในการโอนค่าคอมมิชชันให้คุณ','The team uses these details to transfer your commission.')}</p>
          {([
            ['payout_account_name', tRaw('ชื่อบัญชี','Account Name')],
            ['payout_account_number', tRaw('เลขบัญชี / PayPal','Account Number / PayPal')],
            ['payout_bank_name', tRaw('ธนาคาร','Bank Name')],
          ] as [string,string][]).map(([k,label]) => (
            <div key={k} style={{ marginBottom:14 }}>
              <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#374151', marginBottom:6 }}>{label}</label>
              <input value={(acct as any)[k]} onChange={e=>setAcct(a=>({...a,[k]:e.target.value}))} style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#374151', marginBottom:6 }}>{tRaw('วิธีรับเงิน','Payment Method')}</label>
            <select value={acct.payout_payment_method} onChange={e=>setAcct(a=>({...a,payout_payment_method:e.target.value}))} style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, background:'white', boxSizing:'border-box' }}>
              {['Bank Transfer','PromptPay','PayPal','Other'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#374151', marginBottom:6 }}>{tRaw('หมายเหตุ','Note')}</label>
            <textarea value={acct.payout_note} onChange={e=>setAcct(a=>({...a,payout_note:e.target.value}))} rows={2} style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, resize:'vertical', boxSizing:'border-box' }} />
          </div>
          {acctMsg && <span style={{ fontSize:13, fontWeight:700, color:acctMsg.startsWith('✓')?'#059669':'#dc2626', marginRight:12 }}>{acctMsg}</span>}
          <button onClick={saveAcct} disabled={acctSaving} style={{ background:acctSaving?p+'88':p, color:'white', border:'none', cursor:acctSaving?'wait':'pointer', padding:'11px 24px', borderRadius:14, fontSize:14, fontWeight:800, fontFamily:theme.fontFamily }}>
            {acctSaving ? tRaw('กำลังบันทึก...','Saving...') : tRaw('บันทึกข้อมูลบัญชี','Save Account Details')}
          </button>
        </div>

        {/* Policies — full guidelines & agreement (commission terms etc.) */}
        <div style={{ display:'flex', gap:18, flexWrap:'wrap' as const, marginTop:24 }}>
          <a onClick={()=>navigate('/affiliate-guidelines')} style={{ fontSize:13, color:p, cursor:'pointer', fontWeight:700 }}>📋 {tRaw('แนวทางแอฟฟิลิเอต','Affiliate Guidelines')}</a>
          <a onClick={()=>navigate('/affiliate-agreement')} style={{ fontSize:13, color:p, cursor:'pointer', fontWeight:700 }}>📜 {tRaw('ข้อตกลงแอฟฟิลิเอต','Affiliate Agreement')}</a>
        </div>
      </div>
    </div>
  );
}
