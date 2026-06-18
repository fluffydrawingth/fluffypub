import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { useFavorites } from '../lib/favorites';
import { useLang } from '../lib/lang';

type Tab = 'orders' | 'favorites' | 'profile';

export default function AccountPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>(() => { const t = route.params?.tab; return (t === 'orders' || t === 'profile' || t === 'favorites') ? t as Tab : 'orders'; });
  const { t, tRaw, lang } = useLang();
  const p = theme.primaryColor;

  if (!user) {
    React.useEffect(() => { navigate('/login'); }, []);
    return null;
  }

  const tabs: [string,string,string][] = [['orders','📦',tRaw('คำสั่งซื้อ','Orders')],['profile','👤',tRaw('โปรไฟล์','Profile')],['favorites','❤️',tRaw('รายการโปรด','Favorites')]];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:p+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>👤</div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, color:'#1e293b', margin:0 }}>{user.name}</h1>
            <div style={{ fontSize:13, color:'#64748b' }}>{user.email}</div>
          </div>
          <button onClick={async()=>{await logout();navigate('/');}} style={{ marginLeft:'auto', background:'#fef2f2', border:'1.5px solid #fca5a5', color:'#ef4444', cursor:'pointer', padding:'8px 16px', borderRadius:12, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>Sign Out</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {tabs.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ padding:'9px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background:tab===id?p:p+'12', color:tab===id?'white':p, fontFamily:theme.fontFamily }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {tab==='orders' && <OrdersTab p={p} theme={theme} />}
        {tab==='favorites' && <FavoritesTab p={p} theme={theme} navigate={navigate} />}
        {tab==='profile' && <ProfileTab key={user.id} user={user} p={p} theme={theme} refreshUser={refreshUser} />}
      </div>
    </div>
  );
}

function OrdersTab({p,theme}:any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<Record<string,string>>({});  // keyed by order id
  const [qrLoading, setQrLoading] = useState<Record<string,boolean>>({});
  const [dlLoading, setDlLoading] = useState<Record<number,boolean>>({});
  const [dlError, setDlError] = useState<Record<number,string>>({});

  const downloadItem = async (orderId: string, itemIdx: number) => {
    setDlLoading(prev => ({ ...prev, [itemIdx]: true }));
    setDlError(prev => ({ ...prev, [itemIdx]: '' }));
    try {
      const authToken = localStorage.getItem('fluffy_token') || '';
      const res = await fetch(`/api/orders?action=download&id=${orderId}&item=${itemIdx}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.error) {
        setDlError(prev => ({ ...prev, [itemIdx]: data.error }));
        return;
      }
      const a = document.createElement('a');
      a.href = data.url;
      a.download = data.fileName || 'download';
      a.click();
      // Refresh selected order to reflect updated download_count
      const freshOrders = await api.myOrders().catch(() => null);
      if (freshOrders) {
        setOrders(freshOrders);
        const fresh = freshOrders.find((o: any) => o.id === orderId);
        if (fresh) setSelected(fresh);
      }
    } catch (e: any) {
      setDlError(prev => ({ ...prev, [itemIdx]: e.message }));
    } finally {
      setDlLoading(prev => ({ ...prev, [itemIdx]: false }));
    }
  };
  const { tRaw, lang } = useLang();
  const STATUS_COLORS: Record<string,string> = {
    pending_payment:'#fef3c7', payment_submitted:'#ede9fe', paid:'#d1fae5', packing:'#dbeafe', shipped:'#e0e7ff', delivered:'#d1fae5', cancelled:'#fee2e2',
  };
  const STATUS_TEXT: Record<string,string[]> = {
    pending_payment:['#d97706','รอชำระเงิน','Pending Payment'],
    payment_submitted:['#7c3aed','ส่งสลิปแล้ว','Payment Submitted'],
    paid:['#059669','ชำระแล้ว','Paid'],
    packing:['#2563eb','กำลังแพ็ค','Preparing'],
    shipped:['#7c3aed','จัดส่งแล้ว','Shipped'],
    delivered:['#059669','ได้รับแล้ว','Delivered'],
    cancelled:['#dc2626','ยกเลิก','Cancelled'],
  };

  useEffect(() => { api.myOrders().then(o=>{ setOrders(Array.isArray(o)?o:[]); setLoading(false); }); }, []);

  const cancelOrder = async (orderId: string) => {
    if (!confirm(tRaw('ยืนยันการยกเลิกคำสั่งซื้อ?', 'Cancel this order?'))) return;
    const token = localStorage.getItem('fluffy_token') || '';
    const res = await fetch(`/api/orders?action=cancel&id=${orderId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.error) { alert(tRaw(`ไม่สามารถยกเลิก: ${data.error}`, `Cannot cancel: ${data.error}`)); return; }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', cancelled_at: data.cancelled_at } : o));
    if (selected?.id === orderId) setSelected((s: any) => ({ ...s, status: 'cancelled' }));
  };

  const loadQR = async (orderId: string, amtTHB: number) => {
    if (qrDataUrl[orderId] || qrLoading[orderId] || !amtTHB) return;
    setQrLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const token = localStorage.getItem('fluffy_token') || '';
      const r = await fetch(`/api/promptpay?amount=${amtTHB}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.qrDataUrl) setQrDataUrl(prev => ({ ...prev, [orderId]: d.qrDataUrl }));
    } catch {}
    setQrLoading(prev => ({ ...prev, [orderId]: false }));
  };

  const uploadSlip = async (orderId: string, file: File) => {
    setSlipUploading(true);
    try {
      console.log('[slip upload] starting for order:', orderId, 'file:', file.name, file.type, file.size);
      const result = await api.uploadFile(file, 'slips');
      if (result.error) {
        console.error('[slip upload] error:', result.error);
        alert(tRaw(`อัปโหลดไม่สำเร็จ: ${result.error}`, `Upload failed: ${result.error}`));
        setSlipUploading(false);
        return;
      }
      console.log('[slip upload] uploaded to:', result.publicUrl);
      const token = localStorage.getItem('fluffy_token');
      const saveRes = await fetch(`/api/orders?action=slip&id=${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token||''}` },
        body: JSON.stringify({ slip_url: result.publicUrl }),
      });
      // Safe JSON parse — Vercel may return non-JSON on timeout even if the save succeeded
      let saveData: any = null;
      try { saveData = await saveRes.json(); } catch {}
      if (saveData?.error) {
        console.error('[slip upload] save error:', saveData.error);
        alert(tRaw(`บันทึกไม่สำเร็จ: ${saveData.error}`, `Save failed: ${saveData.error}`));
        setSlipUploading(false);
        return;
      }
      console.log('[slip upload] saved to order OK');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, slip_url: result.publicUrl, status: 'payment_submitted', payment_status: 'payment_submitted', slip_reject_reason: null } : o));
      if (selected?.id === orderId) setSelected((s: any) => ({ ...s, slip_url: result.publicUrl, status: 'payment_submitted', payment_status: 'payment_submitted', slip_reject_reason: null }));
      setShowReplace(false);
    } catch (e: any) {
      // If the image was already uploaded to storage, the save likely succeeded despite the error.
      // Reload orders to reflect actual state rather than showing a confusing alert.
      console.error('[slip upload] exception:', e.message);
      const freshOrders = await api.myOrders().catch(() => null);
      if (freshOrders) {
        setOrders(freshOrders);
        const freshOrder = freshOrders.find((o: any) => o.id === orderId);
        if (freshOrder?.slip_url) {
          if (selected?.id === orderId) setSelected(freshOrder);
          setShowReplace(false);
          setSlipUploading(false);
          return;
        }
      }
      alert(tRaw('เกิดข้อผิดพลาด กรุณาลองใหม่', 'Something went wrong. Please try again.'));
    }
    setSlipUploading(false);
  };

  const fmtAddr = (sa:any) => {
    if (!sa) return '';
    if (typeof sa==='string') return sa;
    return [sa.address,sa.province,sa.postal_code,sa.country].filter(Boolean).join(', ');
  };

  const ACTIVE_STATUSES = ['pending_payment','payment_submitted','paid','packing','shipped'];
  const activeOrders    = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const completedOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));
  const [showCompleted, setShowCompleted] = React.useState(false);

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading...</div>;
  if (!orders.length) return (
    <div style={{ textAlign:'center', padding:'60px 24px', background:'white', borderRadius:20 }}>
      <div style={{ fontSize:56, marginBottom:14 }}>📦</div>
      <h3 style={{ color:'#1e293b', fontWeight:800 }}>{tRaw('ยังไม่มีคำสั่งซื้อ','No orders yet')}</h3>
    </div>
  );

  if (selected) return (
    <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
      <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',color:p,fontSize:13,fontWeight:600,marginBottom:16,padding:0}}>
        ← {tRaw('กลับ','Back to Orders')}
      </button>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <div style={{fontWeight:900,color:'#1e293b',fontSize:18}}>#{selected.id.slice(-8).toUpperCase()}</div>
          <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{new Date(selected.created_at||selected.createdAt).toLocaleString(lang==='th'?'th-TH':'en-US')}</div>
        </div>
        {STATUS_TEXT[selected.status]&&<span style={{background:STATUS_COLORS[selected.status]||'#f1f5f9',color:STATUS_TEXT[selected.status]?.[0]||'#6b7280',borderRadius:20,padding:'5px 14px',fontSize:12,fontWeight:700}}>{lang==='th'?STATUS_TEXT[selected.status]?.[1]:STATUS_TEXT[selected.status]?.[2]}</span>}
      </div>

      {/* Products */}
      <div style={{borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6',padding:'14px 0',marginBottom:14}}>
        {(selected.items||[]).map((i:any,idx:number)=>{
          const optionType = i.optionType || (i.type==='digital'?'digital':'physical');
          const optionName = i.optionName || i.variant?.name || '';
          const qty = i.qty || 1;
          const unitPrice = i.unitPriceTHB || i.price_thb || (i.price ? Math.round(i.price*35) : 0);
          const lineTotal = i.lineTotalTHB || (unitPrice * qty);
          const isDigital = optionType === 'digital';
          return (
            <div key={idx} style={{background:'#f9fafb',borderRadius:10,padding:'10px 12px',marginBottom:8,border:`1px solid ${isDigital?'#bfdbfe':'#bbf7d0'}`}}>
              <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                <span style={{fontSize:22,flexShrink:0}}>{i.image}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,color:'#1e293b',fontSize:14,marginBottom:3}}>{i.title}</div>
                  {/* Variant name on its own line */}
                  {optionName&&<div style={{fontSize:12,color:p,fontWeight:600,marginBottom:4}}>📌 {optionName}</div>}
                  <div style={{display:'flex',gap:5,flexWrap:'wrap' as const}}>
                    <span style={{fontSize:10,fontWeight:700,background:isDigital?'#dbeafe':'#d1fae5',color:isDigital?'#1d4ed8':'#065f46',borderRadius:6,padding:'1px 7px'}}>
                      {isDigital?'⬇️ Digital':'📦 Physical'}
                    </span>
                    <span style={{fontSize:10,color:'#6b7280'}}>Qty: {qty}</span>
                  </div>
                </div>
                <div style={{textAlign:'right' as const,flexShrink:0}}>
                  <div style={{fontWeight:800,color:'#1e293b',fontSize:13}}>฿{Number(lineTotal).toLocaleString('th-TH')}</div>
                  {qty>1&&<div style={{fontSize:10,color:'#9ca3af'}}>฿{Number(unitPrice).toLocaleString('th-TH')} ×{qty}</div>}
                </div>
              </div>
            </div>
          );
        })}
        {selected.shipping_thb>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#64748b',marginTop:8}}><span>{tRaw('ค่าจัดส่ง','Shipping')}</span><span>฿{selected.shipping_thb}</span></div>}
        <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,color:'#1e293b',fontSize:16,marginTop:8}}>
          <span>{tRaw('ยอดรวม','Total')}</span>
          <span>฿{Number(selected.total_thb||selected.total_amount||(parseFloat(selected.total||'0')*35)).toLocaleString('th-TH')}</span>
        </div>
      </div>

      {/* Shipping address */}
      {selected.shipping_address&&<div style={{background:'#f9fafb',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:13,color:'#374151'}}>
        <div style={{fontWeight:700,marginBottom:4}}>📍 {tRaw('ที่อยู่จัดส่ง','Shipping Address')}</div>
        <div>{selected.customer_name}</div>
        <div>{fmtAddr(selected.shipping_address)}</div>
        {selected.customer_phone&&<div>{selected.customer_phone}</div>}
      </div>}

      {/* Tracking */}
      {selected.tracking_number&&<div style={{background:'#dbeafe',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:13,color:'#1d4ed8',fontWeight:600}}>
        🚚 {selected.shipping_provider}: {selected.tracking_number}
      </div>}

      {/* Payment section — pending_payment or payment_submitted */}
      {(selected.status==='pending_payment'||selected.status==='payment_submitted')&&(()=>{
        const payAmt = selected.total_thb || selected.total_amount || (parseFloat(selected.total||'0')*35);
        const isSubmitted = selected.status === 'payment_submitted';
        const showQR = !isSubmitted || showReplace;

        // Preload QR when showing it
        if (showQR && payAmt && !qrDataUrl[selected.id] && !qrLoading[selected.id]) {
          loadQR(selected.id, payAmt);
        }

        return (
          <div style={{marginBottom:14}}>
            {/* Rejection notice */}
            {selected.slip_reject_reason && selected.status==='pending_payment' && (
              <div style={{background:'#fee2e2',borderRadius:12,padding:'12px 14px',marginBottom:12,border:'1.5px solid #fca5a5'}}>
                <div style={{fontSize:13,fontWeight:700,color:'#dc2626',marginBottom:4}}>❌ {tRaw('สลิปถูกปฏิเสธ','Payment slip rejected')}</div>
                <div style={{fontSize:12,color:'#7f1d1d',fontWeight:600}}>{selected.slip_reject_reason}</div>
                {selected.slip_reject_note&&<div style={{fontSize:12,color:'#374151',marginTop:4}}>{selected.slip_reject_note}</div>}
                <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>{tRaw('กรุณาอัปโหลดสลิปใหม่อีกครั้ง','Please upload a new payment slip below.')}</div>
              </div>
            )}

            {isSubmitted&&!showReplace ? (
              /* Slip submitted — show preview + waiting message */
              <div>
                <div style={{background:'#ede9fe',borderRadius:12,padding:'12px 14px',marginBottom:10,fontSize:13,color:'#5b21b6',fontWeight:700}}>
                  🕐 {tRaw('ส่งหลักฐานแล้ว — รอแอดมินตรวจสอบ','Payment proof submitted. Waiting for review.')}
                </div>
                <img src={selected.slip_url} alt="slip" style={{width:'100%',borderRadius:10,border:'1px solid #e5e7eb',marginBottom:10}} />
                <button onClick={()=>setShowReplace(true)}
                  style={{width:'100%',padding:'9px',background:'#f9fafb',border:'1.5px solid #d1d5db',color:'#374151',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:theme.fontFamily}}>
                  🔄 {tRaw('เปลี่ยนสลิป','Replace Payment Slip')}
                </button>
              </div>
            ) : (
              /* Show QR + upload form */
              <div>
                {isSubmitted&&(
                  <div style={{background:'#ede9fe',borderRadius:12,padding:'10px 14px',marginBottom:12,fontSize:12,color:'#5b21b6',fontWeight:600,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span>🔄 {tRaw('กำลังเปลี่ยนสลิป','Replacing slip')}</span>
                    <button onClick={()=>setShowReplace(false)} style={{background:'none',border:'none',cursor:'pointer',color:'#7c3aed',fontSize:12,fontWeight:700,fontFamily:theme.fontFamily}}>✕ {tRaw('ยกเลิก','Cancel')}</button>
                  </div>
                )}

                {/* PromptPay QR */}
                <div style={{background:'white',border:'1.5px solid #e5e7eb',borderRadius:16,padding:20,textAlign:'center' as const,marginBottom:12}}>
                  <div style={{fontWeight:800,fontSize:14,color:theme.textColor,marginBottom:4}}>💳 PromptPay</div>
                  <div style={{fontSize:12,color:'#64748b',marginBottom:12}}>{tRaw('สแกนด้วยแอปธนาคารเพื่อชำระเงิน','Scan with your banking app to pay')}</div>
                  {qrLoading[selected.id] ? (
                    <div style={{width:180,height:180,margin:'0 auto',background:'#f3f4f6',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⏳</div>
                  ) : qrDataUrl[selected.id] ? (
                    <img src={qrDataUrl[selected.id]} alt="PromptPay QR" style={{width:180,height:180,margin:'0 auto',display:'block',borderRadius:8}} />
                  ) : (
                    <div style={{background:'#fef3c7',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#92400e'}}>
                      {tRaw('ไม่พบ QR — ติดต่อแอดมิน','QR unavailable — contact admin')}
                    </div>
                  )}
                  {payAmt > 0 && <div style={{marginTop:10,fontSize:20,fontWeight:900,color:theme.textColor}}>฿{Number(payAmt).toLocaleString('th-TH')}</div>}
                </div>

                {/* Payment instructions */}
                <div style={{background:'#f9fafb',borderRadius:12,padding:'12px 14px',marginBottom:10,fontSize:12,color:'#374151',lineHeight:1.7}}>
                  <div style={{fontWeight:700,marginBottom:6}}>{tRaw('วิธีชำระเงิน','Payment Steps')}</div>
                  {['1. สแกน QR ด้วยแอปธนาคาร / Scan QR with banking app',
                    `2. โอนเงิน ฿${Number(payAmt).toLocaleString('th-TH')} / Transfer ฿${Number(payAmt).toLocaleString('th-TH')}`,
                    '3. ถ่ายสลิป แล้วอัปโหลดด้านล่าง / Screenshot slip and upload below',
                    '4. รอการยืนยัน / Wait for confirmation',
                  ].map((s,i) => <div key={i}>{s}</div>)}
                </div>

                {/* Upload slip */}
                <label style={{display:'block',cursor:slipUploading?'not-allowed':'pointer',marginBottom:8}}>
                  <div style={{background:p+'10',border:`2px dashed ${p}50`,borderRadius:12,padding:'12px 14px',textAlign:'center' as const,fontSize:13,color:p,fontWeight:700}}>
                    {slipUploading ? '⏳ '+tRaw('กำลังอัปโหลด...','Uploading...') : '📷 '+tRaw('อัปโหลดสลิปการโอนเงิน','Upload Payment Slip')}
                  </div>
                  <input type="file" accept="image/*" style={{display:'none'}} disabled={slipUploading} onChange={e=>{const f=e.target.files?.[0];if(f)uploadSlip(selected.id,f);}} />
                </label>

                {/* Cancel — only when truly pending (no slip submitted yet) */}
                {!isSubmitted&&(
                  <button onClick={()=>cancelOrder(selected.id)}
                    style={{width:'100%',padding:'9px',background:'#fef2f2',border:'1.5px solid #fca5a5',color:'#dc2626',borderRadius:10,cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:theme.fontFamily}}>
                    ✕ {tRaw('ยกเลิกคำสั่งซื้อ','Cancel Order')}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Order timeline */}
      {(()=>{
        type TimelineStep = { label: string; labelTh: string; ts: string | null; done: boolean; rejected?: boolean };
        const steps: TimelineStep[] = [
          { label:'Order Created', labelTh:'สร้างคำสั่งซื้อ', ts: selected.created_at||selected.createdAt||null, done: true },
          { label:'Payment Submitted', labelTh:'ส่งสลิปแล้ว', ts: selected.slip_uploaded_at||null, done: !!selected.slip_uploaded_at || selected.status==='payment_submitted' || !!selected.paid_at },
          ...(selected.slip_rejected_at ? [{ label:'Slip Rejected', labelTh:'สลิปถูกปฏิเสธ', ts: selected.slip_rejected_at, done: true, rejected: true } as TimelineStep] : []),
          { label:'Paid', labelTh:'ชำระแล้ว', ts: selected.paid_at||null, done: !!selected.paid_at },
          ...(selected.shipped_at||selected.tracking_number ? [{ label:'Shipped', labelTh:'จัดส่งแล้ว', ts: selected.shipped_at||null, done: true } as TimelineStep] : []),
        ];
        const hasMilestone = steps.some(s => s.done && s.ts);
        if (!hasMilestone) return null;
        return (
          <div style={{marginBottom:14,marginTop:4}}>
            <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:10,letterSpacing:0.5}}>{tRaw('ความคืบหน้า','ORDER TIMELINE')}</div>
            <div style={{position:'relative' as const,paddingLeft:20}}>
              <div style={{position:'absolute' as const,left:6,top:8,bottom:8,width:2,background:'#f3f4f6',borderRadius:2}} />
              {steps.map((s,i)=>(
                <div key={i} style={{position:'relative' as const,marginBottom:i<steps.length-1?14:0,paddingLeft:16}}>
                  <div style={{position:'absolute' as const,left:-7,top:2,width:12,height:12,borderRadius:'50%',background:s.rejected?'#dc2626':s.done?p:'#e5e7eb',border:`2px solid ${s.rejected?'#fca5a5':s.done?p:'#e5e7eb'}`,flexShrink:0}} />
                  <div style={{fontSize:13,fontWeight:700,color:s.rejected?'#dc2626':s.done?'#1e293b':'#9ca3af'}}>{lang==='th'?s.labelTh:s.label}</div>
                  {s.ts&&<div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{new Date(s.ts).toLocaleString(lang==='th'?'th-TH':'en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Digital downloads — shown as soon as payment_status=paid, regardless of fulfilment status.
          Mixed orders stay at packing/shipped after payment; digital-only jump straight to delivered. */}
      {selected.payment_status==='paid' && (selected.items||[]).some((i:any)=>(i.optionType||i.type)==='digital') && (
        <div style={{marginBottom:8}}>
          <div style={{background:'#eff6ff',borderRadius:12,padding:'10px 14px',marginBottom:10,fontSize:13,color:'#1e40af',fontWeight:600}}>
            🎉 {tRaw('ไฟล์ดิจิทัลพร้อมดาวน์โหลดแล้ว','Your digital file is ready to download.')}
          </div>
          {(selected.items||[]).map((i:any,idx:number)=>{
            if ((i.optionType||i.type)!=='digital') return null;
            const hasFile = i.r2_key || i.digital_download_url;
            const limit = i.download_limit ?? 3;
            const count = i.download_count ?? 0;
            const limitReached = count >= limit;
            const err = dlError[idx];
            return (
              <div key={idx} style={{marginBottom:8}}>
                {hasFile
                  ? <button disabled={!!dlLoading[idx]||limitReached} onClick={()=>downloadItem(selected.id, idx)}
                      style={{display:'block',width:'100%',background:limitReached?'#e5e7eb':dlLoading[idx]?'#9ca3af':p,color:limitReached?'#9ca3af':'white',border:'none',cursor:(dlLoading[idx]||limitReached)?'not-allowed':'pointer',padding:'12px 16px',borderRadius:12,fontSize:14,fontWeight:700,textAlign:'center' as const,boxShadow:limitReached?'none':`0 4px 12px ${p}44`,fontFamily:theme.fontFamily}}>
                      {dlLoading[idx]?'⏳ กำลังเตรียมไฟล์…':limitReached?`🔒 ${tRaw('ดาวน์โหลดครบแล้ว','Download limit reached')}`:(`⬇️ ${tRaw('ดาวน์โหลด','Download')}: ${i.title}`)}
                    </button>
                  : <div style={{background:'#f9fafb',borderRadius:12,padding:'12px 16px',fontSize:13,color:'#6b7280',textAlign:'center' as const}}>
                      📄 {i.title} — {tRaw('กรุณาติดต่อแอดมิน','Contact admin for download link')}
                    </div>
                }
                {err&&<div style={{background:'#fee2e2',borderRadius:8,padding:'8px 12px',marginTop:4,fontSize:12,color:'#dc2626',fontWeight:600}}>{err}</div>}
                {hasFile&&!limitReached&&<div style={{fontSize:11,color:'#9ca3af',textAlign:'center' as const,marginTop:3}}>{tRaw(`ดาวน์โหลดได้อีก ${limit-count} ครั้ง`,`${limit-count} download${limit-count===1?'':'s'} remaining`)}</div>}
                {hasFile&&limitReached&&<div style={{fontSize:11,color:'#dc2626',textAlign:'center' as const,marginTop:3}}>{tRaw('กรุณาติดต่อแอดมินเพื่อรีเซ็ต','Please contact support to reset.')}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderOrderCard = (o: any) => (
    <div key={o.id} onClick={()=>setSelected(o)} style={{ background:'white', borderRadius:18, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', cursor:'pointer', border:`1.5px solid ${p}10` }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=p+'40'}
      onMouseLeave={e=>e.currentTarget.style.borderColor=p+'10'}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ fontWeight:800, color:'#1e293b', marginBottom:3 }}>#{o.id.slice(-8).toUpperCase()}</div>
          <div style={{ fontSize:12, color:'#94a3b8' }}>{new Date(o.created_at||o.createdAt).toLocaleDateString(lang==='th'?'th-TH':'en-US')}</div>
        </div>
        <span style={{ background:STATUS_COLORS[o.status]||'#f1f5f9', color:STATUS_TEXT[o.status]?.[0]||'#6b7280', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
          {lang==='th'?STATUS_TEXT[o.status]?.[1]:STATUS_TEXT[o.status]?.[2]}
        </span>
      </div>
      {o.items.map((i:any)=>(
        <div key={i.productId} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:26 }}>{i.image}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{i.title}</div>
            <div style={{ fontSize:12, color:'#888' }}>{i.optionType==='digital'||i.type==='digital'?'⬇️ Digital Download':'📦 Physical'}</div>
          </div>
          <span style={{ fontWeight:800, color:'#1e293b' }}>฿{Number(i.unitPriceTHB||i.price_thb||(i.price?Math.round(i.price*35):0)).toLocaleString('th-TH')}</span>
        </div>
      ))}
      <div style={{ borderTop:'1px solid #f1f5f9', marginTop:10, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:13, color:'#64748b' }}>Total: <strong style={{color:'#1e293b'}}>฿{Number(o.total_thb||o.total_amount||(parseFloat(o.total||'0')*35)).toLocaleString('th-TH')}</strong></div>
        {(o.tracking_number||o.trackingNumber)&&(
          <div style={{ fontSize:12, color:'#7c3aed', fontWeight:600 }}>🚚 {o.shipping_provider||o.shippingProvider}: <strong>{o.tracking_number||o.trackingNumber}</strong></div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {activeOrders.length>0&&(
        <>
          <div style={{ fontSize:11, fontWeight:800, color:'#059669', letterSpacing:0.5, padding:'4px 0 2px', textTransform:'uppercase' as const }}>
            🟢 {tRaw('คำสั่งซื้อที่ดำเนินการอยู่','Active Orders')} ({activeOrders.length})
          </div>
          {activeOrders.map(renderOrderCard)}
        </>
      )}
      {completedOrders.length>0&&(
        <>
          <button onClick={()=>setShowCompleted(v=>!v)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', background:'none', border:'none', cursor:'pointer', padding:'10px 0 2px', borderTop: activeOrders.length>0?'1px solid #f1f5f9':'none', marginTop: activeOrders.length>0?4:0, fontFamily:'inherit' }}>
            <span style={{ fontSize:11, fontWeight:800, color:'#9ca3af', letterSpacing:0.5, textTransform:'uppercase' as const }}>
              ✓ {tRaw('คำสั่งซื้อที่เสร็จสิ้นแล้ว','Completed Orders')} ({completedOrders.length})
            </span>
            <span style={{ fontSize:14, color:'#9ca3af' }}>{showCompleted ? '▲' : '▼'}</span>
          </button>
          {showCompleted && completedOrders.map(renderOrderCard)}
        </>
      )}
    </div>
  );
}

function FavoritesTab({p,theme,navigate}:any) {
  const { favIds } = useFavorites();
  const { tRaw } = useLang();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    api.getProducts().then(prods=>{
      setProducts(Array.isArray(prods)?prods:[]);
      setLoading(false);
    });
  },[]);
  const favProducts = products.filter(pr=>favIds.includes(pr.id));
  if (loading) return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>;
  if (!favProducts.length) return (
    <div style={{textAlign:'center',padding:'60px 24px',background:'white',borderRadius:20}}>
      <div style={{fontSize:56,marginBottom:14}}>🤍</div>
      <h3 style={{color:'#1e293b',fontWeight:800}}>{tRaw('ยังไม่มีสินค้าที่ถูกใจ','No favorites yet')}</h3>
      <p style={{color:'#64748b',fontSize:14,marginBottom:20}}>{tRaw('กดหัวใจที่สินค้าเพื่อเพิ่มลงรายการโปรด','Tap ❤️ on any product to save it here.')}</p>
      <button onClick={()=>navigate('/products')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:20,fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
        {tRaw('เลือกดูสินค้า','Browse Products')}
      </button>
    </div>
  );
  return (
    <div>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>{favProducts.length} {tRaw('รายการที่ถูกใจ','saved items')}</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16}}>
        {favProducts.map(pr=>(<ProductCard key={pr.id} product={pr}/>))}
      </div>
    </div>
  );
}

function ProfileTab({user,p,theme,refreshUser}:any) {
  const { tRaw } = useLang();
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [phone, setPhone]               = useState('');
  const [addr, setAddr]                 = useState('');
  const [province, setProvince]         = useState('');
  const [postalCode, setPostalCode]     = useState('');
  const [country, setCountry]           = useState('Thailand');
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState('');
  const [loaded, setLoaded]             = useState(false);

  // Load profile DIRECTLY from API on mount — bypass auth cache entirely
  useEffect(() => {
    const token = localStorage.getItem('fluffy_token');
    if (!token) return;

    Promise.all([
      fetch('/api/users?action=me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/orders?action=my', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => []),
    ]).then(([profile, orders]) => {
      if (profile.error) { setLoaded(true); return; }

      // Use profile fields if they exist
      let fn = profile.first_name || '';
      let ln = profile.last_name || '';
      let ph = profile.phone || '';
      let em = profile.delivery_email || profile.email || '';
      let ad = profile.shipping_address?.address || '';
      let pv = profile.province || profile.shipping_address?.province || '';
      let pc = profile.postal_code || profile.shipping_address?.postal_code || '';
      let co = profile.shipping_address?.country || 'Thailand';

      // If profile is empty, fall back to most recent order's shipping info
      if (!fn && !ph && !ad && Array.isArray(orders) && orders.length > 0) {
        const latest = orders[0];
        const sa = latest.shipping_address || {};
        if (!fn) fn = latest.customer_name?.split(' ')[0] || '';
        if (!ln) ln = latest.customer_name?.split(' ').slice(1).join(' ') || '';
        if (!ph) ph = latest.customer_phone || '';
        if (!em) em = latest.customer_email || profile.email || '';
        if (!ad) ad = sa.address || '';
        if (!pv) pv = sa.province || '';
        if (!pc) pc = sa.postal_code || '';
        if (!co) co = sa.country || 'Thailand';
      }

      setFirstName(fn);
      setLastName(ln);
      setDeliveryEmail(em);
      setPhone(ph);
      setAddr(ad);
      setProvince(pv);
      setPostalCode(pc);
      setCountry(co);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const token = localStorage.getItem('fluffy_token') || '';
      const fullName = `${firstName} ${lastName}`.trim();
      const payload = {
        name: fullName || user?.name || '',
        first_name: firstName,
        last_name: lastName,
        delivery_email: deliveryEmail,
        phone,
        province,
        postal_code: postalCode,
        shipping_address: { address: addr, province, postal_code: postalCode, country },
      };
      // Save directly to API with token
      const res = await fetch('/api/users?action=me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (result?.error) {
        setMsg(`⚠️ ${result.error}`);
        setSaving(false);
        return;
      }
      // Update localStorage so auth context has fresh data
      try {
        const stored = localStorage.getItem('fluffy_user');
        const merged = stored ? { ...JSON.parse(stored), ...result } : result;
        localStorage.setItem('fluffy_user', JSON.stringify(merged));
      } catch {}
      await refreshUser();
      setMsg('✓ บันทึกแล้ว / Profile saved!');
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 5000);
  };

  const inp = (label:string, val:string, set:(v:string)=>void, type='text', disabled=false) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} disabled={disabled}
        style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${disabled?'#e5e7eb':p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box' as const,background:disabled?'#f8fafc':'white',color:disabled?'#888':'inherit'}}
        onFocus={e=>{if(!disabled)e.target.style.borderColor=p;}} onBlur={e=>{if(!disabled)e.target.style.borderColor=p+'30';}}
      />
    </div>
  );

  return (
   <>
    <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
      <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:24}}>Edit Profile</h3>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
        <div>{inp('First Name', firstName, setFirstName)}</div>
        <div>{inp('Last Name', lastName, setLastName)}</div>
      </div>
      {inp('Account Email', user.email, ()=>{}, 'email', true)}
      <div style={{fontSize:11,color:'#94a3b8',marginTop:-10,marginBottom:14}}>Account email cannot be changed.</div>
      {inp('Email for Digital Delivery', deliveryEmail, setDeliveryEmail, 'email')}
      {inp('Phone Number', phone, setPhone, 'tel')}

      <h4 style={{fontSize:14,fontWeight:800,color:'#374151',margin:'18px 0 12px'}}>📦 Shipping Address</h4>
      {inp(tRaw('บ้านเลขที่/ถนน','Street Address'), addr, setAddr)}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>{inp(tRaw('จังหวัด','Province'), province, setProvince)}</div>
        <div>{inp(tRaw('รหัสไปรษณีย์','Postal Code'), postalCode, setPostalCode)}</div>
      </div>
      {inp(tRaw('ประเทศ','Country'), country, setCountry)}

      {msg && <div style={{background:'#d1fae5',border:'1.5px solid #6ee7b7',borderRadius:11,padding:'9px 13px',marginBottom:16,fontSize:13,color:'#065f46',fontWeight:600}}>{msg}</div>}
      <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:saving?'wait':'pointer',padding:'12px 28px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
        {saving?'Saving...':'Save Changes'}
      </button>
    </div>
    {user.role === 'customer' && <ArtistRequestCard p={p} theme={theme} />}
    {user.role === 'artist' && <ArtistStudioCard p={p} theme={theme} />}
    <AffiliateCard p={p} theme={theme} user={user} />
   </>
  );
}

function AffiliateCard({p,theme,user}:any) {
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const [request, setRequest] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user?.affiliate_enabled) { setLoaded(true); return; }
    api.myAffiliateRequest().then(r => { setRequest(r && !r.error ? r : null); setLoaded(true); }).catch(() => setLoaded(true));
  }, [user?.affiliate_enabled]);

  if (!loaded) return null;
  const status = request?.status;

  return (
    <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',marginTop:20}}>
      <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:8}}>🤝 {tRaw('โปรแกรมแอฟฟิลิเอต','Affiliate Program')}</h3>
      <p style={{fontSize:13,color:'#64748b',marginBottom:18,lineHeight:1.6}}>
        {tRaw('แชร์ Fluffy Pub และรับค่าคอมมิชชันจากการแนะนำสินค้าจริง','Share Fluffy Pub and earn commission for referring physical product sales.')}
      </p>

      {user?.affiliate_enabled ? (
        <button onClick={()=>navigate('/affiliate-dashboard')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
          {tRaw('เปิดแดชบอร์ดแอฟฟิลิเอต →','Affiliate Dashboard →')}
        </button>
      ) : status === 'pending' ? (
        <div style={{background:'#fef3c7',border:'1.5px solid #fde68a',borderRadius:12,padding:'12px 16px',fontSize:13,color:'#92400e',fontWeight:700}}>
          ⏳ {tRaw('คำขอของคุณอยู่ระหว่างการตรวจสอบ','Your application is under review.')}
        </div>
      ) : (
        <button onClick={()=>navigate('/affiliate-application')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
          {status === 'rejected'
            ? tRaw('สมัครใหม่อีกครั้ง','Apply Again')
            : tRaw('สมัครเป็นแอฟฟิลิเอต →','Apply to Become an Affiliate →')}
        </button>
      )}
    </div>
  );
}

function ArtistStudioCard({p,theme}:any) {
  const { navigate } = useRouter();
  return (
    <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',marginTop:20}}>
      <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:8}}>🎨 Artist Studio</h3>
      <p style={{fontSize:13,color:'#64748b',marginBottom:18,lineHeight:1.6}}>You're an approved artist on Fluffy Pub. Open your studio to view products, sales, and your artist profile.</p>
      <button onClick={()=>navigate('/artist-dashboard')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>Open Artist Studio →</button>
    </div>
  );
}

function ArtistRequestCard({p,theme}:any) {
  const { navigate } = useRouter();
  const { refreshUser } = useAuth();
  const { tRaw } = useLang();
  const [request, setRequest] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.myArtistRequest().then(r => {
      const req = r && !r.error ? r : null;
      setRequest(req);
      setLoaded(true);
      if (req?.status === 'approved') refreshUser();
    }).catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const status = request?.status;
  return (
    <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',marginTop:20}}>
      <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:8}}>🎨 {tRaw('สมัครเป็นศิลปิน','Become an Artist')}</h3>
      <p style={{fontSize:13,color:'#64748b',marginBottom:18,lineHeight:1.6}}>
        {tRaw('ขายสมุดระบายสีของคุณเองบนร้านค้า สมัครเป็นศิลปินและทีมงานจะตรวจสอบคำขอของคุณ','Sell your own coloring books on the store. Apply for artist access and the team will review your application.')}
      </p>

      {status === 'pending' && (
        <div style={{background:'#fef3c7',border:'1.5px solid #fde68a',borderRadius:12,padding:'12px 16px',fontSize:13,color:'#92400e',fontWeight:700}}>
          ⏳ {tRaw('คำขอของคุณอยู่ระหว่างการตรวจสอบ','Your application is under review.')}
        </div>
      )}
      {status === 'approved' && (
        <div>
          <div style={{background:'#d1fae5',border:'1.5px solid #6ee7b7',borderRadius:12,padding:'12px 16px',fontSize:13,color:'#065f46',fontWeight:700,marginBottom:14}}>
            ✅ {tRaw('คุณได้รับการอนุมัติเป็นศิลปินแล้ว! เปิด Artist Studio เพื่อจัดการผลงาน','You\'re an approved artist! Open your studio to manage products and sales.')}
          </div>
          <button onClick={async()=>{ await refreshUser(); navigate('/artist-dashboard'); }} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
            {tRaw('เปิด Artist Studio →','Go to Artist Studio →')}
          </button>
        </div>
      )}
      {status === 'rejected' && (
        <div>
          <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:12,padding:'12px 16px',fontSize:13,color:'#991b1b',fontWeight:600,marginBottom:14}}>
            {tRaw('คำขอก่อนหน้าของคุณไม่ได้รับการอนุมัติ คุณสามารถส่งคำขอใหม่ได้','Your previous application was not approved. You may apply again.')}
          </div>
          <button onClick={()=>navigate('/artist-application')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
            {tRaw('สมัครใหม่อีกครั้ง','Apply Again')}
          </button>
        </div>
      )}
      {status === 'revoked' && (
        <div>
          <div style={{background:'#fffbeb',border:'1.5px solid #fcd34d',borderRadius:12,padding:'12px 16px',fontSize:13,color:'#92400e',fontWeight:600,marginBottom:14}}>
            {tRaw('สิทธิ์ศิลปินของคุณถูกถอดถอน คุณสามารถส่งคำขอใหม่ได้','Your artist access was removed. You may apply again.')}
          </div>
          <button onClick={()=>navigate('/artist-application')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
            {tRaw('สมัครใหม่อีกครั้ง','Apply Again')}
          </button>
        </div>
      )}
      {!status && (
        <button onClick={()=>navigate('/artist-application')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
          {tRaw('สมัครเป็นศิลปิน →','Apply to Become an Artist →')}
        </button>
      )}
    </div>
  );
}
