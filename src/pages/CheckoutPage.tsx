import React, { useState } from 'react';
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

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [country, setCountry] = useState('');
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [step, setStep] = useState<'info'|'pending'|'success'>('info');
  const [orderId, setOrderId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hasPhysical = items.some(i => (i as any).type === 'physical');
  const discount = promoApplied ? Math.round(total * 0.15 * 100) / 100 : 0;
  const finalTotal = Math.round((total - discount) * 100) / 100;

  if (items.length === 0 && step === 'info') {
    return (
      <div style={{ textAlign:'center', padding:'80px 24px', fontFamily:theme.fontFamily }}>
        <div style={{ fontSize:64 }}>🛒</div>
        <h2 style={{ color:theme.textColor }}>Your cart is empty</h2>
        <button onClick={()=>navigate('/products')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'12px 28px', borderRadius:20, marginTop:20, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>Shop Now</button>
      </div>
    );
  }

  const inp = (label:string, val:string, set:(v:string)=>void, placeholder='', required=true, type='text') => (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:700, color:theme.textColor, marginBottom:6 }}>{label}{required&&<span style={{color:'#ef4444'}}> *</span>}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }}
        onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')}
      />
    </div>
  );

  const placeOrder = async () => {
    setError(''); setBusy(true);
    if (!name || !email) { setError('Name and email are required.'); setBusy(false); return; }
    if (hasPhysical && (!phone || !address || !city || !country)) {
      setError('Please fill in all shipping details.'); setBusy(false); return;
    }
    try {
      const orderData = {
        items: items.map(i => ({ productId: i.id })),
        customerName: name, customerEmail: email,
        customerPhone: phone || undefined,
        shippingAddress: hasPhysical ? { address, city, zip, country } : undefined,
        promoCode: promoApplied ? 'FLUFFY15' : undefined,
      };
      const order = await api.createOrder(orderData);
      if (order.error) { setError(order.error); setBusy(false); return; }
      setOrderId(order.id);
      setOrderRef(order.id.slice(-8).toUpperCase());
      clear();
      setStep('pending');
    } catch { setError('Something went wrong. Please try again.'); }
    setBusy(false);
  };

  // Step: pending payment — show payment instructions
  if (step === 'pending') {
    return (
      <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:theme.fontFamily, background:theme.bgColor }}>
        <div style={{ background:'white', borderRadius:28, padding:'44px', maxWidth:500, width:'100%', boxShadow:`0 8px 32px ${p}18`, border:`1.5px solid ${p}20`, textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🧾</div>
          <h2 style={{ fontSize:24, fontWeight:900, color:theme.textColor, marginBottom:8 }}>Order Received!</h2>
          <p style={{ color:'#64748b', marginBottom:20, fontSize:14 }}>
            Order reference: <strong style={{color:p}}>#{orderRef}</strong>
          </p>

          <div style={{ background:'#fef3c7', border:'1.5px solid #fcd34d', borderRadius:16, padding:'20px', marginBottom:24, textAlign:'left' }}>
            <div style={{ fontWeight:800, color:'#92400e', marginBottom:10, fontSize:15 }}>💳 Payment Instructions</div>
            <div style={{ fontSize:13, color:'#78350f', lineHeight:1.8 }}>
              <div>Please transfer <strong>${finalTotal}</strong> to:</div>
              <div style={{ marginTop:8, background:'white', borderRadius:10, padding:'10px 14px' }}>
                <div>Bank: <strong>Bangkok Bank</strong></div>
                <div>Account: <strong>123-4-56789-0</strong></div>
                <div>Name: <strong>Fluffy Pub Co.</strong></div>
              </div>
              <div style={{ marginTop:10 }}>After payment, reply to your confirmation email with your payment slip. Your order will be processed within 24 hours.</div>
            </div>
          </div>

          <div style={{ background:p+'10', borderRadius:14, padding:'14px 18px', marginBottom:24, fontSize:13, color:theme.textColor }}>
            {hasPhysical ? (
              <>📦 Physical order — we'll notify you when it ships.<br/>Tracking info will be sent to <strong>{email}</strong></>
            ) : (
              <>⬇️ Digital order — download links will be sent to <strong>{email}</strong> once payment is confirmed.</>
            )}
          </div>

          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            {user && <button onClick={()=>navigate('/account')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'11px 24px', borderRadius:20, fontSize:14, fontWeight:700, fontFamily:theme.fontFamily }}>View My Orders</button>}
            <button onClick={()=>navigate('/products')} style={{ background:'transparent', border:`1.5px solid ${p}30`, color:p, cursor:'pointer', padding:'11px 24px', borderRadius:20, fontSize:14, fontWeight:700, fontFamily:theme.fontFamily }}>Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:theme.bgColor, minHeight:'70vh', fontFamily:theme.fontFamily }}>
      <div style={{ maxWidth:860, margin:'0 auto', padding:'36px 24px' }}>
        <h1 style={{ fontSize:32, fontWeight:900, color:theme.textColor, marginBottom:28 }}>Checkout 🛍️</h1>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:24, alignItems:'start' }}>
          <div style={{ background:'white', borderRadius:20, padding:28, boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize:17, fontWeight:800, color:theme.textColor, marginBottom:20 }}>Contact Information</h3>
            {inp('Full Name', name, setName, 'Your name')}
            {inp('Email', email, setEmail, 'your@email.com', true, 'email')}

            {hasPhysical && <>
              <h3 style={{ fontSize:17, fontWeight:800, color:theme.textColor, margin:'20px 0 16px' }}>Shipping Address</h3>
              {inp('Phone', phone, setPhone, '+66 8x xxx xxxx')}
              {inp('Street Address', address, setAddress, '123 Main St')}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>{inp('City', city, setCity, 'Bangkok')}</div>
                <div>{inp('ZIP / Postal Code', zip, setZip, '10110', false)}</div>
              </div>
              {inp('Country', country, setCountry, 'Thailand')}
            </>}

            {error && <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}

            <button onClick={placeOrder} disabled={busy} style={{ width:'100%', padding:'15px', background:busy?p+'88':p, color:'white', border:'none', cursor:busy?'wait':'pointer', borderRadius:16, fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44` }}>
              {busy ? '⏳ Placing order...' : 'Place Order →'}
            </button>

            <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', marginTop:12 }}>
              You'll receive payment instructions after placing your order.
            </p>
          </div>

          {/* Order summary */}
          <div style={{ background:'white', borderRadius:20, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', position:'sticky', top:80 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:theme.textColor, marginBottom:16 }}>Order Summary</h3>
            {items.map(i=>(
              <div key={i.id} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:28 }}>{i.image}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:theme.textColor }}>{i.title}</div>
                  <div style={{ fontSize:11, color:'#888' }}>{i.artist} · {(i as any).type === 'physical' ? '📦 Physical' : '⬇️ Digital'}</div>
                </div>
                <span style={{ fontWeight:800, color:theme.textColor, fontSize:14 }}>${i.price}</span>
              </div>
            ))}
            <div style={{ height:1, background:p+'15', margin:'12px 0' }}/>
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              <input value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Promo code (FLUFFY15)"
                style={{ flex:1, padding:'9px 12px', borderRadius:11, border:`1.5px solid ${p}30`, fontSize:13, outline:'none', fontFamily:theme.fontFamily }}
              />
              <button onClick={()=>{
                setPromoError('');
                if (promo.toUpperCase() === 'FLUFFY15') { setPromoApplied(true); }
                else { setPromoError('Invalid code.'); }
              }} style={{ background:p+'15', border:`1.5px solid ${p}30`, color:p, cursor:'pointer', padding:'9px 14px', borderRadius:11, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>Apply</button>
            </div>
            {promoApplied && <div style={{ fontSize:12, color:'#10b981', fontWeight:700, marginBottom:10 }}>✓ FLUFFY15 — 15% off!</div>}
            {promoError && <div style={{ fontSize:12, color:'#ef4444', marginBottom:10 }}>{promoError}</div>}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:theme.textColor+'88', marginBottom:6 }}><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
            {discount>0 && <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#10b981', fontWeight:700, marginBottom:6 }}><span>Discount</span><span>-${discount}</span></div>}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:theme.textColor+'88', marginBottom:12 }}><span>Delivery</span><span style={{ color:'#10b981', fontWeight:700 }}>FREE</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:900, color:theme.textColor, fontSize:18 }}><span>Total</span><span>${finalTotal}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
