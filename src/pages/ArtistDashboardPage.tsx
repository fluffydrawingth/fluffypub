import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

type Tab = 'overview' | 'products' | 'orders' | 'profile';

export default function ArtistDashboardPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>((route.params?.tab as Tab)||'overview');
  const p = theme.primaryColor;

  useEffect(() => { if (!user) navigate('/login'); }, [user]);
  if (!user || user.role !== 'artist') {
    if (user && user.role !== 'artist') return <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}><div style={{fontSize:64}}>🚫</div><h2>Artist access required</h2></div>;
    return null;
  }

  const tabs = [['overview','📊','Overview'],['products','📚','My Products'],['orders','📦','Sales'],['profile','👤','Profile']] as const;

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
        {tab==='overview' && <ArtistOverview user={user} p={p} theme={theme} />}
        {tab==='products' && <ArtistProducts user={user} p={p} theme={theme} />}
        {tab==='orders' && <ArtistOrders p={p} theme={theme} />}
        {tab==='profile' && <ArtistProfile user={user} p={p} theme={theme} refreshUser={refreshUser} />}
      </div>
    </div>
  );
}

function ArtistOverview({user,p,theme}:any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  useEffect(()=>{
    api.artistOrders().then(o=>setOrders(Array.isArray(o)?o:[]));
    api.getProducts().then(prods=>setProducts(Array.isArray(prods)?prods.filter((x:any)=>x.artistId===user.id):[])  );
  },[]);
  const revenue = orders.filter(o=>o.paymentStatus==='paid').reduce((s,o)=>s+o.items.reduce((a:number,i:any)=>a+i.price,0),0);
  const stats = [{label:'My Products',value:products.length,icon:'📚',color:p},{label:'Total Sales',value:orders.length,icon:'📦',color:'#10b981'},{label:'Revenue',value:`$${revenue.toFixed(2)}`,icon:'💰',color:'#f59e0b'}];
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Welcome back, {user.name}! 🎨</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {stats.map(s=>(
          <div key={s.label} style={{background:'white',borderRadius:18,padding:20,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',borderLeft:`4px solid ${s.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div><div style={{fontSize:12,color:'#888',fontWeight:600,marginBottom:4}}>{s.label}</div><div style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>{s.value}</div></div>
              <span style={{fontSize:26}}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:'white',borderRadius:18,padding:22,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <h3 style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:14}}>Recent Sales</h3>
        {orders.slice(0,5).map(o=>(
          <div key={o.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:'#1e293b'}}>{o.items.map((i:any)=>i.title).join(', ')}</div>
              <div style={{fontSize:11,color:'#94a3b8'}}>{new Date(o.createdAt).toLocaleDateString()}</div>
            </div>
            <span style={{fontWeight:800,color:'#1e293b'}}>${o.items.reduce((s:number,i:any)=>s+i.price,0).toFixed(2)}</span>
          </div>
        ))}
        {!orders.length&&<p style={{color:'#94a3b8',fontSize:13}}>No sales yet. Upload a product to get started!</p>}
      </div>
    </div>
  );
}

function ArtistProducts({user,p,theme}:any) {
  const [products, setProducts] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({title:'',price:'',category:'',description:'',image:'🎨',pages:'',tags:''});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.getProducts().then(prods=>setProducts(Array.isArray(prods)?prods.filter((x:any)=>x.artistId===user.id):[]));
  useEffect(()=>{load();},[]);

  const save = async () => {
    if (!form.title||!form.price||!form.category){setMsg('⚠️ Title, price and category required.');return;}
    setSaving(true); setMsg('');
    const result = await api.createProduct({...form,price:parseFloat(form.price),tags:form.tags.split(',').map((t:string)=>t.trim()).filter(Boolean)});
    if (result.error){setMsg('⚠️ '+result.error);}else{setAdding(false);setForm({title:'',price:'',category:'',description:'',image:'🎨',pages:'',tags:''});load();setMsg('✓ Product created!');}
    setSaving(false); setTimeout(()=>setMsg(''),4000);
  };

  const del = async (id:string) => {
    if (!confirm('Delete this product?')) return;
    await api.deleteProduct(id); load();
  };

  const CATEGORIES = ['Animals','Fantasy','Botanicals','Mandala','Kawaii','Seasonal'];
  const inp = (label:string, key:string, placeholder='', type='text') => (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
      {key==='category'?(
        <select value={form[key as keyof typeof form]} onChange={e=>setForm(x=>({...x,[key]:e.target.value}))} style={{width:'100%',padding:'9px 12px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
          <option value="">Select category</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      ):(
        <input type={type} value={form[key as keyof typeof form]} onChange={e=>setForm(x=>({...x,[key]:e.target.value}))} placeholder={placeholder}
          style={{width:'100%',padding:'9px 12px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}}
          onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')}
        />
      )}
    </div>
  );

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>My Products</h1>
        <button onClick={()=>setAdding(x=>!x)} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'10px 18px',borderRadius:14,fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>+ Add Product</button>
      </div>

      {adding&&(
        <div style={{background:'white',borderRadius:18,padding:22,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:16}}>New Product</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div>{inp('Title *','title','Bunny Garden Dreams')}</div>
            <div>{inp('Price *','price','9.99','number')}</div>
            <div>{inp('Category *','category')}</div>
            <div>{inp('Emoji Icon','image','🎨')}</div>
            <div>{inp('Pages','pages','30','number')}</div>
            <div>{inp('Tags (comma-separated)','tags','bunnies, garden')}</div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(x=>({...x,description:e.target.value}))} placeholder="Describe your coloring book..." rows={3}
              style={{width:'100%',padding:'9px 12px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,resize:'vertical',boxSizing:'border-box'}}
            />
          </div>
          {msg&&<div style={{marginBottom:12,fontSize:13,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
          <div style={{display:'flex',gap:8}}>
            <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:'pointer',padding:'10px 24px',borderRadius:12,fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>{saving?'Saving...':'Save Product'}</button>
            <button onClick={()=>setAdding(false)} style={{background:'transparent',border:`1.5px solid ${p}30`,color:'#64748b',cursor:'pointer',padding:'10px 20px',borderRadius:12,fontSize:14,fontWeight:600,fontFamily:theme.fontFamily}}>Cancel</button>
          </div>
        </div>
      )}

      {msg&&!adding&&<div style={{marginBottom:14,fontSize:13,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}

      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['','Title','Category','Price','Status',''].map(h=><th key={h} style={{textAlign:'left',padding:'12px 14px',fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{products.map(pr=>(
            <tr key={pr.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'10px 14px',fontSize:26}}>{pr.image}</td>
              <td style={{padding:'10px 14px',fontWeight:700,color:'#1e293b',fontSize:13}}>{pr.title}</td>
              <td style={{padding:'10px 14px'}}><span style={{background:p+'15',color:p,borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:700}}>{pr.category}</span></td>
              <td style={{padding:'10px 14px',fontWeight:800,color:'#1e293b'}}>${pr.price}</td>
              <td style={{padding:'10px 14px'}}><span style={{background:pr.active?'#d1fae5':'#f1f5f9',color:pr.active?'#059669':'#888',borderRadius:10,padding:'2px 9px',fontSize:11,fontWeight:700}}>{pr.active?'Active':'Inactive'}</span></td>
              <td style={{padding:'10px 14px'}}><button onClick={()=>del(pr.id)} style={{background:'#fee2e2',color:'#ef4444',border:'none',cursor:'pointer',padding:'5px 12px',borderRadius:9,fontSize:12,fontWeight:700}}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table>
        {!products.length&&<div style={{textAlign:'center',padding:'40px',color:'#94a3b8',fontSize:14}}>No products yet. Add your first product!</div>}
      </div>
    </div>
  );
}

function ArtistOrders({p,theme}:any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{api.artistOrders().then(o=>{setOrders(Array.isArray(o)?o:[]);setLoading(false);});}, []);
  if (loading) return <div style={{padding:28,color:'#888'}}>Loading...</div>;
  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Sales</h1>
      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['Order','Customer','Items','Amount','Date','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'12px 14px',fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{orders.map(o=>(
            <tr key={o.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'12px 14px',fontWeight:700,color:p,fontSize:12}}>#{o.id.slice(-8).toUpperCase()}</td>
              <td style={{padding:'12px 14px',fontSize:13,color:'#1e293b'}}>{o.customerName}</td>
              <td style={{padding:'12px 14px',fontSize:12,color:'#64748b'}}>{o.items.map((i:any)=>i.title).join(', ')}</td>
              <td style={{padding:'12px 14px',fontWeight:800,color:'#1e293b'}}>${o.items.reduce((s:number,i:any)=>s+i.price,0).toFixed(2)}</td>
              <td style={{padding:'12px 14px',fontSize:12,color:'#94a3b8'}}>{new Date(o.createdAt).toLocaleDateString()}</td>
              <td style={{padding:'12px 14px'}}><span style={{background:o.paymentStatus==='paid'?'#d1fae5':'#fef3c7',color:o.paymentStatus==='paid'?'#059669':'#d97706',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{o.paymentStatus==='paid'?'Paid':'Pending'}</span></td>
            </tr>
          ))}</tbody>
        </table>
        {!orders.length&&<div style={{textAlign:'center',padding:40,color:'#94a3b8',fontSize:14}}>No sales yet.</div>}
      </div>
    </div>
  );
}

function ArtistProfile({user,p,theme,refreshUser}:any) {
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio||'');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const save = async () => {
    setSaving(true); await api.updateMe({name,bio}); await refreshUser();
    setSaving(false); setMsg('✓ Profile updated!'); setTimeout(()=>setMsg(''),3000);
  };
  return (
    <div style={{padding:28}}>
      <div style={{background:'white',borderRadius:18,padding:24,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',maxWidth:560}}>
        <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:20}}>Artist Profile</h3>
        <div style={{marginBottom:16}}><label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>Name</label><input value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')} /></div>
        <div style={{marginBottom:20}}><label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:6}}>Bio</label><textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4} style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,resize:'vertical',boxSizing:'border-box'}} /></div>
        {msg&&<div style={{marginBottom:14,fontSize:13,fontWeight:600,color:'#059669'}}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:'pointer',padding:'11px 24px',borderRadius:12,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>{saving?'Saving...':'Save Profile'}</button>
      </div>
    </div>
  );
}
