import React, { useState, useEffect } from 'react';
import { useTheme, ThemeConfig } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import ImageCropEditor from '../components/ImageCropEditor';

type Tab = 'dashboard'|'products'|'orders'|'artists'|'users'|'theme';

export default function AdminPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>((route.params?.tab as Tab)||'dashboard');
  const p = theme.primaryColor;

  useEffect(()=>{ if(!user){navigate('/login');} else if(user.role!=='admin'){navigate('/');} },[user]);
  if (!user || user.role !== 'admin') return null;

  const tabs = [
    ['dashboard','📊','Dashboard'],['products','📚','Products'],
    ['orders','📦','Orders'],['artists','🎨','Artists'],
    ['users','👥','Users'],['theme','✨','Theme & CMS'],
  ] as const;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ width:230, background:'white', borderRight:`1px solid ${p}15`, display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh' }}>
        <div style={{ padding:'20px 18px 14px', borderBottom:`1px solid ${p}15` }}>
          <div style={{ fontSize:18, fontWeight:900, color:p }}>⚙️ Admin Panel</div>
          <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{user.email}</div>
        </div>
        <nav style={{ flex:1, padding:'10px' }}>
          {tabs.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ width:'100%', padding:'10px 14px', borderRadius:11, border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8, marginBottom:3, background:tab===id?p+'15':'transparent', color:tab===id?p:'#64748b', fontWeight:tab===id?700:600, fontSize:13, fontFamily:theme.fontFamily }}>
              {icon} {label}
            </button>
          ))}
        </nav>
        <div style={{ padding:'12px 14px', borderTop:`1px solid ${p}15` }}>
          <button onClick={()=>navigate('/')} style={{ width:'100%', padding:'8px', borderRadius:11, border:`1.5px solid ${p}30`, color:p, cursor:'pointer', background:'transparent', fontSize:12, fontWeight:700, marginBottom:6, fontFamily:theme.fontFamily }}>← Store</button>
          <button onClick={async()=>{await logout();navigate('/');}} style={{ width:'100%', padding:'8px', borderRadius:11, border:'1.5px solid #fca5a5', color:'#ef4444', cursor:'pointer', background:'#fef2f2', fontSize:12, fontWeight:700, fontFamily:theme.fontFamily }}>🚪 Sign Out</button>
        </div>
      </div>
      <div style={{ flex:1, overflow:'auto' }}>
        {tab==='dashboard' && <AdminDashboard p={p} theme={theme} />}
        {tab==='products' && <AdminProducts p={p} theme={theme} />}
        {tab==='orders' && <AdminOrders p={p} theme={theme} />}
        {tab==='artists' && <AdminArtists p={p} theme={theme} />}
        {tab==='users' && <AdminUsers p={p} theme={theme} />}
        {tab==='theme' && <AdminThemeCMS p={p} theme={theme} />}
      </div>
    </div>
  );
}

