import React, { useState, useEffect } from 'react';
import { useTheme, ThemeConfig } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import ImageCropEditor from '../components/ImageCropEditor';

const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';
type Tab = 'dashboard'|'products'|'orders'|'artists'|'theme';

// Sidebar nav item
function NavItem({icon,label,active,onClick}:any) {
  return (
    <button onClick={onClick} style={{
      width:'100%', padding:'11px 16px', borderRadius:12, border:'none',
      cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10,
      marginBottom:2, background:active?'#fce7f3':'transparent',
      color:active?'#f472b6':'#6b7280', fontWeight:active?700:500,
      fontSize:14, fontFamily:'inherit', transition:'all 0.15s',
    }}>
      <span style={{fontSize:16}}>{icon}</span> {label}
    </button>
  );
}

export default function AdminPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');

  useEffect(()=>{
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin' || user.email !== ADMIN_EMAIL) { navigate('/'); }
  }, [user]);

  if (!user || user.role !== 'admin' || user.email !== ADMIN_EMAIL) return null;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f9fafb', fontFamily:"'Nunito', sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width:220, background:'white', borderRight:'1px solid #f3f4f6', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', boxShadow:'2px 0 8px rgba(0,0,0,0.04)' }}>
        {/* Logo */}
        <div style={{ padding:'24px 20px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:22 }}>⚙️</span>
            <span style={{ fontSize:20, fontWeight:900, color:'#f472b6' }}>Admin</span>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>Fluffy Pub Studio</div>
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:'0 12px' }}>
          <NavItem icon="📊" label="Dashboard" active={tab==='dashboard'} onClick={()=>setTab('dashboard')} />
          <NavItem icon="📚" label="Products"  active={tab==='products'}  onClick={()=>setTab('products')} />
          <NavItem icon="📦" label="Orders"    active={tab==='orders'}    onClick={()=>setTab('orders')} />
          <NavItem icon="🎨" label="Artists"   active={tab==='artists'}   onClick={()=>setTab('artists')} />
          <NavItem icon="✨" label="Theme & CMS" active={tab==='theme'}   onClick={()=>setTab('theme')} />
        </nav>

        {/* Footer */}
        <div style={{ padding:'16px 12px', borderTop:'1px solid #f3f4f6' }}>
          <button onClick={()=>navigate('/')} style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px solid #e5e7eb', color:'#6b7280', cursor:'pointer', background:'transparent', fontSize:13, fontWeight:600, marginBottom:8, fontFamily:'inherit' }}>← View Store</button>
          <button onClick={async()=>{await logout();navigate('/');}} style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px solid #fca5a5', color:'#ef4444', cursor:'pointer', background:'#fef2f2', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Sign Out</button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex:1, overflow:'auto' }}>
        {tab==='dashboard' && <DashboardTab />}
        {tab==='products'  && <ProductsTab />}
        {tab==='orders'    && <OrdersTab />}
        {tab==='artists'   && <ArtistsTab />}
        {tab==='theme'     && <ThemeTab />}
      </div>
    </div>
  );
}

