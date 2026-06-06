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
  const [step, setStep] = useState<'info'|'payment'|'success'>('info');
  const [orderId, setOrderId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const hasPhysical = items.some(i => (i as any).type === 'physical');
  const discount = promoApplied ? Math.round(total * 0.15 * 100) / 100 : 0;
  const finalTotal = Math.round((total - discount) * 100) / 100;

  if (items.length === 0 && step !== 'success') {
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
    try {
      const orderData = {
        items: items.map(i => ({ productId: i.id })),
        customerName: name, customerEmail: email,
        customerPhone: hasPhysical ? phone : undefined,
        shippingAddress: hasPhysical ? { address, city, zip, country } : undefined,
        promoCode: promoApplied ? 'FLUFFY15' : undefined,
      };
      const order = await api.createOrder(orderData);
      if (order.error) { setError(order.error); setBusy(false); return; }
      setOrderId(order.id);
      setStep('payment');
    } catch { setError('Something went wrong. Please try again.'); }
    setBusy(false);
  };

  const pay = async () => {
    setBusy(true);
    try {
      await api.payOrder(orderId);
      clear();
      setStep('success');
    } catch { setError('Payment failed. Please try again.'); }
    setBusy(false);
  };

  if (step === 'success') {
    return (
      <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24, fontFamily:theme.fontFamily }}>
        <div style={{ background:'white', borderRadius:28, padding:'48px 44px', maxWidth:440, boxShadow:`0 8px 32px ${p}18`, border:`1.5px solid ${p}20` }}>
          <div style={{ fontSize:72, marginBottom:16 }}>🎉</div>
          <h2 style={{ fontSize:26, fontWeight:900, color:theme.textColor, marginBottom:8 }}>Order Confirmed!</h2>
          <p style={{ color:theme.textColor+'88', marginBottom:8 }}>Order ID: <strong>#{orderId.slice(-8).toUpperCase()}</strong></p>
          <p style={{ color:theme.textColor+'88', marginBottom:28, fontSize:14 }}>
            {hasPhysical ? 'Your order is being packed and will ship soon. You\'ll receive tracking information via email.' : 'Your PDF downloads are ready! Check your email for the download link.'}
          </p>
          {!hasPhysical && (
            <div style={{ background:p+'12', border:`1.5px solid ${p}30`, borderRadius:16, padding:16, marginBottom:24 }}>
              <div style={{ fontSize:28, marginBottom:8 }}>⬇️</div>
              <div style={{ fontWeight:700, color:theme.textColor, marginBottom:4 }}>Digital Downloads Ready</div>
              <div style={{ fontSize:13, color:theme.textColor+'88' }}>Download links sent to {email}</div>
            </div>
          )}
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            {user && <button onClick={()=>navigate('/account/orders')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'11px 24px', borderRadius:20, fontSize:14, fontWeight:700, fontFamily:theme.fontFamily }}>View Orders</button>}
            <button onClick={()=>navigate('/products')} style={{ background:'transparent', border:`1.5px solid ${p}30`, color:p, cursor:'pointer', padding:'11px 24px', borderRadius:20, fontSize:14, fontWeight:700, fontFamily:theme.fontFamily }}>Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'payment') {
    return (
      <div style={{ minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, fontFamily:theme.fontFamily }}>
        <div style={{ background:'white', borderRadius:24, padding:'40px', maxWidth:460, width:'100%', boxShadow:`0 8px 32px ${p}18`, border:`1.5px solid ${p}20` }}>
          <h2 style={{ fontSize:22, fontWeight:900, color:theme.textColor, marginBottom:24 }}>💳 Payment</h2>
          <div style={{ background:'#f8fafc', borderRadius:14, padding:16, marginBottom:24 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#888', marginBottom:10 }}>ORDER SUMMARY</div>
            {items.map(i=>(
              <div key={i.id} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:14 }}>
                <span style={{ color:theme.textColor }}>{i.title}</span>
                <span style={{ fontWeight:700, color:theme.textColor }}>${i.price}</span>
              </div>
            ))}
            {discount>0&&<div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#10b981', fontWeight:700, marginTop:4 }}><span>FLUFFY15 discount</span><span>-${discount}</span></div>}
            <div style={{ height:1, background:p+'15', margin:'10px 0' }}/>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:900, color:theme.textColor, fontSize:18 }}>
              <span>Total</span><span>${finalTotal}</span>
            </div>
          </div>
          <div style={{ background:'#fef3c7', borderRadius:12, padding:'12px 16px', marginBottom:24, fontSize:13, color:'#92400e', fontWeight:600 }}>
            🧪 This is a demo. Click "Complete Payment" to simulate a successful payment.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
            {[['💳','Card'],['🏦','Bank Transfer'],['📱','Digital Wallet'],['₿','Crypto']].map(([icon,label])=>(
              <button key={label} style={{ padding:'10px', borderRadius:12, border:`1.5px solid ${p}25`, background:label==='Card'?p+'10':'transparent', fontSize:13, fontWeight:600, color:theme.textColor, cursor:'pointer', fontFamily:theme.fontFamily }}>{icon} {label}</button>
            ))}
          </div>
          {error&&<div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}
          <button onClick={pay} disabled={busy} style={{ width:'100%', padding:'15px', background:busy?p+'88':p, color:'white', border:'none', cursor:busy?'wait':'pointer', borderRadius:16, fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44`, marginBottom:10 }}>
            {busy?'⏳ Processing...':'✓ Complete Payment — $'+finalTotal}
          </button>
          <button onClick={()=>setStep('info')} style={{ width:'100%', padding:'10px', background:'transparent', border:`1.5px solid ${p}20`, color:theme.textColor+'88', cursor:'pointer', borderRadius:14, fontSize:13, fontWeight:600, fontFamily:theme.fontFamily }}>← Back to Details</button>
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
              {inp('Phone', phone, setPhone, '+1 (555) 000-0000')}
              {inp('Street Address', address, setAddress, '123 Main St')}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>{inp('City', city, setCity, 'New York')}</div>
                <div>{inp('ZIP / Postal Code', zip, setZip, '10001')}</div>
              </div>
              {inp('Country', country, setCountry, 'United States')}
            </>}
            {error&&<div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:11, padding:'9px 13px', marginBottom:16, fontSize:13, color:'#dc2626', fontWeight:600 }}>⚠️ {error}</div>}
            <button onClick={placeOrder} disabled={busy} style={{ width:'100%', padding:'15px', background:busy?p+'88':p, color:'white', border:'none', cursor:busy?'wait':'pointer', borderRadius:16, fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44` }}>
              {busy?'⏳ Please wait...':'Continue to Payment →'}
            </button>
          </div>

          {/* Order summary */}
          <div style={{ background:'white', borderRadius:20, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', position:'sticky', top:80 }}>
            <h3 style={{ fontSize:16, fontWeight:800, color:theme.textColor, marginBottom:16 }}>Order Summary</h3>
            {items.map(i=>(
              <div key={i.id} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:12 }}>
                <span style={{ fontSize:28 }}>{i.image}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:theme.textColor }}>{i.title}</div>
                  <div style={{ fontSize:12, color:'#888' }}>{i.artist}</div>
                </div>
                <span style={{ fontWeight:800, color:theme.textColor, fontSize:14 }}>${i.price}</span>
              </div>
            ))}
            <div style={{ height:1, background:p+'15', margin:'12px 0' }}/>
            <div style={{ display:'flex', gap:6, marginBottom:12 }}>
              <input value={promo} onChange={e=>setPromo(e.target.value)} placeholder="Promo code"
                style={{ flex:1, padding:'9px 12px', borderRadius:11, border:`1.5px solid ${p}30`, fontSize:13, outline:'none', fontFamily:theme.fontFamily }}
              />
              <button onClick={()=>{ if(promo.toUpperCase()==='FLUFFY15'){setPromoApplied(true);}else{setError('Invalid promo code.');} }} style={{ background:p+'15', border:`1.5px solid ${p}30`, color:p, cursor:'pointer', padding:'9px 14px', borderRadius:11, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>Apply</button>
            </div>
            {promoApplied&&<div style={{ fontSize:12, color:'#10b981', fontWeight:700, marginBottom:10 }}>✓ FLUFFY15 applied — 15% off!</div>}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:theme.textColor+'88', marginBottom:6 }}><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
            {discount>0&&<div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#10b981', fontWeight:700, marginBottom:6 }}><span>Discount</span><span>-${discount}</span></div>}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:theme.textColor+'88', marginBottom:12 }}><span>Delivery</span><span style={{ color:'#10b981', fontWeight:700 }}>FREE</span></div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:900, color:theme.textColor, fontSize:18 }}><span>Total</span><span>${finalTotal}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
