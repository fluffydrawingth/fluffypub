import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

export default function CheckoutPage() {
  const { theme } = useTheme();
  const { items, subtotalTHB, shippingTHB, totalTHB, clear } = useCart();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'info'|'payment'>('info');
  const [order, setOrder] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [slipUrl, setSlipUrl] = useState('');
  const [slipBusy, setSlipBusy] = useState(false);

  const hasPhysical = items.some(i => i.optionType === 'physical');

  // Pre-fill from profile — fetch directly from API (same as ProfileTab)
  // This ensures checkout always has the latest saved profile data
  useEffect(() => {
    const token = localStorage.getItem('fluffy_token');
    if (!token) return;
    fetch('/api/users?action=me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(profile => {
        if (profile.error || !profile.id) return;
        setFirstName(profile.first_name || profile.name?.split(' ')[0] || '');
        setLastName(profile.last_name || profile.name?.split(' ').slice(1).join(' ') || '');
        setEmail(profile.delivery_email || profile.email || '');
        setPhone(profile.phone || '');
        const sa = profile.shipping_address || {};
        setAddress(sa.address || '');
        setProvince(profile.province || sa.province || '');
        setPostalCode(profile.postal_code || sa.postal_code || '');
      })
      .catch(() => {});
  }, [user?.id]); // re-fetch when user changes

  // Load PromptPay QR after order created
  useEffect(() => {
    if (step !== 'payment' || !order) return;
    const amt = order.total_thb || order.total_amount || totalTHB;
    if (amt <= 0) return;
    setQrLoading(true);
    fetch(`/api/promptpay?amount=${amt}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('fluffy_token') || ''}` },
    }).then(r => r.json()).then(d => {
      if (d.qrDataUrl) setQrDataUrl(d.qrDataUrl);
      else console.error('[QR]', d.error);
    }).catch(e => console.error('[QR fetch]', e.message))
      .finally(() => setQrLoading(false));
  }, [step, order?.id]);

  if (items.length === 0 && step === 'info') return (
    <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
      <div style={{fontSize:64}}>🛒</div>
      <h2 style={{color:theme.textColor}}>{tRaw('ตะกร้าว่างเปล่า','Cart is empty')}</h2>
      <button onClick={()=>navigate('/products')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:20,marginTop:20,fontSize:15,fontWeight:700,fontFamily:theme.fontFamily}}>
        {tRaw('ไปช้อปปิ้ง','Shop')}
      </button>
    </div>
  );

  const inp = (label: string, val: string, set: (v: string) => void, placeholder = '', required = true, type = 'text') => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:13,fontWeight:700,color:theme.textColor,marginBottom:5}}>
        {label}{required && <span style={{color:'#ef4444'}}> *</span>}
      </label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=p} onBlur={e=>e.target.style.borderColor=p+'30'}
      />
    </div>
  );

  const placeOrder = async () => {
    setError('');
    if (!firstName.trim()) { setError(tRaw('กรุณากรอกชื่อ','Please enter your first name.')); return; }
    if (!email.trim()) { setError(tRaw('กรุณากรอกอีเมล','Please enter your email.')); return; }
    if (hasPhysical && (!phone.trim() || !address.trim() || !province.trim())) {
      setError(tRaw('กรุณากรอกข้อมูลจัดส่งให้ครบ','Please fill in all shipping details.')); return;
    }
    setBusy(true);
    try {
      const result = await api.createOrder({
        items: items.map(i => ({
          productId: i.id,
          optionId: i.optionId,
          optionName: i.optionName,
          optionType: i.optionType,
          qty: i.qty,
          unitPriceTHB: i.unitPriceTHB,
        })),
        customerName: `${firstName} ${lastName}`.trim(),
        customerEmail: email.trim(),
        customerPhone: phone.trim() || undefined,
        shippingAddress: hasPhysical ? { address: address.trim(), province: province.trim(), postal_code: postalCode.trim(), country: 'Thailand' } : undefined,
        total_thb: totalTHB,
        shipping_thb: shippingTHB,
        subtotal_thb: subtotalTHB,
      });
      if (result?.error) { setError(result.error); setBusy(false); return; }
      clear();
      setOrder(result);
      setStep('payment');
      // Save customer info back to profile for future use
      if (user) {
        const token = localStorage.getItem('fluffy_token') || '';
        fetch('/api/users?action=me', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            delivery_email: email,
            phone: phone || undefined,
            province: province || undefined,
            postal_code: postalCode || undefined,
            shipping_address: hasPhysical ? { address, province, postal_code: postalCode, country: 'Thailand' } : undefined,
          }),
        }).catch(() => {}); // fire and forget
      }
    } catch (e: any) {
      console.error('[checkout] error:', e.message, e);
      setError(e.message || tRaw('เกิดข้อผิดพลาด กรุณาลองใหม่','Something went wrong. Please try again.'));
    }
    setBusy(false);
  };

  const uploadSlip = async (file: File) => {
    if (!order?.id) return;
    setSlipBusy(true);
    try {
      const up = await api.uploadFile(file, 'slips');
      if (up.error) { alert(tRaw('อัปโหลดไม่สำเร็จ: ','Upload failed: ') + up.error); setSlipBusy(false); return; }
      const tok = localStorage.getItem('fluffy_token') || '';
      const res = await fetch(`/api/orders?action=slip&id=${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ slip_url: up.publicUrl }),
      });
      const data = await res.json();
      if (data.error) { alert(tRaw('บันทึกไม่สำเร็จ: ','Save failed: ') + data.error); }
      else setSlipUrl(up.publicUrl);
    } catch (e: any) { alert('Error: ' + e.message); }
    setSlipBusy(false);
  };

  // ── Payment step ─────────────────────────────────────────────────────
  if (step === 'payment' && order) {
    const ref = (order.id || '').slice(-8).toUpperCase();
    const payAmt = order.total_thb || order.total_amount || totalTHB;
    return (
      <div style={{background:theme.bgColor,fontFamily:theme.fontFamily,padding:'24px 16px',minHeight:'70vh'}}>
        <style>{`@media(max-width:640px){.pg{grid-template-columns:1fr!important;}}`}</style>
        <div style={{maxWidth:760,margin:'0 auto'}}>
          <h1 style={{fontSize:24,fontWeight:900,color:theme.textColor,marginBottom:4}}>
            🧾 {tRaw('สั่งซื้อแล้ว!','Order Placed!')}
          </h1>
          <p style={{color:'#64748b',marginBottom:20}}>
            {tRaw('เลขที่คำสั่งซื้อ','Order')}: <strong style={{color:p}}>#{ref}</strong>
          </p>
          <div className="pg" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
            {/* QR */}
            <div style={{background:'white',borderRadius:20,padding:24,boxShadow:`0 4px 20px ${p}12`,textAlign:'center' as const}}>
              <h3 style={{fontSize:16,fontWeight:800,color:theme.textColor,marginBottom:4}}>💳 PromptPay</h3>
              <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>{tRaw('สแกนด้วยแอปธนาคาร','Scan with banking app')}</p>
              {qrLoading
                ? <div style={{width:200,height:200,margin:'0 auto',background:'#f3f4f6',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>
                : qrDataUrl
                  ? <img src={qrDataUrl} alt="QR" style={{width:200,height:200,margin:'0 auto',display:'block',borderRadius:12}} />
                  : <div style={{background:'#fef3c7',borderRadius:12,padding:16,fontSize:13,color:'#92400e'}}>{tRaw('ไม่พบ PROMPTPAY_ID','Set PROMPTPAY_ID in Vercel env')}</div>
              }
              {payAmt > 0 && (
                <div style={{marginTop:10,fontSize:18,fontWeight:900,color:theme.textColor}}>฿{Number(payAmt).toLocaleString('th-TH')}</div>
              )}
              {/* Slip upload */}
              <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid #f3f4f6'}}>
                <div style={{fontSize:13,fontWeight:700,color:theme.textColor,marginBottom:8}}>{tRaw('อัปโหลดสลิป','Upload Slip')}</div>
                {slipUrl
                  ? <div style={{background:'#d1fae5',borderRadius:10,padding:'8px 12px',fontSize:12,color:'#065f46',fontWeight:600}}>✅ {tRaw('อัปโหลดแล้ว','Slip uploaded!')}</div>
                  : <label style={{display:'block',cursor:'pointer'}}>
                      <div style={{background:p+'12',border:`2px dashed ${p}40`,borderRadius:12,padding:12,fontSize:12,color:p,fontWeight:600}}>
                        {slipBusy ? '⏳...' : `📷 ${tRaw('อัปโหลดสลิปการโอนเงิน','Upload transfer slip')}`}
                      </div>
                      <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadSlip(f);}} />
                    </label>
                }
              </div>
            </div>
            {/* Instructions */}
            <div style={{background:'white',borderRadius:20,padding:22,boxShadow:`0 4px 20px ${p}12`}}>
              <h3 style={{fontSize:15,fontWeight:800,color:theme.textColor,marginBottom:14}}>{tRaw('วิธีชำระเงิน','Payment Steps')}</h3>
              {[
                tRaw('สแกน QR Code','Scan QR Code'),
                tRaw(`โอนเงิน ฿${Number(payAmt).toLocaleString('th-TH')} บาท`,`Transfer ฿${Number(payAmt).toLocaleString('th-TH')} THB`),
                tRaw('ถ่ายสลิปและอัปโหลด','Screenshot slip and upload'),
                tRaw('รอการยืนยันจากร้านค้า','Wait for confirmation'),
              ].map((s,i)=>(
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',marginBottom:12}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:p,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                  <div style={{fontSize:13,color:theme.textColor,paddingTop:2,lineHeight:1.5}}>{s}</div>
                </div>
              ))}
              <div style={{marginTop:16,padding:'11px 14px',background:p+'10',borderRadius:12,fontSize:12,color:theme.textColor}}>
                {hasPhysical ? tRaw('📦 จัดส่งภายใน 2-5 วันหลังยืนยัน','📦 Ships within 2-5 days after payment.')
                  : tRaw('⬇️ ลิงค์ดาวน์โหลดส่งทางอีเมลหลังยืนยัน','⬇️ Download link emailed after payment confirmed.')}
              </div>
              <div style={{marginTop:14,display:'flex',flexDirection:'column' as const,gap:8}}>
                {user
                  ? <button onClick={()=>navigate('/account/orders')} style={{width:'100%',padding:'11px',background:p,color:'white',border:'none',cursor:'pointer',borderRadius:14,fontSize:13,fontWeight:700,fontFamily:theme.fontFamily}}>{tRaw('ดูคำสั่งซื้อ','View Orders')}</button>
                  : order?.access_token && <button onClick={()=>navigate(`/guest-order/${order.access_token}`)} style={{width:'100%',padding:'11px',background:p,color:'white',border:'none',cursor:'pointer',borderRadius:14,fontSize:13,fontWeight:700,fontFamily:theme.fontFamily}}>📱 {tRaw('ดูคำสั่งซื้อ','View My Order')}</button>
                }
                <button onClick={()=>navigate('/products')} style={{width:'100%',padding:'11px',background:'transparent',border:`1.5px solid ${p}30`,color:p,cursor:'pointer',borderRadius:14,fontSize:13,fontWeight:600,fontFamily:theme.fontFamily}}>{tRaw('ช้อปต่อ','Continue Shopping')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Info step ────────────────────────────────────────────────────────
  return (
    <div style={{background:theme.bgColor,minHeight:'70vh',fontFamily:theme.fontFamily}}>
      <style>{`@media(max-width:640px){.cg2{grid-template-columns:1fr!important;}.cs2{position:static!important;}.cn{grid-template-columns:1fr!important;}}`}</style>
      <div style={{maxWidth:860,margin:'0 auto',padding:'24px 16px'}}>
        <h1 style={{fontSize:26,fontWeight:900,color:theme.textColor,marginBottom:20}}>{tRaw('ชำระเงิน','Checkout')} 🛍️</h1>
        <div className="cg2" style={{display:'grid',gridTemplateColumns:'1fr 290px',gap:20,alignItems:'start'}}>

          {/* Form */}
          <div style={{background:'white',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <h3 style={{fontSize:14,fontWeight:800,color:theme.textColor,marginBottom:16}}>
              {user ? `👤 ${tRaw('ข้อมูลของคุณ','Your Info')}` : `🛒 ${tRaw('ข้อมูลผู้ซื้อ','Guest Checkout')}`}
            </h3>
            <div className="cn" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>{inp(tRaw('ชื่อ','First Name'), firstName, setFirstName, tRaw('ชื่อ','First name'))}</div>
              <div>{inp(tRaw('นามสกุล','Last Name'), lastName, setLastName, tRaw('นามสกุล','Last name'), false)}</div>
            </div>
            {inp(tRaw('อีเมล','Email'), email, setEmail, 'your@email.com', true, 'email')}

            {hasPhysical && (
              <>
                <h4 style={{fontSize:13,fontWeight:800,color:theme.textColor,margin:'14px 0 12px'}}>📦 {tRaw('ที่อยู่จัดส่ง','Shipping Address')}</h4>
                {inp(tRaw('เบอร์โทร','Phone'), phone, setPhone, '08x-xxx-xxxx')}
                {inp(tRaw('ที่อยู่','Address'), address, setAddress, tRaw('บ้านเลขที่ ถนน','Street address'))}
                <div className="cn" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>{inp(tRaw('จังหวัด','Province'), province, setProvince, tRaw('กรุงเทพฯ','Bangkok'))}</div>
                  <div>{inp(tRaw('รหัสไปรษณีย์','Postal Code'), postalCode, setPostalCode, '10000', false)}</div>
                </div>
              </>
            )}

            {error && <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:11,padding:'9px 13px',marginBottom:14,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}
            <button onClick={placeOrder} disabled={busy}
              style={{width:'100%',padding:'14px',background:busy?p+'88':p,color:'white',border:'none',cursor:busy?'wait':'pointer',borderRadius:16,fontSize:15,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:`0 6px 20px ${p}40`,marginTop:4}}>
              {busy ? '⏳...' : tRaw('สั่งซื้อ & ดู QR →','Place Order & Pay →')}
            </button>
          </div>

          {/* Summary */}
          <div className="cs2" style={{background:'white',borderRadius:18,padding:18,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',position:'sticky' as const,top:80}}>
            <h3 style={{fontSize:14,fontWeight:800,color:theme.textColor,marginBottom:14}}>{tRaw('สรุปคำสั่งซื้อ','Summary')}</h3>
            {items.map((i,idx)=>(
              <div key={idx} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:9}}>
                <span style={{fontSize:22,flexShrink:0}}>{i.image}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:theme.textColor,overflow:'hidden',whiteSpace:'nowrap' as const,textOverflow:'ellipsis'}}>{i.title}</div>
                  <div style={{fontSize:10,color:'#6b7280'}}>{i.optionName} × {i.qty}</div>
                </div>
                <span style={{fontSize:12,fontWeight:800,color:theme.textColor,flexShrink:0}}>฿{(i.unitPriceTHB*i.qty).toLocaleString('th-TH')}</span>
              </div>
            ))}
            <div style={{height:1,background:p+'15',margin:'10px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:theme.textColor+'88',marginBottom:4}}>
              <span>{tRaw('ราคาสินค้า','Subtotal')}</span>
              <span>฿{subtotalTHB.toLocaleString('th-TH')}</span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:theme.textColor+'88',marginBottom:4}}>
              <span>{tRaw('ค่าจัดส่ง','Shipping')}</span>
              <span style={{color:shippingTHB===0?'#10b981':'inherit',fontWeight:600}}>
                {shippingTHB===0 ? tRaw('ฟรี','Free') : `฿${shippingTHB}`}
              </span>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,color:theme.textColor,fontSize:17,marginTop:8,paddingTop:8,borderTop:`1px solid ${p}15`}}>
              <span>{tRaw('ยอดรวม','Total')}</span>
              <span style={{color:p}}>฿{totalTHB.toLocaleString('th-TH')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
