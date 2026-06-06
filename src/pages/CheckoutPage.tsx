import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function CheckoutPage() {
  const { theme } = useTheme();
  const { items, total, clear } = useCart();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const p = theme.primaryColor;

  // Customer info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState(user?.email || '');
  const [phone, setPhone]         = useState('');
  const [address, setAddress]     = useState('');
  const [city, setCity]           = useState('');
  const [zip, setZip]             = useState('');
  const [country, setCountry]     = useState('Thailand');
  const [promo, setPromo]         = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError]     = useState('');
  const [error, setError]               = useState('');
  const [busy, setBusy]                 = useState(false);

  // Steps
  const [step, setStep] = useState<'info'|'payment'>('info');
  const [order, setOrder] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const hasPhysical = items.some(i => (i as any).type === 'physical');
  const hasDigital  = items.some(i => (i as any).type !== 'physical');
  const discount    = promoApplied ? Math.round(total * 0.15 * 100) / 100 : 0;
  const finalTotal  = Math.round((total - discount) * 100) / 100;

  // Pre-fill from saved profile
  useEffect(() => {
    if (!user) return;
    if (user.first_name) setFirstName(user.first_name);
    else if (user.name) { const p = user.name.split(' '); setFirstName(p[0]||''); setLastName(p.slice(1).join(' ')||''); }
    if (user.last_name) setLastName(user.last_name);
    setEmail(user.delivery_email || user.email || '');
    if (user.phone) setPhone(user.phone);
    if (user.shipping_address) {
      const sa = user.shipping_address;
      if (sa.address) setAddress(sa.address);
      if (sa.city) setCity(sa.city);
      if (sa.zip) setZip(sa.zip);
      if (sa.country) setCountry(sa.country);
    }
  }, [user]);

  // Load PromptPay QR after order is created
  useEffect(() => {
    if (step === 'payment' && order && finalTotal > 0) {
      setQrLoading(true);
      fetch(`/api/promptpay?amount=${finalTotal}`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('fluffy_token')}` },
      }).then(r => r.json()).then(d => {
        if (d.qrDataUrl) setQrDataUrl(d.qrDataUrl);
      }).catch(() => {}).finally(() => setQrLoading(false));
    }
  }, [step, order]);

  if (items.length === 0 && step === 'info') {
    return (
      <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
        <div style={{fontSize:64}}>🛒</div>
        <h2 style={{color:theme.textColor}}>Your cart is empty</h2>
        <button onClick={()=>navigate('/products')} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:20,marginTop:20,fontSize:15,fontWeight:700,fontFamily:theme.fontFamily}}>Shop Now</button>
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
    const fullName = `${firstName} ${lastName}`.trim();
    if (!firstName || !email) { setError('First name and email are required.'); setBusy(false); return; }
    if (hasPhysical && (!phone || !address || !city || !country)) {
      setError('Please fill in all shipping details.'); setBusy(false); return;
    }
    try {
      const orderData = {
        items: items.map(i => ({
          productId: i.id,
          variant: (i as any).variant || null,
        })),
        customerName: fullName || email,
        customerEmail: email,
        customerPhone: phone || undefined,
        shippingAddress: hasPhysical ? { address, city, zip, country } : undefined,
        promoCode: promoApplied ? 'FLUFFY15' : undefined,
      };
      const result = await api.createOrder(orderData);
      if (result.error) { setError(result.error); setBusy(false); return; }
      clear();
      setOrder(result);
      setStep('payment');
    } catch { setError('Something went wrong. Please try again.'); }
    setBusy(false);
  };

  // ── Payment step ────────────────────────────────────────────────────────────
  if (step === 'payment' && order) {
    const orderRef = (order.id || '').slice(-8).toUpperCase();
    return (
      <div style={{minHeight:'70vh',background:theme.bgColor,fontFamily:theme.fontFamily,padding:'32px 16px'}}>
        <style>{`
          @media (max-width: 640px) {
            .pay-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
        <div style={{maxWidth:800,margin:'0 auto'}}>
          <h1 style={{fontSize:26,fontWeight:900,color:theme.textColor,marginBottom:6}}>🧾 Order Placed!</h1>
          <p style={{color:'#64748b',marginBottom:24}}>Order reference: <strong style={{color:p}}>#{orderRef}</strong></p>

          <div className="pay-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

            {/* QR Code */}
            <div style={{background:'white',borderRadius:20,padding:28,boxShadow:`0 4px 20px ${p}12`,textAlign:'center' as const}}>
              <h3 style={{fontSize:17,fontWeight:800,color:theme.textColor,marginBottom:4}}>💳 PromptPay QR Code</h3>
              <p style={{fontSize:13,color:'#64748b',marginBottom:20}}>Scan with any banking app</p>

              {qrLoading ? (
                <div style={{width:200,height:200,margin:'0 auto',background:'#f3f4f6',borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>
              ) : qrDataUrl ? (
                <div>
                  <img src={qrDataUrl} alt="PromptPay QR" style={{width:220,height:220,margin:'0 auto',display:'block',borderRadius:12,boxShadow:'0 4px 16px rgba(0,0,0,0.1)'}} />
                  <div style={{marginTop:12,fontSize:15,fontWeight:900,color:theme.textColor}}>
                    ฿{(finalTotal * 35).toFixed(2)} THB
                  </div>
                  <div style={{fontSize:12,color:'#9ca3af',marginTop:4}}>(≈ ${finalTotal} USD)</div>
                </div>
              ) : (
                <div style={{background:'#fef3c7',border:'1.5px solid #fcd34d',borderRadius:14,padding:20}}>
                  <div style={{fontWeight:700,color:'#92400e',marginBottom:8}}>Manual Transfer</div>
                  <div style={{fontSize:13,color:'#78350f',lineHeight:1.8}}>
                    <div>Please set up PROMPTPAY_ID in your environment.</div>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div style={{background:'white',borderRadius:20,padding:24,boxShadow:`0 4px 20px ${p}12`}}>
              <h3 style={{fontSize:16,fontWeight:800,color:theme.textColor,marginBottom:14}}>📋 Payment Instructions</h3>
              <div style={{display:'flex',flexDirection:'column' as const,gap:12}}>
                {[
                  {step:'1',text:'Scan QR code with your banking app'},
                  {step:'2',text:`Transfer ฿${(finalTotal*35).toFixed(2)} THB`},
                  {step:'3',text:'Take a screenshot of the slip'},
                  {step:'4',text:'Wait for order confirmation email'},
                ].map(s=>(
                  <div key={s.step} style={{display:'flex',gap:10,alignItems:'flex-start'}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:p,color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0}}>{s.step}</div>
                    <div style={{fontSize:13,color:theme.textColor,paddingTop:3,lineHeight:1.5}}>{s.text}</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:20,padding:'14px 16px',background:p+'10',borderRadius:12,fontSize:13,color:theme.textColor}}>
                {hasDigital && !hasPhysical && <>⬇️ Download links will be sent to <strong>{email}</strong> after payment confirmed.</>}
                {hasPhysical && !hasDigital && <>📦 Physical order — we'll ship within 2–5 days after payment.</>}
                {hasPhysical && hasDigital && <>📦+⬇️ Both physical and digital — digital link sent after payment, physical ships within 2–5 days.</>}
              </div>

              <div style={{marginTop:16,display:'flex',flexDirection:'column' as const,gap:8}}>
                {user && (
                  <button onClick={()=>navigate('/account')} style={{width:'100%',padding:'12px',background:p,color:'white',border:'none',cursor:'pointer',borderRadius:14,fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>
                    View My Orders
                  </button>
                )}
                <button onClick={()=>navigate('/products')} style={{width:'100%',padding:'12px',background:'transparent',border:`1.5px solid ${p}30`,color:p,cursor:'pointer',borderRadius:14,fontSize:14,fontWeight:600,fontFamily:theme.fontFamily}}>
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Info step ───────────────────────────────────────────────────────────────
  return (
    <div style={{background:theme.bgColor,minHeight:'70vh',fontFamily:theme.fontFamily}}>
      <style>{`
        @media (max-width: 640px) {
          .co-grid { grid-template-columns: 1fr !important; }
          .co-summary { position: static !important; }
        }
      `}</style>
      <div style={{maxWidth:880,margin:'0 auto',padding:'28px 16px'}}>
        <h1 style={{fontSize:28,fontWeight:900,color:theme.textColor,marginBottom:24}}>Checkout 🛍️</h1>
        <div className="co-grid" style={{display:'grid',gridTemplateColumns:'1fr 300px',gap:20,alignItems:'start'}}>

          {/* Form */}
          <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 2px 12px rgba(0,0,0,0.06)'}}>
            <h3 style={{fontSize:16,fontWeight:800,color:theme.textColor,marginBottom:18}}>
              {user ? '👤 Your Information' : '🛒 Guest Checkout'}
            </h3>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>{inp('First Name', firstName, setFirstName, 'First name')}</div>
              <div>{inp('Last Name', lastName, setLastName, 'Last name', false)}</div>
            </div>
            {inp('Email', email, setEmail, 'your@email.com', true, 'email')}

            {hasPhysical && (
              <>
                <h3 style={{fontSize:15,fontWeight:800,color:theme.textColor,margin:'16px 0 14px'}}>📦 Shipping Address</h3>
                {inp('Phone', phone, setPhone, '+66 8x xxx xxxx')}
                {inp('Street Address', address, setAddress, '123 Main St')}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>{inp('City', city, setCity, 'Bangkok')}</div>
                  <div>{inp('ZIP', zip, setZip, '10110', false)}</div>
                </div>
                {inp('Country', country, setCountry, 'Thailand')}
              </>
            )}

            {error && (
              <div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:11,padding:'9px 13px',marginBottom:14,fontSize:13,color:'#dc2626',fontWeight:600}}>⚠️ {error}</div>
            )}

            <button onClick={placeOrder} disabled={busy}
              style={{width:'100%',padding:'14px',background:busy?p+'88':p,color:'white',border:'none',cursor:busy?'wait':'pointer',borderRadius:16,fontSize:16,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:`0 6px 20px ${p}40`,marginTop:4}}>
              {busy ? '⏳ Placing order...' : 'Place Order & Pay →'}
            </button>
            <p style={{textAlign:'center' as const,fontSize:12,color:'#94a3b8',marginTop:10}}>
              PromptPay QR will appear on the next screen.
            </p>
          </div>

          {/* Summary */}
          <div className="co-summary" style={{background:'white',borderRadius:20,padding:20,boxShadow:'0 2px 12px rgba(0,0,0,0.06)',position:'sticky' as const,top:80}}>
            <h3 style={{fontSize:15,fontWeight:800,color:theme.textColor,marginBottom:14}}>Order Summary</h3>
            {items.map((i,idx) => (
              <div key={idx} style={{display:'flex',gap:9,alignItems:'flex-start',marginBottom:10}}>
                <span style={{fontSize:24,flexShrink:0}}>{i.image}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:theme.textColor,wordBreak:'break-word' as const}}>{i.title}</div>
                  {(i as any).variant && <div style={{fontSize:10,color:p,fontWeight:600}}>{(i as any).variant.name}</div>}
                  <div style={{fontSize:10,color:'#888'}}>{i.artist}</div>
                </div>
                <span style={{fontWeight:800,color:theme.textColor,fontSize:13,flexShrink:0}}>${i.price}</span>
              </div>
            ))}

            <div style={{height:1,background:p+'15',margin:'10px 0'}} />
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              <input value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Promo code"
                style={{flex:1,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:12,outline:'none',fontFamily:theme.fontFamily}} />
              <button onClick={()=>{ setPromoError(''); if(promo.toUpperCase()==='FLUFFY15'){setPromoApplied(true);}else{setPromoError('Invalid.');} }}
                style={{background:p+'15',border:`1.5px solid ${p}30`,color:p,cursor:'pointer',padding:'8px 12px',borderRadius:10,fontSize:12,fontWeight:700,fontFamily:theme.fontFamily}}>Apply</button>
            </div>
            {promoApplied && <div style={{fontSize:11,color:'#10b981',fontWeight:700,marginBottom:8}}>✓ FLUFFY15 — 15% off!</div>}
            {promoError && <div style={{fontSize:11,color:'#ef4444',marginBottom:8}}>{promoError}</div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:theme.textColor+'88',marginBottom:4}}><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
            {discount>0 && <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#10b981',fontWeight:700,marginBottom:4}}><span>Discount</span><span>-${discount}</span></div>}
            <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:theme.textColor+'88',marginBottom:10}}><span>Shipping</span><span style={{color:'#10b981',fontWeight:700}}>FREE</span></div>
            <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,color:theme.textColor,fontSize:17}}><span>Total</span><span>${finalTotal}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