// ── Shared helpers ──────────────────────────────────────────────────────────
const P = '#f472b6';
const card = { background:'white', borderRadius:16, boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #f3f4f6' };
const badge = (color:string, bg:string, text:string) => (
  <span style={{ background:bg, color, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' as const }}>{text}</span>
);

const STATUS_COLOR:any = { pending_payment:['#d97706','#fef3c7'], paid:['#059669','#d1fae5'], packing:['#2563eb','#dbeafe'], shipped:['#7c3aed','#ede9fe'], delivered:['#059669','#d1fae5'], cancelled:['#dc2626','#fee2e2'] };
const STATUS_TEXT:any  = { pending_payment:'Pending Payment', paid:'Paid', packing:'Packing', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled' };

// ── Dashboard ───────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(()=>{ api.getAnalytics().then(s=>setStats(s)); api.allOrders().then(o=>setOrders(Array.isArray(o)?o.slice(0,6):[])); },[]);

  const statCards = stats ? [
    {label:'Total Revenue',   value:`$${stats.revenue}`,       icon:'💰', color:'#10b981', bg:'#d1fae5'},
    {label:'Orders Today',    value:stats.ordersToday,          icon:'📦', color:P,         bg:'#fce7f3'},
    {label:'Total Products',  value:stats.totalProducts,        icon:'📚', color:'#8b5cf6', bg:'#ede9fe'},
    {label:'Customers',       value:stats.totalCustomers,       icon:'👥', color:'#f59e0b', bg:'#fef3c7'},
    {label:'Artists',         value:stats.totalArtists,         icon:'🎨', color:'#06b6d4', bg:'#cffafe'},
    {label:'Total Orders',    value:stats.totalOrders,          icon:'📋', color:'#64748b', bg:'#f1f5f9'},
  ] : [];

  return (
    <div style={{ padding:32 }}>
      <h1 style={{ fontSize:28, fontWeight:900, color:'#111827', margin:'0 0 24px' }}>Dashboard</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:28 }}>
        {statCards.map(s=>(
          <div key={s.label} style={{ ...card, padding:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:12, color:'#6b7280', fontWeight:600, marginBottom:6, textTransform:'uppercase' as const, letterSpacing:0.5 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color:'#111827' }}>{s.value ?? '—'}</div>
              </div>
              <div style={{ width:44, height:44, borderRadius:12, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card, padding:24 }}>
        <h3 style={{ fontSize:16, fontWeight:800, color:'#111827', margin:'0 0 16px' }}>Recent Orders</h3>
        {orders.length===0 ? <div style={{textAlign:'center',padding:'24px',color:'#9ca3af'}}>No orders yet</div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'2px solid #f3f4f6' }}>
                {['Order','Customer','Total','Type','Status'].map(h=>(
                  <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:11, color:'#9ca3af', fontWeight:700, textTransform:'uppercase' as const, letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o=>{
                const [c,bg] = STATUS_COLOR[o.status]||['#6b7280','#f1f5f9'];
                return (
                  <tr key={o.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                    <td style={{ padding:'12px', fontSize:13, fontWeight:700, color:P }}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                    <td style={{ padding:'12px', fontSize:13, color:'#374151' }}>{o.customer_name||o.customerName}</td>
                    <td style={{ padding:'12px', fontWeight:800, color:'#111827' }}>${o.total}</td>
                    <td style={{ padding:'12px', fontSize:12, color:'#6b7280' }}>{o.type==='digital'?'⬇️ Digital':'📦 Physical'}</td>
                    <td style={{ padding:'12px' }}>{badge(c,bg,STATUS_TEXT[o.status]||o.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Products ────────────────────────────────────────────────────────────────
function ProductsTab() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const EMPTY = {title:'',price:'',originalPrice:'',category:'',description:'',image:'🎨',coverImageUrl:'',type:'digital',pages:'',tags:'',status:'published',digitalDownloadUrl:'',downloadInstruction:'',physicalStock:'0',shippingRequired:false,artistId:''};
  const [form, setForm] = useState({...EMPTY});
  const CATEGORIES = ['Animals','Fantasy','Botanicals','Mandala','Kawaii','Seasonal'];
  const sf = (k:string,v:any) => setForm(x=>({...x,[k]:v}));

  const load = () => {
    fetch('/api/products',{headers:{Authorization:`Bearer ${sessionStorage.getItem('fluffy_token')}`}})
      .then(r=>r.json()).then(d=>setProducts(Array.isArray(d)?d:[]));
    api.getArtists().then(a=>setArtists(Array.isArray(a)?a:[]));
  };
  useEffect(()=>{load();},[]);

  const startEdit = (pr:any) => {
    setEditing(pr);
    setForm({ title:pr.title||'', price:String(pr.price||''), originalPrice:String(pr.original_price||''),
      category:pr.category||'', description:pr.description||'', image:pr.image||'🎨',
      coverImageUrl:pr.cover_image_url||'', type:pr.type||'digital', pages:String(pr.pages||''),
      tags:(pr.tags||[]).join(', '), status:pr.status||'published',
      digitalDownloadUrl:pr.digital_download_url||'', downloadInstruction:pr.download_instruction||'',
      physicalStock:String(pr.physical_stock||0), shippingRequired:!!pr.shipping_required, artistId:pr.artist_id||'' });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title||!form.price||!form.category){setMsg('⚠️ Title, price and category required.');return;}
    setSaving(true); setMsg('');
    const body:any = { title:form.title, price:parseFloat(form.price)||0, category:form.category,
      description:form.description, image:form.image, cover_image_url:form.coverImageUrl||null,
      type:form.type, pages:parseInt(form.pages)||0, tags:form.tags.split(',').map((t:string)=>t.trim()).filter(Boolean),
      status:form.status, digital_download_url:form.digitalDownloadUrl||null,
      download_instruction:form.downloadInstruction||null,
      physical_stock:parseInt(form.physicalStock)||0, shipping_required:form.shippingRequired,
      artist_id:form.artistId||undefined };
    if (form.originalPrice) body.original_price = parseFloat(form.originalPrice);
    const result = editing ? await api.updateProduct(editing.id, body) : await api.createProduct(body);
    if (result.error){setMsg('⚠️ '+result.error);}
    else{setShowForm(false);setEditing(null);setForm({...EMPTY});load();setMsg('✓ Saved!');}
    setSaving(false); setTimeout(()=>setMsg(''),4000);
  };

  const del = async (id:string) => { if(!confirm('Delete this product?'))return; await api.deleteProduct(id); load(); };

  const Field = ({label,k,placeholder='',type='text'}:{label:string,k:string,placeholder?:string,type?:string}) => (
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
      <input type={type} value={(form as any)[k]} onChange={e=>sf(k,e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
      />
    </div>
  );

  return (
    <div style={{padding:32}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:0}}>Products</h1>
        <button onClick={()=>{setShowForm(x=>!x);setEditing(null);setForm({...EMPTY});}}
          style={{background:P,color:'white',border:'none',cursor:'pointer',padding:'11px 22px',borderRadius:24,fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 14px ${P}44`}}>
          {showForm&&!editing?'✕ Cancel':'+ Add Product'}
        </button>
      </div>
      {msg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:12,background:msg.startsWith('✓')?'#d1fae5':'#fee2e2',color:msg.startsWith('✓')?'#065f46':'#991b1b',fontSize:13,fontWeight:600}}>{msg}</div>}

      {showForm&&(
        <div style={{...card,padding:28,marginBottom:24}}>
          <h3 style={{fontSize:17,fontWeight:800,color:'#111827',margin:'0 0 20px'}}>{editing?'Edit Product':'New Product'}</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}><Field label="Title *" k="title" placeholder="Product title" /></div>
            <Field label="Price *" k="price" placeholder="9.99" type="number" />
            <Field label="Original Price" k="originalPrice" placeholder="12.99" type="number" />
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Category *</label>
              <select value={form.category} onChange={e=>sf('category',e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="">Select category...</option>
                {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Product Type</label>
              <select value={form.type} onChange={e=>sf('type',e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="digital">⬇️ Digital</option>
                <option value="physical">📦 Physical</option>
                <option value="both">📦+⬇️ Both</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Status</label>
              <select value={form.status} onChange={e=>sf('status',e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="published">✅ Published</option>
                <option value="draft">📝 Draft</option>
              </select>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Artist</label>
              <select value={form.artistId} onChange={e=>sf('artistId',e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="">Select artist...</option>
                {artists.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <Field label="Emoji Icon" k="image" placeholder="🎨" />
            <Field label="Pages" k="pages" placeholder="30" type="number" />
            <div style={{gridColumn:'1/-1'}}><Field label="Cover Image URL" k="coverImageUrl" placeholder="https://..." /></div>
            {(form.type==='digital'||form.type==='both')&&<>
              <div style={{gridColumn:'1/-1'}}><Field label="Download URL (Google Drive or direct)" k="digitalDownloadUrl" placeholder="https://drive.google.com/..." /></div>
              <div style={{gridColumn:'1/-1'}}><Field label="Download Instructions" k="downloadInstruction" placeholder="How to access your download..." /></div>
            </>}
            {(form.type==='physical'||form.type==='both')&&<>
              <Field label="Stock Quantity" k="physicalStock" type="number" />
              <div style={{display:'flex',alignItems:'center',gap:8,paddingTop:22}}>
                <input type="checkbox" checked={form.shippingRequired} onChange={e=>sf('shippingRequired',e.target.checked)} id="ship" style={{width:16,height:16,accentColor:P}} />
                <label htmlFor="ship" style={{fontSize:13,fontWeight:700,color:'#374151',cursor:'pointer'}}>Shipping Required</label>
              </div>
            </>}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Description</label>
              <textarea value={form.description} onChange={e=>sf('description',e.target.value)} rows={3}
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}} />
            </div>
            <div style={{gridColumn:'1/-1'}}><Field label="Tags (comma-separated)" k="tags" placeholder="bunnies, garden, spring" /></div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button onClick={save} disabled={saving} style={{background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',padding:'11px 28px',borderRadius:20,fontSize:14,fontWeight:700,fontFamily:'inherit'}}>{saving?'Saving...':'Save Product'}</button>
            <button onClick={()=>{setShowForm(false);setEditing(null);}} style={{background:'white',border:'1.5px solid #e5e7eb',color:'#6b7280',cursor:'pointer',padding:'11px 22px',borderRadius:20,fontSize:14,fontWeight:600,fontFamily:'inherit'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>
              {['','TITLE','ARTIST','CATEGORY','PRICE','STATUS',''].map((h,i)=>(
                <th key={i} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(pr=>(
              <tr key={pr.id} style={{borderBottom:'1px solid #f9fafb',transition:'background 0.1s'}}
                onMouseEnter={e=>(e.currentTarget.style.background='#fafafa')}
                onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                <td style={{padding:'14px 16px',fontSize:28,width:52}}>{pr.cover_image_url?<img src={pr.cover_image_url} style={{width:36,height:36,borderRadius:8,objectFit:'cover'}}/>:pr.image}</td>
                <td style={{padding:'14px 16px',fontWeight:700,color:'#111827',fontSize:14}}>{pr.title}</td>
                <td style={{padding:'14px 16px',fontSize:13,color:'#6b7280'}}>{pr.artist_name||pr.artistName}</td>
                <td style={{padding:'14px 16px'}}>{badge(P,'#fce7f3',pr.category)}</td>
                <td style={{padding:'14px 16px',fontWeight:800,color:'#111827',fontSize:14}}>${pr.price}</td>
                <td style={{padding:'14px 16px'}}>{badge(pr.status==='published'?'#059669':'#6b7280',pr.status==='published'?'#d1fae5':'#f3f4f6',pr.status==='published'?'Active':'Draft')}</td>
                <td style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',gap:6}}>
                    <button onClick={()=>startEdit(pr)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>Edit</button>
                    <button onClick={()=>del(pr.id)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:600,color:'#ef4444'}}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>No products yet. Click "+ Add Product" to get started!</div>}
      </div>
    </div>
  );
}

// ── Orders ──────────────────────────────────────────────────────────────────
function OrdersTab() {
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

  const select = (o:any) => { setSelected(o); setTracking(o.tracking_number||o.trackingNumber||''); setProvider(o.shipping_provider||o.shippingProvider||''); setStatus(o.status); setMsg(''); };

  const save = async () => {
    if (!selected) return; setSaving(true);
    const updated = await api.updateOrder(selected.id, { status, trackingNumber:tracking, shippingProvider:provider });
    setOrders(prev=>prev.map(o=>o.id===selected.id?updated:o));
    setSelected(updated); setSaving(false); setMsg('✓ Updated!'); setTimeout(()=>setMsg(''),3000);
  };

  const markPaid = async () => {
    if (!selected) return; setMarking(true);
    try {
      const token = sessionStorage.getItem('fluffy_token');
      const r = await fetch(`/api/orders/pay?id=${selected.id}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const updated = await r.json();
      if (updated.error){setMsg('⚠️ '+updated.error);}
      else{setOrders(prev=>prev.map(o=>o.id===selected.id?updated:o));setSelected(updated);setMsg('✓ Marked as paid! Downloads unlocked.');}
    } catch{setMsg('⚠️ Failed.');}
    setMarking(false); setTimeout(()=>setMsg(''),4000);
  };

  const STATUS_OPTS = ['pending_payment','paid','packing','shipped','delivered','cancelled'];

  return (
    <div style={{padding:32,display:'grid',gridTemplateColumns:'1fr 360px',gap:24,alignItems:'start'}}>
      <div>
        <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:'0 0 24px'}}>Orders</h1>
        <div style={{...card,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>
                {['ORDER','CUSTOMER','TOTAL','TYPE','STATUS'].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map(o=>{
                const [c,bg] = STATUS_COLOR[o.status]||['#6b7280','#f1f5f9'];
                return (
                  <tr key={o.id} style={{borderBottom:'1px solid #f9fafb',cursor:'pointer',background:selected?.id===o.id?'#fdf2f8':'white'}}
                    onClick={()=>select(o)}
                    onMouseEnter={e=>{if(selected?.id!==o.id)(e.currentTarget.style.background='#fafafa');}}
                    onMouseLeave={e=>{if(selected?.id!==o.id)(e.currentTarget.style.background='white');}}>
                    <td style={{padding:'13px 16px',fontSize:13,fontWeight:700,color:P}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                    <td style={{padding:'13px 16px',fontSize:13,color:'#374151'}}>{o.customer_name||o.customerName}</td>
                    <td style={{padding:'13px 16px',fontWeight:800,color:'#111827'}}>${o.total}</td>
                    <td style={{padding:'13px 16px',fontSize:12,color:'#6b7280'}}>{o.type==='digital'?'⬇️ Digital':'📦 Physical'}</td>
                    <td style={{padding:'13px 16px'}}>{badge(c,bg,STATUS_TEXT[o.status]||o.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {orders.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af'}}>No orders yet</div>}
        </div>
      </div>

      {selected&&(
        <div style={{...card,padding:24,position:'sticky',top:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
            <div>
              <div style={{fontWeight:800,color:'#111827',fontSize:15}}>#{(selected.id||'').slice(-8).toUpperCase()}</div>
              <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{selected.customer_email||selected.customerEmail}</div>
            </div>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16}}>✕</button>
          </div>

          {(selected.customer_phone||selected.customerPhone)&&(
            <div style={{fontSize:13,color:'#374151',marginBottom:8}}>📞 {selected.customer_phone||selected.customerPhone}</div>
          )}
          {(selected.shipping_address||selected.shippingAddress)&&(
            <div style={{fontSize:12,color:'#6b7280',background:'#f9fafb',borderRadius:8,padding:'8px 12px',marginBottom:12}}>
              📦 {JSON.stringify(selected.shipping_address||selected.shippingAddress)}
            </div>
          )}

          <div style={{borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6',padding:'12px 0',marginBottom:14}}>
            {selected.items?.map((i:any,idx:number)=>(
              <div key={idx} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <span style={{fontSize:20}}>{i.image}</span>
                <span style={{flex:1,fontSize:13,color:'#374151',fontWeight:600}}>{i.title}</span>
                <span style={{fontWeight:800,color:'#111827',fontSize:13}}>${i.price}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontWeight:900,color:'#111827',fontSize:15}}>
              <span>Total</span><span>${selected.total}</span>
            </div>
          </div>

          {/* Mark as paid */}
          {(selected.payment_status==='pending'||selected.paymentStatus==='pending')&&(
            <button onClick={markPaid} disabled={marking} style={{width:'100%',padding:'12px',background:marking?'#10b981aa':'#10b981',color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:14,fontWeight:700,fontFamily:'inherit',marginBottom:12,boxShadow:'0 4px 12px #10b98144'}}>
              {marking?'Processing...':'✅ Mark as Paid'}
            </button>
          )}
          {(selected.payment_status==='paid'||selected.paymentStatus==='paid')&&(
            <div style={{background:'#d1fae5',borderRadius:10,padding:'9px 14px',fontSize:13,color:'#065f46',fontWeight:700,marginBottom:12}}>
              ✅ Payment confirmed
            </div>
          )}

          <div style={{marginBottom:10}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Update Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
              {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_TEXT[s]}</option>)}
            </select>
          </div>

          {selected.type==='physical'&&<>
            <div style={{marginBottom:10}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Shipping Provider</label>
              <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="Thailand Post, Kerry, Flash..."
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} />
            </div>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Tracking Number</label>
              <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="TH123456789"
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} />
            </div>
          </>}

          {msg&&<div style={{marginBottom:10,fontSize:12,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
          <button onClick={save} disabled={saving} style={{width:'100%',padding:'11px',background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 12px ${P}44`}}>
            {saving?'Saving...':'Update Order'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Artists ─────────────────────────────────────────────────────────────────
function ArtistsTab() {
  const [artists, setArtists] = useState<any[]>([]);
  const AVATARS = ['🎨','🌸','✨','🐰','🌺','💕','🦊','🌈','🦄','🍓'];
  useEffect(()=>{api.getArtists().then(x=>setArtists(Array.isArray(x)?x:[]));}, []);
  return (
    <div style={{padding:32}}>
      <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:'0 0 24px'}}>Artists</h1>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:20}}>
        {artists.map((a,idx)=>(
          <div key={a.id} style={{...card,padding:24}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <div style={{width:52,height:52,borderRadius:'50%',background:'#fce7f3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0}}>
                {AVATARS[idx%AVATARS.length]}
              </div>
              <div>
                <div style={{fontWeight:800,color:'#111827',fontSize:16}}>{a.name}</div>
                <div style={{fontSize:12,color:'#9ca3af',marginTop:2}}>{a.productCount} products</div>
              </div>
            </div>
            <p style={{fontSize:13,color:'#6b7280',lineHeight:1.6,margin:'0 0 16px'}}>{a.bio||'No bio yet.'}</p>
            <div style={{display:'flex',gap:10}}>
              <button style={{flex:1,padding:'9px',borderRadius:20,background:P,color:'white',border:'none',cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>View Profile</button>
              <button style={{flex:1,padding:'9px',borderRadius:20,background:'white',color:P,border:`1.5px solid ${P}`,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit'}}>Products</button>
            </div>
          </div>
        ))}
        {artists.length===0&&<div style={{color:'#9ca3af',fontSize:14,padding:20}}>No artists registered yet.</div>}
      </div>
    </div>
  );
}

// ── Theme & CMS ──────────────────────────────────────────────────────────────
function ThemeTab() {
  const { theme, saveTheme } = useTheme();
  const [draft, setDraft] = useState<ThemeConfig>({...theme});
  const [section, setSection] = useState('brand');
  const [saved, setSaved] = useState('');
  const upd = (k:keyof ThemeConfig,v:any) => setDraft(p=>({...p,[k]:v}));
  const save = async () => { await saveTheme(draft); setSaved('✓ Saved!'); setTimeout(()=>setSaved(''),3000); };

  const SECTIONS = [['brand','🏷️','Brand & Logo'],['colors','🎨','Colors'],['hero','⭐','Hero Section'],['banner','📢','Banner'],['pages','📐','Page Sections'],['background','🖼️','Background']] as const;
  const PRESETS = [
    {name:'Sakura',primaryColor:'#f472b6',secondaryColor:'#c084fc',accentColor:'#fb923c',bgColor:'#fdf2f8',bgColor2:'#faf5ff',textColor:'#4a1942'},
    {name:'Ocean', primaryColor:'#38bdf8',secondaryColor:'#818cf8',accentColor:'#34d399',bgColor:'#f0f9ff',bgColor2:'#eef2ff',textColor:'#0c4a6e'},
    {name:'Forest',primaryColor:'#4ade80',secondaryColor:'#a3e635',accentColor:'#facc15',bgColor:'#f0fdf4',bgColor2:'#f7fee7',textColor:'#14532d'},
    {name:'Sunset',primaryColor:'#fb923c',secondaryColor:'#f43f5e',accentColor:'#a78bfa',bgColor:'#fff7ed',bgColor2:'#fff1f2',textColor:'#431407'},
    {name:'Lavender',primaryColor:'#a78bfa',secondaryColor:'#f0abfc',accentColor:'#fb7185',bgColor:'#f5f3ff',bgColor2:'#fdf4ff',textColor:'#2e1065'},
  ];

  const TextField = ({label,val,set}:{label:string,val:string,set:(v:string)=>void}) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>{label}</label>
      <input value={val} onChange={e=>set(e.target.value)} style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
    </div>
  );

  return (
    <div style={{padding:32,display:'grid',gridTemplateColumns:'240px 1fr',gap:24}}>
      {/* Sidebar */}
      <div>
        <div style={{...card,overflow:'hidden',marginBottom:16}}>
          {SECTIONS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setSection(id)} style={{width:'100%',padding:'13px 16px',border:'none',textAlign:'left',cursor:'pointer',display:'flex',gap:10,alignItems:'center',background:section===id?'#fce7f3':'transparent',borderLeft:`3px solid ${section===id?P:'transparent'}`,color:section===id?P:'#374151',fontWeight:section===id?700:500,fontSize:14,fontFamily:'inherit',borderBottom:'1px solid #f3f4f6'}}>
              {icon} {label}
            </button>
          ))}
        </div>
        <button onClick={save} style={{width:'100%',padding:'13px',background:P,color:'white',border:'none',cursor:'pointer',borderRadius:16,fontSize:15,fontWeight:800,fontFamily:'inherit',boxShadow:`0 4px 16px ${P}44`,marginBottom:12}}>
          💾 {saved||'Save Changes'}
        </button>
        <div style={{background:'#fef3c7',borderRadius:12,padding:'12px 14px',fontSize:12,color:'#92400e',lineHeight:1.6}}>
          ⚡ Changes preview when you change inputs. Click Save to apply globally.
        </div>
      </div>

      {/* Content */}
      <div style={{...card,padding:28}}>
        {section==='brand'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:4}}>Brand & Logo</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Customize your store's identity</p>
          <TextField label="Store Name" val={draft.logoText} set={v=>upd('logoText',v)} />
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>Logo Emoji</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
              {['🐰','🌸','🎨','🦊','🐱','🌈','💕','🍓','🦄','🌺','✨','🎀'].map(e=>(
                <button key={e} onClick={()=>upd('logoEmoji',e)} style={{width:44,height:44,borderRadius:12,border:`2px solid ${draft.logoEmoji===e?P:'#e5e7eb'}`,background:draft.logoEmoji===e?'#fce7f3':'white',cursor:'pointer',fontSize:22,transition:'all 0.15s'}}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{padding:20,borderRadius:14,background:'#fdf2f8',border:`2px dashed ${P}40`,textAlign:'center' as const}}>
            <div style={{fontSize:32,marginBottom:6}}>{draft.logoEmoji}</div>
            <div style={{fontSize:20,fontWeight:900,color:draft.primaryColor,fontFamily:draft.fontFamily}}>{draft.logoText}</div>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Preview</div>
          </div>
        </>)}

        {section==='colors'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:4}}>Colors</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>Choose a preset or customize each color</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:20}}>
            {PRESETS.map(pr=>(
              <button key={pr.name} onClick={()=>setDraft(d=>({...d,...pr}))} style={{padding:'8px 16px',borderRadius:20,border:`2px solid ${pr.primaryColor}`,background:`linear-gradient(135deg,${pr.bgColor},${pr.bgColor2})`,cursor:'pointer',fontSize:13,fontWeight:700,color:pr.textColor}}>
                {pr.name}
              </button>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            {([['primaryColor','Primary Color'],['secondaryColor','Secondary Color'],['accentColor','Accent Color'],['textColor','Text Color'],['bgColor','Background 1'],['bgColor2','Background 2']] as const).map(([k,label])=>(
              <div key={k}>
                <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>{label}</label>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="color" value={draft[k] as string} onChange={e=>upd(k,e.target.value)} style={{width:40,height:38,borderRadius:8,border:'1.5px solid #e5e7eb',cursor:'pointer',padding:2}} />
                  <input value={draft[k] as string} onChange={e=>upd(k,e.target.value)} style={{flex:1,padding:'9px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:12,outline:'none',fontFamily:'monospace'}} />
                </div>
              </div>
            ))}
          </div>
        </>)}

        {section==='hero'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:20}}>Hero Section</h2>
          <TextField label="Headline" val={draft.heroTitle} set={v=>upd('heroTitle',v)} />
          <TextField label="Subtitle" val={draft.heroSubtitle} set={v=>upd('heroSubtitle',v)} />
          <TextField label="Background Gradient (CSS)" val={draft.heroBgColor} set={v=>upd('heroBgColor',v)} />
          <ImageCropEditor title="Hero Image (Desktop)" hint="Wide image 1600×600px. Drag to position." value={draft.heroCrop} aspectRatio={16/6} onChange={v=>upd('heroCrop',v)} />
          <div style={{marginTop:16}}><ImageCropEditor title="Hero Image (Mobile)" hint="Portrait 4:3 crop." value={draft.mobileHeroCrop} aspectRatio={4/3} onChange={v=>upd('mobileHeroCrop',v)} /></div>
        </>)}

        {section==='banner'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:20}}>Banner</h2>
          <TextField label="Banner Text" val={draft.bannerText} set={v=>upd('bannerText',v)} />
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>Banner Color</label>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input type="color" value={draft.bannerBg} onChange={e=>upd('bannerBg',e.target.value)} style={{width:40,height:38,borderRadius:8,border:'1.5px solid #e5e7eb',cursor:'pointer',padding:2}} />
              <input value={draft.bannerBg} onChange={e=>upd('bannerBg',e.target.value)} style={{flex:1,padding:'9px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:12,outline:'none',fontFamily:'monospace'}} />
            </div>
          </div>
          <div style={{borderRadius:12,overflow:'hidden'}}><div style={{background:draft.bannerBg,color:'white',textAlign:'center' as const,padding:'11px',fontSize:13,fontWeight:600}}>{draft.bannerText}</div></div>
        </>)}

        {section==='pages'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:8}}>Page Sections</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Reorder homepage sections with ↑↓</p>
          {draft.sections?.map((s,i)=>{
            const labels:any={hero:'🌟 Hero Banner',featured:'⭐ Featured',categories:'📂 Categories',artists:'🎨 Artists',newsletter:'💌 Newsletter'};
            return (
              <div key={s} style={{display:'flex',alignItems:'center',gap:12,background:'#fafafa',borderRadius:12,padding:'13px 16px',marginBottom:8,border:'1px solid #f3f4f6'}}>
                <span style={{color:'#d1d5db',fontSize:16}}>⠿</span>
                <span style={{flex:1,fontWeight:600,fontSize:14,color:'#374151'}}>{labels[s]||s}</span>
                <button onClick={()=>{const a=[...draft.sections];if(i>0){[a[i],a[i-1]]=[a[i-1],a[i]];upd('sections',a);}}} disabled={i===0} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:i===0?'not-allowed':'pointer',opacity:i===0?0.4:1,fontSize:13}}>↑</button>
                <button onClick={()=>{const a=[...draft.sections];if(i<a.length-1){[a[i],a[i+1]]=[a[i+1],a[i]];upd('sections',a);}}} disabled={i===draft.sections.length-1} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:i===draft.sections.length-1?'not-allowed':'pointer',opacity:i===draft.sections.length-1?0.4:1,fontSize:13}}>↓</button>
              </div>
            );
          })}
        </>)}

        {section==='background'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:8}}>Background</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Upload a site-wide background image</p>
          <ImageCropEditor title="Background Image" hint="Large image. Set focal point for responsive display." value={draft.bgImageCrop} aspectRatio={16/9} onChange={v=>upd('bgImageCrop',v)} />
        </>)}
      </div>
    </div>
  );
}
