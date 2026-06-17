import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import ImageUpload from '../components/ImageUpload';

type Tab = 'overview' | 'profile' | 'products' | 'sales' | 'earnings';

const thb = (n: number) => `฿${Number(n || 0).toLocaleString('th-TH')}`;

export default function ArtistDashboardPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>((route.params?.tab as Tab) || 'overview');
  const p = theme.primaryColor;

  useEffect(() => { if (!user) navigate('/login'); }, [user]);
  // Pull fresh role/artist_id on entry so a revoked artist is bounced out (no stale access).
  useEffect(() => { refreshUser(); }, []);
  if (!user || user.role !== 'artist') {
    if (user && user.role !== 'artist') return <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}><div style={{fontSize:64}}>🚫</div><h2>Artist access required</h2></div>;
    return null;
  }

  const tabs = [['overview','📊','Overview'],['profile','👤','My Profile'],['products','📚','My Products'],['sales','📦','My Sales'],['earnings','💰','My Earnings']] as const;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ width:220, background:'white', borderRight:`1px solid ${p}15`, display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh' }}>
        <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${p}15` }}>
          <div style={{ fontSize:18, fontWeight:900, color:p }}>🎨 Artist Studio</div>
          <div style={{ fontSize:12, color:'#888', marginTop:3 }}>{user.name}</div>
        </div>
        <nav style={{ flex:1, padding:'10px' }}>
          {tabs.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ width:'100%', padding:'11px 14px', borderRadius:11, border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, marginBottom:3, background:tab===id?p+'15':'transparent', color:tab===id?p:'#64748b', fontWeight:tab===id?700:600, fontSize:14, fontFamily:theme.fontFamily }}>
              {icon} {label}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px 14px', borderTop:`1px solid ${p}15` }}>
          <button onClick={()=>navigate('/')} style={{ width:'100%', padding:'9px', borderRadius:11, border:`1.5px solid ${p}30`, color:p, cursor:'pointer', background:'transparent', fontSize:13, fontWeight:700, marginBottom:7, fontFamily:theme.fontFamily }}>← View Store</button>
          <button onClick={async()=>{await logout();navigate('/');}} style={{ width:'100%', padding:'9px', borderRadius:11, border:'1.5px solid #fca5a5', color:'#ef4444', cursor:'pointer', background:'#fef2f2', fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>🚪 Sign Out</button>
        </div>
      </div>
      <div style={{ flex:1, overflow:'auto' }}>
        {tab==='overview'  && <ArtistOverview user={user} p={p} />}
        {tab==='profile'   && <ArtistProfile user={user} p={p} theme={theme} refreshUser={refreshUser} />}
        {tab==='products'  && <ArtistProducts p={p} />}
        {tab==='sales'     && <ArtistSales p={p} />}
        {tab==='earnings'  && <ArtistEarnings p={p} />}
      </div>
    </div>
  );
}

// Aggregate this artist's sales numbers from their (already-filtered) orders.
function useSalesSummary() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.artistOrders().then(o => { setOrders(Array.isArray(o) ? o : []); setLoading(false); }); }, []);
  const isPaid = (o: any) => (o.paymentStatus || o.payment_status) === 'paid';
  const paid = orders.filter(isPaid);
  let physicalSold = 0, digitalSold = 0, totalSalesTHB = 0;
  for (const o of orders) {
    for (const i of (o.items || [])) {
      const qty = i.qty || 1;
      const isDigital = (i.optionType || i.type) === 'digital';
      if (isDigital) digitalSold += qty; else physicalSold += qty;
    }
  }
  for (const o of paid) {
    for (const i of (o.items || [])) {
      const qty = i.qty || 1;
      const unit = i.unitPriceTHB || i.price_thb || (i.price ? Math.round(i.price * 35) : 0);
      totalSalesTHB += unit * qty;
    }
  }
  return { orders, loading, totalOrders: orders.length, physicalSold, digitalSold, totalSalesTHB };
}

function ArtistOverview({user,p}:any) {
  const { loading, totalOrders, totalSalesTHB } = useSalesSummary();
  const [productCount, setProductCount] = useState(0);
  useEffect(() => { api.getMyProducts().then(d => setProductCount(Array.isArray(d) ? d.length : 0)); }, []);
  const stats = [
    {label:'My Products', value:productCount, icon:'📚', color:p},
    {label:'Total Orders', value:totalOrders, icon:'📦', color:'#10b981'},
    {label:'Total Sales', value:loading?'…':thb(totalSalesTHB), icon:'💰', color:'#f59e0b'},
  ];
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Welcome back, {user.name}! 🎨</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div style={{fontSize:12,color:'#888',fontWeight:600,marginBottom:4}}>{s.label}</div><div style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>{s.value}</div></div>
              <span style={{fontSize:26}}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistProducts({p}:any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{ api.getMyProducts().then(d=>{ setProducts(Array.isArray(d)?d:[]); setLoading(false); }); },[]);

  // Map raw status → display label + colors. Artists cannot change these.
  const statusInfo = (s: string) => {
    if (s === 'published') return { t:'Published', c:'#059669', bg:'#d1fae5' };
    if (s === 'rejected')  return { t:'Rejected',  c:'#dc2626', bg:'#fee2e2' };
    return { t:'Pending Review', c:'#d97706', bg:'#fef3c7' }; // draft / pending_review / anything else
  };

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>My Products</h1>
      </div>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Your products are managed by the Fluffy Pub team. Prices and publishing are set during review. Self-serve uploads are coming soon.</p>

      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['','Title','Category','Price','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 14px',fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{products.map(pr=>{
            const si = statusInfo(pr.status);
            const priceTHB = pr.price_thb || (pr.price ? Math.round(pr.price*35) : 0);
            const cat = (pr.categories && pr.categories[0]) || pr.category || '—';
            return (
              <tr key={pr.id} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'10px 14px',fontSize:26}}>{pr.cover_image_url ? <img src={pr.cover_image_url} style={{width:36,height:36,borderRadius:8,objectFit:'cover'}}/> : (pr.image||'🎨')}</td>
                <td style={{padding:'10px 14px',fontWeight:700,color:'#1e293b',fontSize:13}}>{pr.title}</td>
                <td style={{padding:'10px 14px'}}><span style={{background:p+'15',color:p,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:700}}>{cat}</span></td>
                <td style={{padding:'10px 14px',fontWeight:800,color:'#1e293b'}}>{thb(priceTHB)}</td>
                <td style={{padding:'10px 14px'}}><span style={{background:si.bg,color:si.c,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:700}}>{si.t}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
        {loading && <div style={{textAlign:'center',padding:'40px',color:'#94a3b8',fontSize:14}}>Loading...</div>}
        {!loading && !products.length && <div style={{textAlign:'center',padding:'40px',color:'#94a3b8',fontSize:14}}>No products yet. The team will add your products after onboarding. ✨</div>}
      </div>
    </div>
  );
}

function ArtistSales({p}:any) {
  const { orders, loading, totalOrders, physicalSold, digitalSold, totalSalesTHB } = useSalesSummary();
  if (loading) return <div style={{padding:28,color:'#888'}}>Loading...</div>;
  const cards = [
    {label:'Total Orders', value:totalOrders, icon:'📦', color:p},
    {label:'Physical Sold', value:physicalSold, icon:'🎁', color:'#10b981'},
    {label:'Digital Sold', value:digitalSold, icon:'⬇️', color:'#3b82f6'},
    {label:'Total Sales', value:thb(totalSalesTHB), icon:'💰', color:'#f59e0b'},
  ];
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>My Sales</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        {cards.map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div style={{fontSize:12,color:'#888',fontWeight:600,marginBottom:4}}>{s.label}</div><div style={{fontSize:22,fontWeight:900,color:'#1e293b'}}>{s.value}</div></div>
              <span style={{fontSize:24}}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['Order','Items','Amount','Date','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 14px',fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{orders.map(o=>{
            const amt = (o.items||[]).reduce((s:number,i:any)=>s+((i.unitPriceTHB||i.price_thb||(i.price?Math.round(i.price*35):0))*(i.qty||1)),0);
            const paid = (o.paymentStatus||o.payment_status)==='paid';
            return (
              <tr key={o.id} style={{borderBottom:'1px solid #f8fafc'}}>
                <td style={{padding:'12px 14px',fontWeight:700,color:p,fontSize:12}}>#{o.id.slice(-8).toUpperCase()}</td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#64748b'}}>{(o.items||[]).map((i:any)=>i.title).join(', ')}</td>
                <td style={{padding:'12px 14px',fontWeight:800,color:'#1e293b'}}>{thb(amt)}</td>
                <td style={{padding:'12px 14px',fontSize:12,color:'#94a3b8'}}>{new Date(o.created_at||o.createdAt).toLocaleDateString()}</td>
                <td style={{padding:'12px 14px'}}><span style={{background:paid?'#d1fae5':'#fef3c7',color:paid?'#059669':'#d97706',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{paid?'Paid':'Pending'}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
        {!orders.length&&<div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:14}}>No sales yet.</div>}
      </div>
    </div>
  );
}

function ArtistEarnings({p}:any) {
  const { loading, totalSalesTHB } = useSalesSummary();
  if (loading) return <div style={{padding:28,color:'#888'}}>Loading...</div>;
  const cards = [
    {label:'Total Earnings', value:thb(totalSalesTHB), icon:'💰', color:'#f59e0b', note:'Gross sales from paid orders'},
    {label:'Pending Payout', value:thb(0), icon:'⏳', color:'#3b82f6', note:'Coming soon'},
    {label:'Paid Out', value:thb(0), icon:'✅', color:'#10b981', note:'Coming soon'},
  ];
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:8}}>My Earnings</h1>
      <p style={{fontSize:13,color:'#94a3b8',marginBottom:20}}>Read-only summary. Payout tracking will be available soon.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
        {cards.map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:18,padding:22,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
              <div style={{fontSize:12,color:'#888',fontWeight:600}}>{s.label}</div>
              <span style={{fontSize:24}}>{s.icon}</span>
            </div>
            <div style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>{s.value}</div>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>{s.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistProfile({user,p,theme,refreshUser}:any) {
  const [name, setName] = useState(user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [avatar, setAvatar] = useState('');
  const [website, setWebsite] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [facebook, setFacebook] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Load the effective artist profile (artistId link, else self).
  useEffect(() => {
    const id = user.artistId || user.id;
    api.getArtist(id).then((a:any) => {
      if (a && !a.error) {
        setName(a.name || user.name || '');
        setBio(a.bio || '');
        setAvatar(a.avatar_url || '');
        setWebsite(a.website || '');
        setContactEmail(a.contact_email || '');
        setInstagram(a.social_links?.instagram || '');
        setTiktok(a.social_links?.tiktok || '');
        setFacebook(a.social_links?.facebook || '');
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true); setMsg('');
    const res = await api.updateArtistMe({
      name, bio, avatar_url: avatar || null, website: website || null, contact_email: contactEmail || null,
      social_links: { instagram: instagram || null, tiktok: tiktok || null, facebook: facebook || null },
    });
    if (res?.error) { setMsg('⚠️ ' + res.error); setSaving(false); return; }
    await refreshUser();
    setSaving(false); setMsg('✓ Profile updated!'); setTimeout(()=>setMsg(''),3000);
  };

  const fld = (label:string, val:string, set:(v:string)=>void, ph='', type='text') => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
        style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}}
        onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')} />
    </div>
  );

  if (!loaded) return <div style={{padding:28,color:'#888'}}>Loading...</div>;

  return (
    <div style={{padding:28}}>
      <div style={{background:'white',borderRadius:18,padding:24,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',maxWidth:620}}>
        <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:20}}>My Profile</h3>

        <div style={{marginBottom:18}}>
          <ImageUpload label="Profile Picture" value={avatar} onChange={setAvatar} folder="artists" hint="Square, 200×200px" />
        </div>

        {fld('Artist Name', name, setName, 'Mochi Arts')}
        <div style={{marginBottom:14}}>
          <label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>Bio</label>
          <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4}
            style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,resize:'vertical',boxSizing:'border-box'}} />
        </div>

        <h4 style={{fontSize:14,fontWeight:800,color:'#374151',margin:'8px 0 12px'}}>🔗 Links & Contact</h4>
        {fld('Instagram', instagram, setInstagram, '@username')}
        {fld('TikTok', tiktok, setTiktok, '@username')}
        {fld('Facebook', facebook, setFacebook, 'facebook.com/yourpage')}
        {fld('Website', website, setWebsite, 'https://yoursite.com')}
        {fld('Contact Email', contactEmail, setContactEmail, 'you@email.com', 'email')}

        {msg && <div style={{marginBottom:14,fontSize:13,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:12,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>{saving?'Saving...':'Save Profile'}</button>
      </div>
    </div>
  );
}
