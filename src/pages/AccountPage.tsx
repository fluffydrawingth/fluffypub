import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type Tab = 'orders' | 'favorites' | 'profile';

export default function AccountPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>((route.params?.tab as Tab) || 'orders');
  const p = theme.primaryColor;

  if (!user) {
    React.useEffect(() => { navigate('/login'); }, []);
    return null;
  }

  const tabs = [['orders','📦','Orders'],['favorites','❤️','Favorites'],['profile','👤','Profile']] as const;

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
        {tab==='profile' && <ProfileTab user={user} p={p} theme={theme} refreshUser={refreshUser} />}
      </div>
    </div>
  );
}

function OrdersTab({p,theme}:any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const STATUS_COLORS: Record<string,string> = {
    pending_payment:'#fef3c7', paid:'#d1fae5', packing:'#dbeafe', shipped:'#e0e7ff', delivered:'#d1fae5',
  };
  const STATUS_TEXT: Record<string,string> = {
    pending_payment:'Pending Payment', paid:'Paid', packing:'Packing', shipped:'Shipped', delivered:'Delivered',
  };

  useEffect(() => { api.myOrders().then(o=>{ setOrders(Array.isArray(o)?o:[]); setLoading(false); }); }, []);

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading orders...</div>;
  if (!orders.length) return (
    <div style={{ textAlign:'center', padding:'60px 24px', background:'white', borderRadius:20 }}>
      <div style={{ fontSize:56, marginBottom:14 }}>📦</div>
      <h3 style={{ color:'#1e293b', fontWeight:800 }}>No orders yet</h3>
      <p style={{ color:'#64748b', fontSize:14 }}>Your orders will appear here after you make a purchase.</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {orders.map(o=>(
        <div key={o.id} style={{ background:'white', borderRadius:18, padding:22, boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:800, color:'#1e293b', marginBottom:3 }}>Order #{o.id.slice(-8).toUpperCase()}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>{new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
            <span style={{ background:STATUS_COLORS[o.status]||'#f1f5f9', color:o.status==='delivered'||o.status==='paid'?'#059669':'#d97706', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
              {STATUS_TEXT[o.status]||o.status}
            </span>
          </div>
          {o.items.map((i:any)=>(
            <div key={i.productId} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:26 }}>{i.image}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{i.title}</div>
                <div style={{ fontSize:12, color:'#888' }}>{i.type==='digital'?'⬇️ Digital Download':'📦 Physical'}</div>
              </div>
              <span style={{ fontWeight:800, color:'#1e293b' }}>${i.price}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid #f1f5f9', marginTop:10, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, color:'#64748b' }}>Total: <strong style={{color:'#1e293b'}}>${o.total}</strong></div>
            {o.paymentStatus==='paid'&&o.type==='digital'&&(
              <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                {o.items?.some((i:any)=>i.digital_download_url||i.download_instruction) ? (
                  o.items?.filter((i:any)=>i.digital_download_url||i.download_instruction).map((i:any,idx:number)=>(
                    <div key={idx}>
                      {i.digital_download_url&&<a href={i.digital_download_url} target="_blank" rel="noreferrer" style={{background:p,color:'white',textDecoration:'none',padding:'6px 14px',borderRadius:11,fontSize:12,fontWeight:700,display:'inline-block'}}>⬇️ Download</a>}
                      {i.download_instruction&&!i.digital_download_url&&<div style={{fontSize:11,color:'#64748b',maxWidth:200}}>{i.download_instruction}</div>}
                    </div>
                  ))
                ) : (
                  <div style={{fontSize:11,color:'#94a3b8'}}>Download link will be sent to your email</div>
                )}
              </div>
            )}
            {(o.paymentStatus==='pending'||o.payment_status==='pending')&&o.type==='digital'&&(
              <div style={{fontSize:11,color:'#f59e0b',fontWeight:600}}>⏳ Awaiting payment confirmation</div>
            )}
            {o.trackingNumber&&(
              <div style={{ fontSize:12, color:'#64748b' }}>🚚 {o.shippingProvider}: <strong>{o.trackingNumber}</strong></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FavoritesTab({p,theme,navigate}:any) {
  const [favIds, setFavIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    Promise.all([api.getFavorites(), api.getProducts()]).then(([favs,prods])=>{
      setFavIds(Array.isArray(favs)?favs:[]);
      setProducts(Array.isArray(prods)?prods:[]);
      setLoading(false);
    });
  },[]);
  const favProducts = products.filter(p=>favIds.includes(p.id));
  if (loading) return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>;
  if (!favProducts.length) return <div style={{textAlign:'center',padding:'60px 24px',background:'white',borderRadius:20}}><div style={{fontSize:56,marginBottom:14}}>❤️</div><h3 style={{color:'#1e293b',fontWeight:800}}>No favorites yet</h3><p style={{color:'#64748b',fontSize:14}}>Heart products you love while browsing.</p></div>;
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
      {favProducts.map(pr=>(
        <div key={pr.id} style={{background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',cursor:'pointer'}} onClick={()=>navigate(`/products/${pr.slug}`)}>
          <div style={{height:120,background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48}}>{pr.image}</div>
          <div style={{padding:'12px 14px'}}>
            <div style={{fontWeight:800,color:'#1e293b',fontSize:14,marginBottom:4}}>{pr.title}</div>
            <div style={{fontWeight:900,color:'#1e293b'}}>${pr.price}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({user,p,theme,refreshUser}:any) {
  const [firstName, setFirstName]       = useState(user.first_name || '');
  const [lastName, setLastName]         = useState(user.last_name || '');
  const [deliveryEmail, setDeliveryEmail] = useState(user.delivery_email || user.email || '');
  const [phone, setPhone]               = useState(user.phone || '');
  const [addr, setAddr]                 = useState(user.shipping_address?.address || '');
  const [city, setCity]                 = useState(user.shipping_address?.city || '');
  const [zip, setZip]                   = useState(user.shipping_address?.zip || '');
  const [country, setCountry]           = useState(user.shipping_address?.country || 'Thailand');
  const [saving, setSaving]             = useState(false);
  const [msg, setMsg]                   = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    const fullName = `${firstName} ${lastName}`.trim();
    await api.updateMe({
      name: fullName || user.name,
      first_name: firstName,
      last_name: lastName,
      delivery_email: deliveryEmail,
      phone,
      shipping_address: { address: addr, city, zip, country },
    });
    await refreshUser();
    setSaving(false); setMsg('✓ Profile updated!');
    setTimeout(()=>setMsg(''),3000);
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
      {inp('Street Address', addr, setAddr)}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>{inp('City', city, setCity)}</div>
        <div>{inp('ZIP / Postal', zip, setZip)}</div>
      </div>
      {inp('Country', country, setCountry)}

      {msg && <div style={{background:'#d1fae5',border:'1.5px solid #6ee7b7',borderRadius:11,padding:'9px 13px',marginBottom:16,fontSize:13,color:'#065f46',fontWeight:600}}>{msg}</div>}
      <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:saving?'wait':'pointer',padding:'12px 28px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
        {saving?'Saving...':'Save Changes'}
      </button>
    </div>
  );
}