function AdminDashboard({p,theme}:any) {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(()=>{ api.getAnalytics().then(s=>setStats(s)); api.allOrders().then(o=>setOrders(Array.isArray(o)?o.slice(0,5):[])); },[]);
  const statCards = stats ? [
    {label:'Revenue',value:`$${stats.revenue}`,icon:'💰',color:'#10b981'},
    {label:'Orders Today',value:stats.ordersToday,icon:'📦',color:p},
    {label:'Products',value:stats.totalProducts,icon:'📚',color:theme.secondaryColor||'#c084fc'},
    {label:'Customers',value:stats.totalCustomers,icon:'👥',color:theme.accentColor||'#fb923c'},
    {label:'Artists',value:stats.totalArtists,icon:'🎨',color:'#8b5cf6'},
    {label:'Total Orders',value:stats.totalOrders,icon:'📋',color:'#0ea5e9'},
  ] : [];
  const STATUS_COLOR:any = {pending_payment:'#fef3c7',paid:'#d1fae5',packing:'#dbeafe',shipped:'#e0e7ff',delivered:'#d1fae5'};
  const STATUS_TEXT:any = {pending_payment:'Pending',paid:'Paid',packing:'Packing',shipped:'Shipped',delivered:'Delivered'};
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Dashboard</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {statCards.map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div style={{fontSize:12,color:'#888',fontWeight:600,marginBottom:4}}>{s.label}</div><div style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>{s.value}</div></div>
              <span style={{fontSize:26}}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'white',borderRadius:18,padding:22,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:16}}>Recent Orders</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f1f5f9'}}>{['Order','Customer','Total','Status','Date'].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{orders.map(o=>(
            <tr key={o.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'10px',fontSize:12,fontWeight:700,color:p}}>#{o.id.slice(-8).toUpperCase()}</td>
              <td style={{padding:'10px',fontSize:13}}>{o.customerName}</td>
              <td style={{padding:'10px',fontWeight:800,color:'#1e293b'}}>${o.total}</td>
              <td style={{padding:'10px'}}><span style={{background:STATUS_COLOR[o.status]||'#f1f5f9',color:o.status==='paid'||o.status==='delivered'?'#059669':'#d97706',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{STATUS_TEXT[o.status]||o.status}</span></td>
              <td style={{padding:'10px',fontSize:11,color:'#94a3b8'}}>{new Date(o.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}</tbody>
        </table>
        {!orders.length&&<div style={{textAlign:'center',padding:24,color:'#94a3b8'}}>No orders yet.</div>}
      </div>
    </div>
  );
}

function AdminProducts({p,theme}:any) {
  const [products, setProducts] = useState<any[]>([]);
  useEffect(()=>{api.getProducts().then(x=>setProducts(Array.isArray(x)?x:[]));}, []);
  const toggle = async (id:string, key:string, val:boolean) => {
    await api.updateProduct(id, {[key]:val});
    setProducts(prev=>prev.map(x=>x.id===id?{...x,[key]:val}:x));
  };
  const del = async (id:string) => { if(!confirm('Delete?'))return; await api.deleteProduct(id); setProducts(prev=>prev.filter(x=>x.id!==id)); };
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>All Products</h1>
      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['','Title','Artist','Cat','Price','Featured','Status',''].map(h=><th key={h} style={{textAlign:'left',padding:'11px 13px',fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{products.map(pr=>(
            <tr key={pr.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'9px 13px',fontSize:24}}>{pr.image}</td>
              <td style={{padding:'9px 13px',fontWeight:700,color:'#1e293b',fontSize:13}}>{pr.title}</td>
              <td style={{padding:'9px 13px',fontSize:12,color:'#64748b'}}>{pr.artistName}</td>
              <td style={{padding:'9px 13px'}}><span style={{background:p+'15',color:p,borderRadius:9,padding:'2px 8px',fontSize:10,fontWeight:700}}>{pr.category}</span></td>
              <td style={{padding:'9px 13px',fontWeight:800,fontSize:13}}>${pr.price}</td>
              <td style={{padding:'9px 13px'}}><input type="checkbox" checked={!!pr.featured} onChange={e=>toggle(pr.id,'featured',e.target.checked)} style={{cursor:'pointer',width:16,height:16,accentColor:p}} /></td>
              <td style={{padding:'9px 13px'}}><span style={{background:pr.active?'#d1fae5':'#f1f5f9',color:pr.active?'#059669':'#888',borderRadius:9,padding:'2px 8px',fontSize:10,fontWeight:700}}>{pr.active?'Active':'Off'}</span></td>
              <td style={{padding:'9px 13px'}}><button onClick={()=>del(pr.id)} style={{background:'#fee2e2',color:'#ef4444',border:'none',cursor:'pointer',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700}}>Del</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdminOrders({p,theme}:any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tracking, setTracking] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=>{api.allOrders().then(o=>setOrders(Array.isArray(o)?o:[]));}, []);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    const updates:any = {status};
    if (tracking) updates.trackingNumber = tracking;
    if (provider) updates.shippingProvider = provider;
    const updated = await api.updateOrder(selected.id, updates);
    setOrders(prev=>prev.map(o=>o.id===selected.id?updated:o));
    setSelected(updated); setSaving(false); setMsg('✓ Order updated!'); setTimeout(()=>setMsg(''),3000);
  };

  const STATUS_OPTS = ['pending_payment','paid','packing','shipped','delivered'];
  const STATUS_LABELS:any = {pending_payment:'Pending Payment',paid:'Paid',packing:'Packing',shipped:'Shipped',delivered:'Delivered'};
  const STATUS_COLOR:any = {pending_payment:'#fef3c7',paid:'#d1fae5',packing:'#dbeafe',shipped:'#e0e7ff',delivered:'#d1fae5'};

  return (
    <div style={{padding:28,display:'grid',gridTemplateColumns:'1fr 340px',gap:20,alignItems:'start'}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Orders</h1>
        <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['Order','Customer','Total','Type','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 13px',fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
            <tbody>{orders.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer',background:selected?.id===o.id?p+'08':'white'}}
                onClick={()=>{setSelected(o);setTracking(o.trackingNumber||'');setProvider(o.shippingProvider||'');setStatus(o.status);}}>
                <td style={{padding:'10px 13px',fontSize:12,fontWeight:700,color:p}}>#{o.id.slice(-8).toUpperCase()}</td>
                <td style={{padding:'10px 13px',fontSize:13}}>{o.customerName}</td>
                <td style={{padding:'10px 13px',fontWeight:800,color:'#1e293b'}}>${o.total}</td>
                <td style={{padding:'10px 13px'}}><span style={{fontSize:11,fontWeight:600,color:'#64748b'}}>{o.type==='digital'?'⬇️ Digital':'📦 Physical'}</span></td>
                <td style={{padding:'10px 13px'}}><span style={{background:STATUS_COLOR[o.status]||'#f1f5f9',color:o.status==='paid'||o.status==='delivered'?'#059669':'#d97706',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{STATUS_LABELS[o.status]||o.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
          {!orders.length&&<div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No orders yet.</div>}
        </div>
      </div>

      {selected&&(
        <div style={{background:'white',borderRadius:18,padding:22,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',position:'sticky',top:20}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:4}}>Order #{selected.id.slice(-8).toUpperCase()}</h3>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:16}}>{selected.customerEmail}</div>
          {selected.items.map((i:any)=>(
            <div key={i.productId} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:22}}>{i.image}</span>
              <div style={{flex:1,fontSize:13,fontWeight:600,color:'#1e293b'}}>{i.title}</div>
              <span style={{fontWeight:800,color:'#1e293b',fontSize:13}}>${i.price}</span>
            </div>
          ))}
          <div style={{height:1,background:'#f1f5f9',margin:'12px 0'}}/>
          <div style={{fontSize:15,fontWeight:900,color:'#1e293b',marginBottom:16}}>Total: ${selected.total}</div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'9px 12px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
              {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          {selected.type==='physical'&&<>
            <div style={{marginBottom:10}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Shipping Provider</label>
              <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="UPS, FedEx, USPS..." style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Tracking Number</label>
              <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="1Z999AA10123456784" style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} />
            </div>
          </>}
          {msg&&<div style={{marginBottom:10,fontSize:12,fontWeight:600,color:'#059669'}}>{msg}</div>}
          <button onClick={save} disabled={saving} style={{width:'100%',padding:'11px',background:saving?p+'88':p,color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:13,fontWeight:800,fontFamily:theme.fontFamily}}>{saving?'Saving...':'Update Order'}</button>
        </div>
      )}
    </div>
  );
}

function AdminArtists({p,theme}:any) {
  const [artists, setArtists] = useState<any[]>([]);
  useEffect(()=>{api.getArtists().then(x=>setArtists(Array.isArray(x)?x:[]));}, []);
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Artists</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
        {artists.map(a=>(
          <div key={a.id} style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex',gap:12,alignItems:'center',marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:'50%',background:p+'18',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>🎨</div>
              <div><div style={{fontWeight:800,color:'#1e293b',fontSize:15}}>{a.name}</div><div style={{fontSize:11,color:'#888'}}>{a.productCount} products</div></div>
            </div>
            <p style={{fontSize:12,color:'#64748b',lineHeight:1.5}}>{a.bio||'No bio yet.'}</p>
          </div>
        ))}
        {!artists.length&&<div style={{color:'#94a3b8',fontSize:14}}>No artists registered yet.</div>}
      </div>
    </div>
  );
}

function AdminUsers({p,theme}:any) {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(()=>{api.allUsers().then(x=>setUsers(Array.isArray(x)?x:[]));}, []);
  const ROLE_COLORS:any = {admin:'#e0e7ff',artist:'#d1fae5',customer:'#fce7f3'};
  const ROLE_TEXT:any = {admin:'Admin',artist:'Artist',customer:'Customer'};
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Users</h1>
      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['Name','Email','Role','Joined'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 14px',fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{users.map(u=>(
            <tr key={u.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'11px 14px',fontWeight:700,color:'#1e293b',fontSize:14}}>{u.name}</td>
              <td style={{padding:'11px 14px',fontSize:13,color:'#64748b'}}>{u.email}</td>
              <td style={{padding:'11px 14px'}}><span style={{background:ROLE_COLORS[u.role]||'#f1f5f9',color:'#374151',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{ROLE_TEXT[u.role]||u.role}</span></td>
              <td style={{padding:'11px 14px',fontSize:12,color:'#94a3b8'}}>{new Date(u.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdminThemeCMS({p,theme}:any) {
  const { saveTheme } = useTheme();
  const [draft, setDraft] = useState<ThemeConfig>({...theme});
  const [section, setSection] = useState('brand');
  const [saved, setSaved] = useState('');
  const update = (k: keyof ThemeConfig, v: any) => setDraft(prev=>({...prev,[k]:v}));

  const save = async () => {
    await saveTheme(draft);
    setSaved('✓ Saved!'); setTimeout(()=>setSaved(''),3000);
  };

  const SECTIONS = [['brand','🏷️','Brand & Logo'],['colors','🎨','Colors'],['hero','🖼️','Hero (Desktop)'],['mobile','📱','Hero (Mobile)'],['banner','📢','Banner'],['background','🌄','Background'],['layout','📐','Sections']] as const;
  const PRESETS = [
    {name:'Sakura',primaryColor:'#f472b6',secondaryColor:'#c084fc',accentColor:'#fb923c',bgColor:'#fdf2f8',bgColor2:'#faf5ff',textColor:'#4a1942'},
    {name:'Ocean',primaryColor:'#38bdf8',secondaryColor:'#818cf8',accentColor:'#34d399',bgColor:'#f0f9ff',bgColor2:'#eef2ff',textColor:'#0c4a6e'},
    {name:'Forest',primaryColor:'#4ade80',secondaryColor:'#a3e635',accentColor:'#facc15',bgColor:'#f0fdf4',bgColor2:'#f7fee7',textColor:'#14532d'},
    {name:'Sunset',primaryColor:'#fb923c',secondaryColor:'#f43f5e',accentColor:'#a78bfa',bgColor:'#fff7ed',bgColor2:'#fff1f2',textColor:'#431407'},
    {name:'Lavender',primaryColor:'#a78bfa',secondaryColor:'#f0abfc',accentColor:'#fb7185',bgColor:'#f5f3ff',bgColor2:'#fdf4ff',textColor:'#2e1065'},
    {name:'Mint',primaryColor:'#2dd4bf',secondaryColor:'#34d399',accentColor:'#a78bfa',bgColor:'#f0fdfa',bgColor2:'#f0fdf4',textColor:'#0d3d35'},
  ];

  const inp = (label:string, val:string, set:(v:string)=>void) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>{label}</label>
      <input value={val} onChange={e=>set(e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')} />
    </div>
  );

  return (
    <div style={{padding:28,display:'grid',gridTemplateColumns:'200px 1fr',gap:20}}>
      <div>
        <div style={{background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)',marginBottom:14}}>
          {SECTIONS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setSection(id)} style={{width:'100%',padding:'11px 14px',border:'none',textAlign:'left',cursor:'pointer',display:'flex',gap:8,alignItems:'center',background:section===id?p+'12':'transparent',borderLeft:`3px solid ${section===id?p:'transparent'}`,color:section===id?p:'#64748b',fontWeight:section===id?700:600,fontSize:13,fontFamily:theme.fontFamily,borderBottom:'1px solid #f1f5f9'}}>
              {icon} {label}
            </button>
          ))}
        </div>
        <button onClick={save} style={{width:'100%',padding:'12px',background:p,color:'white',border:'none',cursor:'pointer',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:`0 4px 16px ${p}44`}}>
          {saved||'💾 Save All'}
        </button>
      </div>

      <div style={{background:'white',borderRadius:18,padding:28,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        {section==='brand'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:20}}>Brand & Logo</h2>
          {inp('Store Name', draft.logoText, v=>update('logoText',v))}
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>Logo Emoji</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {['🐰','🌸','🎨','🦊','🐱','🌈','💕','🍓','🦄','🌺','✨','🎀'].map(e=>(
                <button key={e} onClick={()=>update('logoEmoji',e)} style={{width:40,height:40,borderRadius:10,border:`2px solid ${draft.logoEmoji===e?p:'#e5e7eb'}`,background:draft.logoEmoji===e?p+'15':'white',cursor:'pointer',fontSize:20}}>{e}</button>
              ))}
            </div>
          </div>
          <ImageCropEditor title="Logo Image (optional)" hint="Square crop. Replaces emoji if set." value={draft.logoImageCrop} aspectRatio={1} onChange={v=>update('logoImageCrop',v)} />
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>Font Family</label>
            <select value={draft.fontFamily} onChange={e=>update('fontFamily',e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
              {["'Nunito', sans-serif","'Quicksand', sans-serif","'Pacifico', cursive","'Comic Neue', cursive","'Poppins', sans-serif"].map(f=><option key={f} value={f}>{f.split("'")[1]}</option>)}
            </select>
          </div>
          <div style={{padding:16,borderRadius:14,background:draft.primaryColor+'10',border:`2px dashed ${draft.primaryColor}40`,textAlign:'center'}}>
            {draft.logoImageCrop?.croppedDataUrl?<img src={draft.logoImageCrop.croppedDataUrl} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',marginBottom:6}}/>:<div style={{fontSize:28,marginBottom:6}}>{draft.logoEmoji}</div>}
            <div style={{fontSize:18,fontWeight:900,color:draft.primaryColor,fontFamily:draft.fontFamily}}>{draft.logoText}</div>
            <div style={{fontSize:11,color:'#888',marginTop:2}}>Preview</div>
          </div>
        </>)}

        {section==='colors'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Color Palette</h2>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:10,textTransform:'uppercase',letterSpacing:0.5}}>Presets</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {PRESETS.map(pr=>(
                <button key={pr.name} onClick={()=>setDraft(d=>({...d,...pr}))} style={{padding:'7px 14px',borderRadius:18,border:`2px solid ${pr.primaryColor}`,background:`linear-gradient(135deg,${pr.bgColor},${pr.bgColor2})`,cursor:'pointer',fontSize:12,fontWeight:700,color:pr.textColor}}>
                  {pr.name}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {([['primaryColor','Primary'],['secondaryColor','Secondary'],['accentColor','Accent'],['textColor','Text'],['bgColor','Background 1'],['bgColor2','Background 2']] as const).map(([k,label])=>(
              <div key={k}>
                <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="color" value={draft[k] as string} onChange={e=>update(k,e.target.value)} style={{width:40,height:36,borderRadius:9,border:'1.5px solid #e5e7eb',cursor:'pointer',padding:2}} />
                  <input value={draft[k] as string} onChange={e=>update(k,e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${p}25`,fontSize:12,outline:'none',fontFamily:'monospace'}} />
                </div>
              </div>
            ))}
          </div>
        </>)}

        {section==='hero'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:20}}>Hero Section — Desktop</h2>
          {inp('Headline', draft.heroTitle, v=>update('heroTitle',v))}
          {inp('Subtitle', draft.heroSubtitle, v=>update('heroSubtitle',v))}
          {inp('Background Gradient (fallback)', draft.heroBgColor, v=>update('heroBgColor',v))}
          <ImageCropEditor title="Hero Image (Desktop)" hint="Wide image 1600×600px. Drag to position, scroll to zoom." value={draft.heroCrop} aspectRatio={16/6} onChange={v=>update('heroCrop',v)} />
        </>)}

        {section==='mobile'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Hero Section — Mobile</h2>
          <p style={{color:'#64748b',fontSize:13,marginBottom:20}}>Shown on screens under 768px. Set a tighter portrait crop.</p>
          <ImageCropEditor title="Hero Image (Mobile)" hint="Portrait crop 800×600. Shown on phones." value={draft.mobileHeroCrop} aspectRatio={4/3} onChange={v=>update('mobileHeroCrop',v)} />
        </>)}

        {section==='banner'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:20}}>Announcement Banner</h2>
          {inp('Banner Text', draft.bannerText, v=>update('bannerText',v))}
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>Banner Color</label>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input type="color" value={draft.bannerBg} onChange={e=>update('bannerBg',e.target.value)} style={{width:40,height:36,borderRadius:9,border:'1.5px solid #e5e7eb',cursor:'pointer',padding:2}} />
              <input value={draft.bannerBg} onChange={e=>update('bannerBg',e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${p}25`,fontSize:12,outline:'none',fontFamily:'monospace'}} />
            </div>
          </div>
          <div style={{borderRadius:11,overflow:'hidden',marginBottom:16}}><div style={{background:draft.bannerBg,color:'white',textAlign:'center',padding:10,fontSize:13,fontWeight:600}}>{draft.bannerText}</div></div>
          <ImageCropEditor title="Banner Background Image (optional)" hint="Very wide strip image overlay." value={draft.bannerImageCrop} aspectRatio={10} onChange={v=>update('bannerImageCrop',v)} />
        </>)}

        {section==='background'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Site Background</h2>
          <p style={{color:'#64748b',fontSize:13,marginBottom:20}}>Global background. Focal point controls anchoring on resize.</p>
          <ImageCropEditor title="Background Image" hint="Large image. Set focal point for responsive display." value={draft.bgImageCrop} aspectRatio={16/9} onChange={v=>update('bgImageCrop',v)} />
        </>)}

        {section==='layout'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Homepage Sections</h2>
          <p style={{color:'#64748b',fontSize:13,marginBottom:20}}>Reorder with ↑↓</p>
          {draft.sections.map((s,i)=>{
            const labels:any={hero:'🌟 Hero Banner',featured:'⭐ Featured',categories:'📂 Categories',artists:'🎨 Artists',newsletter:'💌 Newsletter'};
            return (
              <div key={s} style={{display:'flex',alignItems:'center',gap:10,background:'#f8fafc',borderRadius:12,padding:'12px 16px',marginBottom:8,border:`1.5px solid ${p}12`}}>
                <span style={{color:'#888'}}>⠿</span>
                <span style={{flex:1,fontWeight:700,fontSize:14,color:'#1e293b'}}>{labels[s]||s}</span>
                <button onClick={()=>{const a=[...draft.sections];if(i>0){[a[i],a[i-1]]=[a[i-1],a[i]];update('sections',a);}}} disabled={i===0} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e5e7eb',background:'white',cursor:i===0?'not-allowed':'pointer',opacity:i===0?0.4:1}}>↑</button>
                <button onClick={()=>{const a=[...draft.sections];if(i<a.length-1){[a[i],a[i+1]]=[a[i+1],a[i]];update('sections',a);}}} disabled={i===draft.sections.length-1} style={{padding:'5px 10px',borderRadius:7,border:'1px solid #e5e7eb',background:'white',cursor:i===draft.sections.length-1?'not-allowed':'pointer',opacity:i===draft.sections.length-1?0.4:1}}>↓</button>
              </div>
            );
          })}
        </>)}
      </div>
    </div>
  );
}
