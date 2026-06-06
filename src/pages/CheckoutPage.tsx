import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

export default function CheckoutPage() {
  const { theme } = useTheme();
  const { items, total, clear } = useCart();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const { lang, t, tRaw, price: fmtPrice } = useLang();
  const p = theme.primaryColor;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState(user?.email || '');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [province, setProvince]   = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry]     = useState(lang === 'th' ? 'Thailand' : 'Thailand');
  const [promo, setPromo]         = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError]     = useState('');
  const [error, setError]               = useState('');
  const [busy, setBusy]                 = useState(false);
  const [step, setStep]                 = useState<'info'|'payment'>('info');
  const [order, setOrder]               = useState<any>(null);
  const [qrDataUrl, setQrDataUrl]       = useState('');
  const [qrLoading, setQrLoading]       = useState(false);
  const [slipUploading, setSlipUploading] = useState(false);
  const [slipUrl, setSlipUrl]           = useState('');

  const hasPhysical = items.some(i => (i as any).type === 'physical');
  const hasDigital  = items.some(i => (i as any).type !== 'physical');
  const discount    = promoApplied ? Math.round(total * 0.15 * 100) / 100 : 0;
  const finalTotalUSD = Math.round((total - discount) * 100) / 100;
  // THB amount: use price_thb from items if available, else multiply by 35
  const subtotalTHB = Math.round(items.reduce((s, i) => {
    const itemTHB = (i as any).price_thb || (i.price * 35);
    return s + itemTHB;
  }, 0) * (promoApplied ? 0.85 : 1));
  // Shipping: 25 THB for 1 physical, free for 2+
  const physicalCount = items.filter(i => (i as any).type === 'physical').length;
  const shippingTHB = physicalCount === 1 ? 25 : 0;
  const finalTotalTHB = subtotalTHB + shippingTHB;

  // Display amount based on language
  const displayTotal = lang === 'th' ? finalTotalTHB : finalTotalUSD;
  const displayCurrency = lang === 'th' ? 'THB' : 'USD';

  useEffect(() => {
    if (!user) return;
    if (user.first_name) setFirstName(user.first_name);
    else if (user.name) { const pts = user.name.split(' '); setFirstName(pts[0]||''); setLastName(pts.slice(1).join(' ')||''); }
    if (user.last_name) setLastName(user.last_name);
    setEmail(user.delivery_email || user.email || '');
    if (user.phone) setPhone(user.phone);
    if (user.shipping_address) {
      const sa = user.shipping_address;
      if (sa.address) setAddress(sa.address);
      if (sa.province) setProvince(sa.province);
      if (sa.postal_code || sa.zip) setPostalCode(sa.postal_code || sa.zip || '');
      if (sa.country) setCountry(sa.country);
    }
  }, [user]);

  // Load PromptPay QR after order created
  useEffect(() => {
    if (step === 'payment' && order) {
      const amt = order.total_thb || order.total_amount || finalTotalTHB;
      if (amt > 0) {
        setQrLoading(true);
        fetch(`/api/promptpay?amount=${amt}`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('fluffy_token')}` },
        }).then(r=>r.json()).then(d => {
          if (d.qrDataUrl) setQrDataUrl(d.qrDataUrl);
        }).catch(()=>{}).finally(()=>setQrLoading(false));
      }
    }
  }, [step, order]);

  if (items.length === 0 && step === 'info') {
    return (
      <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
        <div style={{fontSize:64}}>🛒</div>
        <h2 style={{color:theme.textColor}}>{tRaw('ตะกร้าว่างเปล่า','Your cart is empty')}</h2>
        <button onClick={()=>navigate('/products')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:20,marginTop:20,fontSize:15,fontWeight:700,fontFamily:theme.fontFamily}}>
          {t('shop')}
        </button>
      </div>
    );
  }

  const inp = (label:string, val:string, set:(v:string)=>void, placeholder='', required=true, type='text') => (
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
    setError(''); setBusy(true);
    if (!firstName || !email) { setError(tRaw('กรุณากรอกชื่อและอีเมล','First name and email are required.')); setBusy(false); return; }
    if (hasPhysical && (!phone || !address || !province)) {
      setError(tRaw('กรุณากรอกข้อมูลจัดส่งให้ครบ','Please fill in all shipping details.')); setBusy(false); return;
    }
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const orderData = {
        items: items.map(i => ({ productId: i.id, variant: (i as any).variant || null })),
        customerName: fullName || email,
        customerEmail: email,
        customerPhone: phone || undefined,
        shippingAddress: hasPhysical ? { address, province, postal_code: postalCode, country } : undefined,
        promoCode: promoApplied ? 'FLUFFY15' : undefined,
        total_thb: finalTotalTHB,
        total_usd: finalTotalUSD,
      };
      const result = await api.createOrder(orderData);
      if (result.error) { setError(result.error); setBusy(false); return; }
      clear();
      setOrder(result);
      setStep('payment');
    } catch { setError(tRaw('เกิดข้อผิดพลาด กรุณาลองใหม่','Something went wrong. Please try again.')); }
    setBusy(false);
  };

  // Upload payment slip
  const uploadSlip = async (file: File) => {
    if (!order) return;
    setSlipUploading(true);
    try {
      const result = await api.uploadFile(file, 'slips');
      if (result.error) { alert(tRaw('อัปโหลดไม่สำเร็จ', 'Upload failed')); return; }
      // Save slip URL to order
      await fetch(`/api/orders?action=slip&id=${order.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('fluffy_token')}` },
        body: JSON.stringify({ slip_url: result.publicUrl }),
      });
      setSlipUrl(result.publicUrl);
    } catch { alert('Upload failed'); }
    setSlipUploading(false);
  };

  // ── Payment step ────────────────────────────────────────────────────────
  if (step === 'payment' && order) {
    const orderRef = (order.id || '').slice(-8).toUpperCase();
    const payAmt = order.total_thb || order.total_amount || finalTotalTHB;

    return (
      <div style={{background:theme.bgColor,fontFamily:theme.fontFamily,padding:'24px 16px',minHeight:'70vh'}}>
        <style>{`@media(max-width:640px){.pay-grid{grid-template-columns:1fr!important;}}`}</style>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <h1 style={{fontSize:24,fontWeight:900,color:theme.textColor,marginBottom:6}}>
            🧾 {t('order_placed')}
          </h1>
          <p style={{color:'#64748b',marginBottom:20}}>
            {t('order_number')}: <strong style={{color:p}}>#{orderRef}</strong>
          </p>

          <div className="pay-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
            {/* QR Code */}
            <div style={{background:'white',borderRadius:20,padding:24,boxShadow:`0 4px 20px ${p}12`,textAlign:'center' as const}}>
              <h3 style={{fontSize:16,fontWeight:800,color:theme.textColor,marginBottom:4}}>
                💳 PromptPay QR
              </h3>
              <p style={{fontSize:12,color:'#64748b',marginBottom:16}}>
                {tRaw('สแกนด้วยแอปธนาคาร','Scan with banking app')}
              </p>

              {qrLoading ? (
                <div style={{width:200,height:200,margin:'0 auto',background:'#f3f4f6',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>
              ) : qrDataUrl ? (
                <div>
                  <img src={qrDataUrl} alt="PromptPay QR" style={{width:200,height:200,margin:'0 auto',display:'block',borderRadius:12,boxShadow:'0 4px 16px rgba(0,0,0,0.1)'}} />
                  <div style={{marginTop:12,fontSize:18,fontWeight:900,color:theme.textColor}}>
                    ฿{Number(payAmt).toLocaleString('th-TH')}
                  </div>
                  <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>
                    {tRaw('จำนวนเงิน','Amount')}: ฿{Number(payAmt).toLocaleString('th-TH')} THB
                  </div>
                </div>
              ) : (
                <div style={{background:'#fef3c7',borderRadius:12,padding:16,fontSize:13,color:'#92400e'}}>
                  {tRaw('ไม่พบการตั้งค่า PromptPay','PromptPay not configured')}
                </div>
              )}

              {/* Upload slip */}
              <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid #f3f4f6'}}>
                <div style={{fontSize:13,fontWeight:700,color:theme.textColor,marginBottom:8}}>
                  {t('upload_slip')}
                </div>
                {slipUrl ? (
                  <div style={{background:'#d1fae5',borderRadius:10,padding:'8px 12px',fontSize:12,color:'#065f46',fontWeight:600}}>
                    ✅ {tRaw('อัปโหลดสลิปแล้ว','Slip uploaded!')}
                  </div>
                ) : (
                  <label style={{display:'block',cursor:'pointer'}}>
                    <div style={{background:p+'15',border:`2px dashed ${p}40`,borderRadius:12,padding:'12px',fontSize:12,color:p,fontWeight:600}}>
                      {slipUploading ? '⏳...' : `📷 ${tRaw('อัปโหลดสลิปการโอนเงิน','Upload transfer slip')}`}
                    </div>
                    <input type="file" accept="image/*" style={{display:'none'}}
                      onChange={e=>{const f=e.target.files?.[0]; if(f)uploadSlip(f);}} />
                  </label>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div style={{background:'white',borderRadius:20,padding:24,boxShadow:`0 4px 20px ${p}12`}}>
              <h3 style={{fontSize:15,fontWeight:800,color:theme.textColor,marginBottom:14}}>
                📋 {t('payment_instructions')}
              </h3>
              <div style={{display:'flex',flexDirection:'column' as const,gap:10}}>
                {[
                  tRaw('สแกน QR Code ด้วยแอปธนาคาร','Scan QR with your banking app'),
                  tRaw(`โอนเงิน ฿${Number(payAmt).toLocaleString('th-TH')} บาท`,`Transfer ฿${Number(payAmt).toLocaleString('th-TH')} THB`),
                  tRaw('ถ่ายรูปสลิปและอัปโหลด','Screenshot slip and upload above'),
                  tRaw('รอการยืนยันจากร้านค้า','Wait for order confirmation'),
                ].map((step,i)=>(
                  <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:p,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,flexShrink:0}}>{i+1}</div>
                    <div style={{fontSize:13,color:theme.textColor,paddingTop:2,lineHeight:1.5}}>{step}</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:16,padding:'12px 14px',background:p+'10',borderRadius:12,fontSize:12,color:theme.textColor}}>
                {hasDigital && !hasPhysical && tRaw('ลิงค์ดาวน์โหลดจะส่งให้ทางอีเมลหลังยืนยันการชำระ','Download links will be sent after payment confirmed.')}
                {hasPhysical && !hasDigital && tRaw('สินค้าจะจัดส่งภายใน 2-5 วันหลังยืนยันการชำระ','Physical order ships within 2-5 days after payment.')}
                {hasPhysical && hasDigital && tRaw('ไฟล์ดิจิทัลส่งทางอีเมล + จัดส่งสินค้าหลังยืนยัน','Digital sent by email + physical ships after payment.')}
              </div>

              <div style={{marginTop:16,display:'flex',flexDirection:'column' as const,gap:8}}>
                {user && <button onClick={()=>navigate('/account')} style={{width:'100%',padding:'12px',background:p,color:'white',border:'none',cursor:'pointer',borderRadius:14,fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>{t('view_orders')}</button>}
                <button onClick={()=>navigate('/products')} style={{width:'100%',padding:'12px',background:'transparent',border:`1.5px solid ${p}30`,color:p,cursor:'pointer',borderRadius:14,fontSize:13,fontWeight:600,fontFamily:theme.fontFamily}}>{t('continue_shopping')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Info step ────────────────────────────────────────────────────────────
  return (
    <div style={{background:theme.bgColor,minHeight:'70vh',fontFamily:theme.fontFamily}}>
      <style>{`
        @media(max-width:640px){
          .co-grid{grid-template-columns:1fr!important;}
          .co-summary{position:static!important;}
          .co-name-grid{grid-template-columns:1fr!important;}
        }
      `}</style>
      <div style={{maxWidth:880,margin:'0 auto',padding:'24px 16px'}}>
        <h1 style={{fontSize:26,fontWeight:900,color:theme.textColor,marginBottom:20}}>{t('checkout')} 🛍️</h1>
        <div className="co-grid" style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20,alignItems:'start'}}>

          <div style={{background:'white',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <h3 style={{fontSize:15,fontWeight:800,color:theme.textColor,marginBottom:16}}>
              {user ? `👤 ${tRaw('ข้อมูลของคุณ','Your Information')}` : `🛒 ${tRaw('ชำระในฐานะแขก','Guest Checkout')}`}
            </h3>
            <div className="co-name-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>{inp(t('first_name'), firstName, setFirstName, tRaw('ชื่อ','First name'))}</div>
              <div>{inp(t('last_name'), lastName, setLastName, tRaw('นามสกุล','Last name'), false)}</div>
            </div>
            {inp(t('email'), email, setEmail, 'your@email.com', true, 'email')}

            {hasPhysical && (
              <>
                <h3 style={{fontSize:14,fontWeight:800,color:theme.textColor,margin:'14px 0 12px'}}>
                  📦 {tRaw('ที่อยู่จัดส่ง','Shipping Address')}
                </h3>
                {inp(t('phone'), phone, setPhone, tRaw('08x-xxx-xxxx','08x-xxx-xxxx'))}
                {inp(t('address'), address, setAddress, tRaw('บ้านเลขที่ ถนน','Street address'))}
                <div className="co-name-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>{inp(t('province'), province, setProvince, tRaw('จังหวัด','Province'))}</div>
                  <div>{inp(t('postal_code'), postalCode, setPostalCode, tRaw('รหัสไปรษณีย์','Postal code'))}</div>
                </div>
                {inp(t('country'), country, setCountry, 'Thailand')}
              </>
            )}

            {error && <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:11,padding:'9px 13px',marginBottom:14,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>}

            <button onClick={placeOrder} disabled={busy}
              style={{width:'100%',padding:'14px',background:busy?p+'88':p,color:'white',border:'none',cursor:busy?'wait':'pointer',borderRadius:16,fontSize:15,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:`0 6px 20px ${p}40`,marginTop:4}}>
              {busy ? '⏳...' : t('place_order')}
            </button>
            <p style={{textAlign:'center' as const,fontSize:11,color:'#94a3b8',marginTop:8}}>
              {tRaw('QR PromptPay จะแสดงหน้าถัดไป','PromptPay QR will appear next.')}
            </p>
          </div>

          {/* Summary */}
          <div className="co-summary" style={{background:'white',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',position:'sticky' as const,top:80}}>
            <h3 style={{fontSize:14,fontWeight:800,color:theme.textColor,marginBottom:14}}>
              {tRaw('สรุปคำสั่งซื้อ','Order Summary')}
            </h3>
            {items.map((i,idx) => (
              <div key={idx} style={{display:'flex',gap:8,alignItems:'flex-start',marginBottom:10}}>
                <span style={{fontSize:22,flexShrink:0}}>{i.image}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:theme.textColor,wordBreak:'break-word' as const}}>{i.title}</div>
                  {(i as any).variant && <div style={{fontSize:10,color:p,fontWeight:600}}>{(i as any).variant.name}</div>}
                </div>
                <span style={{fontWeight:800,color:theme.textColor,fontSize:12,flexShrink:0}}>
                  {fmtPrice((i as any).price_thb, (i as any).price_usd, i.price)}
                </span>
              </div>
            ))}
            <div style={{height:1,background:p+'15',margin:'10px 0'}} />
            {/* Promo code */}
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              <input value={promo} onChange={e=>setPromo(e.target.value)} placeholder="FLUFFY15"
                style={{flex:1,padding:'7px 10px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:12,outline:'none',fontFamily:theme.fontFamily}} />
              <button onClick={()=>{setPromoError('');if(promo.toUpperCase()==='FLUFFY15'){setPromoApplied(true);}else{setPromoError(tRaw('โค้ดไม่ถูกต้อง','Invalid code.'));}}}
                style={{background:p+'15',border:`1.5px solid ${p}30`,color:p,cursor:'pointer',padding:'7px 10px',borderRadius:10,fontSize:12,fontWeight:700,fontFamily:theme.fontFamily}}>
                {tRaw('ใช้','Apply')}
              </button>
            </div>
            {promoApplied && <div style={{fontSize:11,color:'#10b981',fontWeight:700,marginBottom:8}}>✓ FLUFFY15 — 15% off!</div>}
            {promoError && <div style={{fontSize:11,color:'#ef4444',marginBottom:8}}>{promoError}</div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:theme.textColor+'88',marginBottom:4}}>
              <span>{t('subtotal')}</span>
              <span>{lang==='th'?`฿${finalTotalTHB.toLocaleString('th-TH')}` : `$${total.toFixed(2)}`}</span>
            </div>
            {promoApplied && <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#10b981',fontWeight:700,marginBottom:4}}><span>{t('discount')}</span><span>-15%</span></div>}
            {shippingTHB>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#64748b',marginTop:4}}><span>{lang==='th'?'ค่าจัดส่ง':'Shipping'}</span><span>{lang==='th'?`฿${shippingTHB}`:'฿25'}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,color:theme.textColor,fontSize:16,marginTop:8,borderTop:'1px solid #f3f4f6',paddingTop:8}}>
              <span>{t('total')}</span>
              <span>{lang==='th'?`฿${finalTotalTHB.toLocaleString('th-TH')}`:`$${finalTotalUSD.toFixed(2)}`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
