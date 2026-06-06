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
  useEffect(()=>{ api.getAnalytics().then(s=>setStats(s)); api.allOrders().then(o=>setOrders(Array.isArray(o)?o.slice(0,8):[])); },[]);
  const STATUS_COLOR:any = {pending_payment:'#fef3c7',paid:'#d1fae5',packing:'#dbeafe',shipped:'#e0e7ff',delivered:'#d1fae5',cancelled:'#fee2e2'};
  const STATUS_TEXT:any = {pending_payment:'Pending Payment',paid:'Paid',packing:'Packing',shipped:'Shipped',delivered:'Delivered',cancelled:'Cancelled'};
  const statCards = stats ? [
    {label:'Revenue',value:`$${stats.revenue}`,icon:'💰',color:'#10b981'},
    {label:'Orders Today',value:stats.ordersToday,icon:'📦',color:p},
    {label:'Products',value:stats.totalProducts,icon:'📚',color:theme.secondaryColor},
    {label:'Customers',value:stats.totalCustomers,icon:'👥',color:theme.accentColor},
    {label:'Artists',value:stats.totalArtists,icon:'🎨',color:'#8b5cf6'},
    {label:'Total Orders',value:stats.totalOrders,icon:'📋',color:'#0ea5e9'},
  ] : [];
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
          <thead><tr style={{borderBottom:'2px solid #f1f5f9'}}>{['Order','Customer','Total','Type','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'7px 10px',fontSize:11,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{orders.map(o=>(
            <tr key={o.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'10px',fontSize:12,fontWeight:700,color:p}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
              <td style={{padding:'10px',fontSize:13}}>{o.customer_name||o.customerName}</td>
              <td style={{padding:'10px',fontWeight:800,color:'#1e293b'}}>${o.total}</td>
              <td style={{padding:'10px',fontSize:12,color:'#64748b'}}>{o.type==='digital'?'⬇️ Digital':'📦 Physical'}</td>
              <td style={{padding:'10px'}}><span style={{background:STATUS_COLOR[o.status]||'#f1f5f9',color:o.status==='paid'||o.status==='delivered'?'#059669':'#d97706',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{STATUS_TEXT[o.status]||o.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdminProducts({p,theme}:any) {
  const [products, setProducts] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const emptyForm = {title:'',price:'',originalPrice:'',category:'',description:'',image:'🎨',coverImageUrl:'',type:'digital',pages:'',tags:'',status:'published',digitalDownloadUrl:'',downloadInstruction:'',physicalStock:'0',shippingRequired:false,artistId:''};
  const [form, setForm] = useState({...emptyForm});

  const CATEGORIES = ['Animals','Fantasy','Botanicals','Mandala','Kawaii','Seasonal'];

  const load = () => {
    // Admin sees all products including drafts
    fetch('/api/products', {headers:{Authorization:`Bearer ${sessionStorage.getItem('fluffy_token')}`}})
      .then(r=>r.json()).then(d=>setProducts(Array.isArray(d)?d:[]));
    api.getArtists().then(a=>setArtists(Array.isArray(a)?a:[]));
  };
  useEffect(()=>{load();},[]);

  const setF = (k:string,v:any) => setForm(x=>({...x,[k]:v}));

  const save = async () => {
    if (!form.title||!form.price||!form.category) { setMsg('⚠️ Title, price and category required.'); return; }
    setSaving(true); setMsg('');
    const body = {
      title:form.title, price:parseFloat(form.price)||0,
      originalPrice: form.originalPrice ? parseFloat(form.originalPrice) : undefined,
      category:form.category, description:form.description, image:form.image,
      cover_image_url:form.coverImageUrl||null, type:form.type, pages:parseInt(form.pages)||0,
      tags:form.tags.split(',').map((t:string)=>t.trim()).filter(Boolean),
      status:form.status, digital_download_url:form.digitalDownloadUrl||null,
      download_instruction:form.downloadInstruction||null,
      physical_stock:parseInt(form.physicalStock)||0,
      shipping_required:form.shippingRequired,
      artist_id: form.artistId || undefined,
    };
    let result;
    if (editing) {
      result = await api.updateProduct(editing.id, body);
    } else {
      result = await api.createProduct(body);
    }
    if (result.error) { setMsg('⚠️ '+result.error); }
    else { setAdding(false); setEditing(null); setForm({...emptyForm}); load(); setMsg('✓ Product saved!'); }
    setSaving(false); setTimeout(()=>setMsg(''),4000);
  };

  const startEdit = (pr:any) => {
    setEditing(pr);
    setForm({
      title:pr.title||'', price:String(pr.price||''), originalPrice:String(pr.original_price||pr.originalPrice||''),
      category:pr.category||'', description:pr.description||'', image:pr.image||'🎨',
      coverImageUrl:pr.cover_image_url||pr.coverImageUrl||'', type:pr.type||'digital',
      pages:String(pr.pages||''), tags:(pr.tags||[]).join(', '), status:pr.status||'published',
      digitalDownloadUrl:pr.digital_download_url||'', downloadInstruction:pr.download_instruction||'',
      physicalStock:String(pr.physical_stock||0), shippingRequired:!!pr.shipping_required,
      artistId: pr.artist_id||'',
    });
    setAdding(true);
  };

  const del = async (id:string) => { if(!confirm('Delete?'))return; await api.deleteProduct(id); load(); };

  const inp = (label:string, key:string, placeholder='', type='text') => (
    <div style={{marginBottom:11}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>{label}</label>
      <input type={type} value={(form as any)[key]} onChange={e=>setF(key,e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}}
        onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')}
      />
    </div>
  );

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b'}}>Products</h1>
        <button onClick={()=>{setAdding(x=>!x);setEditing(null);setForm({...emptyForm});}} style={{background:p,color:'white',border:'none',cursor:'pointer',padding:'10px 18px',borderRadius:14,fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>
          {adding&&!editing?'✕ Cancel':'+ Add Product'}
        </button>
      </div>
      {msg&&<div style={{marginBottom:14,fontSize:13,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}

      {adding&&(
        <div style={{background:'white',borderRadius:18,padding:24,boxShadow:'0 2px 10px rgba(0,0,0,0.05)',marginBottom:20}}>
          <h3 style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:16}}>{editing?'Edit Product':'New Product'}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <div style={{gridColumn:'1/-1'}}>{inp('Title *','title','Product title')}</div>
            <div>{inp('Price *','price','9.99','number')}</div>
            <div>{inp('Original Price','originalPrice','12.99','number')}</div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Category *</label>
              <select value={form.category} onChange={e=>setF('category',e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
                <option value="">Select...</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Product Type</label>
              <select value={form.type} onChange={e=>setF('type',e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
                <option value="digital">⬇️ Digital</option>
                <option value="physical">📦 Physical</option>
                <option value="both">📦+⬇️ Both</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Status</label>
              <select value={form.status} onChange={e=>setF('status',e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
                <option value="published">✅ Published</option>
                <option value="draft">📝 Draft</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Artist</label>
              <select value={form.artistId} onChange={e=>setF('artistId',e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
                <option value="">Select artist...</option>
                {artists.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>{inp('Emoji Icon','image','🎨')}</div>
            <div>{inp('Pages','pages','30','number')}</div>
            <div style={{gridColumn:'1/-1'}}>{inp('Cover Image URL','coverImageUrl','https://...')}</div>
            {(form.type==='digital'||form.type==='both')&&<>
              <div style={{gridColumn:'1/-1'}}>{inp('Download URL (Google Drive or direct link)','digitalDownloadUrl','https://drive.google.com/...')}</div>
              <div style={{gridColumn:'1/-1'}}>{inp('Download Instructions','downloadInstruction','How to access your download...')}</div>
            </>}
            {(form.type==='physical'||form.type==='both')&&<>
              <div>{inp('Stock Quantity','physicalStock','0','number')}</div>
              <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:20}}>
                <input type="checkbox" checked={form.shippingRequired} onChange={e=>setF('shippingRequired',e.target.checked)} id="ship" style={{width:16,height:16,accentColor:p}} />
                <label htmlFor="ship" style={{fontSize:13,fontWeight:700,color:'#374151',cursor:'pointer'}}>Shipping Required</label>
              </div>
            </>}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Description</label>
              <textarea value={form.description} onChange={e=>setF('description',e.target.value)} rows={3} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,resize:'vertical',boxSizing:'border-box'}} />
            </div>
            <div style={{gridColumn:'1/-1'}}>{inp('Tags (comma-separated)','tags','bunnies, garden, spring')}</div>
          </div>
          <div style={{display:'flex',gap:8,marginTop:16}}>
            <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:'pointer',padding:'10px 24px',borderRadius:12,fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>{saving?'Saving...':'Save Product'}</button>
            <button onClick={()=>{setAdding(false);setEditing(null);}} style={{background:'transparent',border:`1.5px solid ${p}30`,color:'#64748b',cursor:'pointer',padding:'10px 20px',borderRadius:12,fontSize:14,fontWeight:600,fontFamily:theme.fontFamily}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['','Title','Artist','Type','Price','Status',''].map(h=><th key={h} style={{textAlign:'left',padding:'11px 13px',fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
          <tbody>{products.map(pr=>(
            <tr key={pr.id} style={{borderBottom:'1px solid #f8fafc'}}>
              <td style={{padding:'9px 13px',fontSize:22}}>{pr.cover_image_url?<img src={pr.cover_image_url} style={{width:32,height:32,borderRadius:6,objectFit:'cover'}}/>:pr.image}</td>
              <td style={{padding:'9px 13px',fontWeight:700,color:'#1e293b',fontSize:13}}>{pr.title}</td>
              <td style={{padding:'9px 13px',fontSize:12,color:'#64748b'}}>{pr.artist_name||pr.artistName}</td>
              <td style={{padding:'9px 13px'}}><span style={{background:p+'15',color:p,borderRadius:9,padding:'2px 8px',fontSize:10,fontWeight:700}}>{pr.type}</span></td>
              <td style={{padding:'9px 13px',fontWeight:800,fontSize:13}}>${pr.price}</td>
              <td style={{padding:'9px 13px'}}><span style={{background:pr.status==='published'?'#d1fae5':'#f1f5f9',color:pr.status==='published'?'#059669':'#888',borderRadius:9,padding:'2px 8px',fontSize:10,fontWeight:700}}>{pr.status||'published'}</span></td>
              <td style={{padding:'9px 13px',display:'flex',gap:6}}>
                <button onClick={()=>startEdit(pr)} style={{background:'#dbeafe',color:'#2563eb',border:'none',cursor:'pointer',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700}}>Edit</button>
                <button onClick={()=>del(pr.id)} style={{background:'#fee2e2',color:'#ef4444',border:'none',cursor:'pointer',padding:'4px 10px',borderRadius:8,fontSize:11,fontWeight:700}}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {!products.length&&<div style={{textAlign:'center',padding:32,color:'#94a3b8'}}>No products yet.</div>}
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
  const [marking, setMarking] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => api.allOrders().then(o=>setOrders(Array.isArray(o)?o:[]));
  useEffect(()=>{load();},[]);

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

  const markPaid = async () => {
    if (!selected) return;
    setMarking(true);
    try {
      const token = sessionStorage.getItem('fluffy_token');
      const r = await fetch(`/api/orders/pay?id=${selected.id}`, {method:'POST', headers:{Authorization:`Bearer ${token}`}});
      const updated = await r.json();
      if (updated.error) { setMsg('⚠️ '+updated.error); }
      else {
        setOrders(prev=>prev.map(o=>o.id===selected.id?updated:o));
        setSelected(updated);
        setMsg('✓ Marked as paid! Download links unlocked.');
      }
    } catch { setMsg('⚠️ Failed to mark as paid.'); }
    setMarking(false); setTimeout(()=>setMsg(''),4000);
  };

  const STATUS_OPTS = ['pending_payment','paid','packing','shipped','delivered','cancelled'];
  const STATUS_LABELS:any = {pending_payment:'Pending Payment',paid:'Paid',packing:'Packing',shipped:'Shipped',delivered:'Delivered',cancelled:'Cancelled'};
  const STATUS_COLOR:any = {pending_payment:'#fef3c7',paid:'#d1fae5',packing:'#dbeafe',shipped:'#e0e7ff',delivered:'#d1fae5',cancelled:'#fee2e2'};

  return (
    <div style={{padding:28,display:'grid',gridTemplateColumns:'1fr 360px',gap:20,alignItems:'start'}}>
      <div>
        <h1 style={{fontSize:24,fontWeight:900,color:'#1e293b',marginBottom:20}}>Orders</h1>
        <div style={{background:'white',borderRadius:18,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{background:'#f8fafc',borderBottom:'2px solid #f1f5f9'}}>{['Order','Customer','Total','Type','Status'].map(h=><th key={h} style={{textAlign:'left',padding:'11px 13px',fontSize:10,color:'#888',fontWeight:700,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
            <tbody>{orders.map(o=>(
              <tr key={o.id} style={{borderBottom:'1px solid #f8fafc',cursor:'pointer',background:selected?.id===o.id?p+'08':'white'}}
                onClick={()=>{setSelected(o);setTracking(o.tracking_number||o.trackingNumber||'');setProvider(o.shipping_provider||o.shippingProvider||'');setStatus(o.status);setMsg('');}}>
                <td style={{padding:'10px 13px',fontSize:12,fontWeight:700,color:p}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                <td style={{padding:'10px 13px',fontSize:13}}>{o.customer_name||o.customerName}</td>
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
          <h3 style={{fontSize:16,fontWeight:800,color:'#1e293b',marginBottom:4}}>#{(selected.id||'').slice(-8).toUpperCase()}</h3>
          <div style={{fontSize:12,color:'#94a3b8',marginBottom:4}}>{selected.customer_email||selected.customerEmail}</div>
          {(selected.customer_phone||selected.customerPhone)&&<div style={{fontSize:12,color:'#64748b',marginBottom:8}}>📞 {selected.customer_phone||selected.customerPhone}</div>}
          {(selected.shipping_address||selected.shippingAddress)&&(
            <div style={{fontSize:12,color:'#64748b',marginBottom:12,background:'#f8fafc',borderRadius:8,padding:'8px 10px'}}>
              📦 {JSON.stringify(selected.shipping_address||selected.shippingAddress)}
            </div>
          )}
          {selected.items?.map((i:any)=>(
            <div key={i.productId} style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:20}}>{i.image}</span>
              <div style={{flex:1,fontSize:12,fontWeight:600,color:'#1e293b'}}>{i.title}</div>
              <span style={{fontWeight:800,color:'#1e293b',fontSize:12}}>${i.price}</span>
            </div>
          ))}
          <div style={{height:1,background:'#f1f5f9',margin:'10px 0'}}/>
          <div style={{fontSize:15,fontWeight:900,color:'#1e293b',marginBottom:12}}>Total: ${selected.total}</div>

          {/* Mark as paid button - key feature */}
          {(selected.payment_status==='pending'||selected.paymentStatus==='pending')&&(
            <button onClick={markPaid} disabled={marking} style={{width:'100%',padding:'11px',background:marking?'#10b981aa':'#10b981',color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:13,fontWeight:800,fontFamily:theme.fontFamily,marginBottom:12}}>
              {marking?'Processing...':'✅ Mark as Paid'}
            </button>
          )}

          {(selected.payment_status==='paid'||selected.paymentStatus==='paid')&&(
            <div style={{background:'#d1fae5',borderRadius:10,padding:'8px 12px',fontSize:12,color:'#059669',fontWeight:700,marginBottom:12}}>
              ✅ Paid — {selected.type==='digital'?'Download links unlocked':'Physical order'}
            </div>
          )}

          <div style={{marginBottom:10}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily}}>
              {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          {selected.type==='physical'&&<>
            <div style={{marginBottom:8}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Shipping Provider</label>
              <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="UPS, FedEx, Thailand Post..." style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} />
            </div>
            <div style={{marginBottom:12}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Tracking Number</label>
              <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="TH123456789" style={{width:'100%',padding:'8px 12px',borderRadius:10,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} />
            </div>
          </>}
          {msg&&<div style={{marginBottom:10,fontSize:12,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
          <button onClick={save} disabled={saving} style={{width:'100%',padding:'10px',background:saving?p+'88':p,color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:13,fontWeight:800,fontFamily:theme.fontFamily}}>{saving?'Saving...':'Update Order'}</button>
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
              <td style={{padding:'11px 14px'}}><span style={{background:ROLE_COLORS[u.role]||'#f1f5f9',color:'#374151',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>{u.role}</span></td>
              <td style={{padding:'11px 14px',fontSize:12,color:'#94a3b8'}}>{u.created_at?new Date(u.created_at).toLocaleDateString():''}</td>
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
  const save = async () => { await saveTheme(draft); setSaved('✓ Saved!'); setTimeout(()=>setSaved(''),3000); };
  const SECTIONS = [['brand','🏷️','Brand & Logo'],['colors','🎨','Colors'],['hero','🖼️','Hero (Desktop)'],['mobile','📱','Hero (Mobile)'],['banner','📢','Banner'],['background','🌄','Background'],['layout','📐','Sections']] as const;
  const PRESETS = [
    {name:'Sakura',primaryColor:'#f472b6',secondaryColor:'#c084fc',accentColor:'#fb923c',bgColor:'#fdf2f8',bgColor2:'#faf5ff',textColor:'#4a1942'},
    {name:'Ocean',primaryColor:'#38bdf8',secondaryColor:'#818cf8',accentColor:'#34d399',bgColor:'#f0f9ff',bgColor2:'#eef2ff',textColor:'#0c4a6e'},
    {name:'Forest',primaryColor:'#4ade80',secondaryColor:'#a3e635',accentColor:'#facc15',bgColor:'#f0fdf4',bgColor2:'#f7fee7',textColor:'#14532d'},
    {name:'Sunset',primaryColor:'#fb923c',secondaryColor:'#f43f5e',accentColor:'#a78bfa',bgColor:'#fff7ed',bgColor2:'#fff1f2',textColor:'#431407'},
  ];
  const inp = (label:string, val:string, set:(v:string)=>void) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>{label}</label>
      <input value={val} onChange={e=>set(e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:11,border:`1.5px solid ${p}30`,fontSize:13,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box'}} />
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
          <ImageCropEditor title="Logo Image" hint="Square. Replaces emoji if set." value={draft.logoImageCrop} aspectRatio={1} onChange={v=>update('logoImageCrop',v)} />
        </>)}
        {section==='colors'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Color Palette</h2>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,fontWeight:700,color:'#888',marginBottom:10,textTransform:'uppercase'}}>Presets</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {PRESETS.map(pr=>(
                <button key={pr.name} onClick={()=>setDraft(d=>({...d,...pr}))} style={{padding:'7px 14px',borderRadius:18,border:`2px solid ${pr.primaryColor}`,background:`linear-gradient(135deg,${pr.bgColor},${pr.bgColor2})`,cursor:'pointer',fontSize:12,fontWeight:700,color:pr.textColor}}>{pr.name}</button>
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
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:20}}>Hero — Desktop</h2>
          {inp('Headline', draft.heroTitle, v=>update('heroTitle',v))}
          {inp('Subtitle', draft.heroSubtitle, v=>update('heroSubtitle',v))}
          {inp('Background Gradient', draft.heroBgColor, v=>update('heroBgColor',v))}
          <ImageCropEditor title="Hero Image" hint="Wide 1600×600px." value={draft.heroCrop} aspectRatio={16/6} onChange={v=>update('heroCrop',v)} />
        </>)}
        {section==='mobile'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Hero — Mobile</h2>
          <ImageCropEditor title="Mobile Hero" hint="Portrait 4:3." value={draft.mobileHeroCrop} aspectRatio={4/3} onChange={v=>update('mobileHeroCrop',v)} />
        </>)}
        {section==='banner'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:20}}>Banner</h2>
          {inp('Banner Text', draft.bannerText, v=>update('bannerText',v))}
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>Banner Color</label>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input type="color" value={draft.bannerBg} onChange={e=>update('bannerBg',e.target.value)} style={{width:40,height:36,borderRadius:9,border:'1.5px solid #e5e7eb',cursor:'pointer',padding:2}} />
              <input value={draft.bannerBg} onChange={e=>update('bannerBg',e.target.value)} style={{flex:1,padding:'8px 10px',borderRadius:10,border:`1.5px solid ${p}25`,fontSize:12,outline:'none',fontFamily:'monospace'}} />
            </div>
          </div>
          <div style={{borderRadius:11,overflow:'hidden',marginBottom:16}}><div style={{background:draft.bannerBg,color:'white',textAlign:'center',padding:10,fontSize:13,fontWeight:600}}>{draft.bannerText}</div></div>
        </>)}
        {section==='background'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Site Background</h2>
          <ImageCropEditor title="Background Image" hint="Large image. Focal point for responsive." value={draft.bgImageCrop} aspectRatio={16/9} onChange={v=>update('bgImageCrop',v)} />
        </>)}
        {section==='layout'&&(<>
          <h2 style={{fontSize:18,fontWeight:900,color:'#1e293b',marginBottom:16}}>Homepage Sections</h2>
          {draft.sections?.map((s,i)=>{
            const labels:any={hero:'🌟 Hero Banner',featured:'⭐ Featured',categories:'📂 Categories',artists:'🎨 Artists',newsletter:'💌 Newsletter'};
            return (
              <div key={s} style={{display:'flex',alignItems:'center',gap:10,background:'#f8fafc',borderRadius:12,padding:'12px 16px',marginBottom:8}}>
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
