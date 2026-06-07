import React, { useState, useEffect, useCallback, useRef } from 'react';
import ImageUpload from '../components/ImageUpload';
import RichDescEditor, { Block } from '../components/RichDescEditor';
import { FooterConfig, FooterColumn, FooterLink } from '../lib/theme';
import { DEFAULT_TRANSLATIONS } from '../lib/lang';
import { useTheme, ThemeConfig } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import ImageCropEditor from '../components/ImageCropEditor';

const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';
type Tab = 'dashboard'|'products'|'orders'|'artists'|'theme';

function NavItem({icon,label,active,onClick}:any) {
  return (
    <button onClick={onClick} style={{ width:'100%', padding:'11px 16px', borderRadius:12, border:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10, marginBottom:2, background:active?'#fce7f3':'transparent', color:active?'#f472b6':'#6b7280', fontWeight:active?700:500, fontSize:14, fontFamily:'inherit' }}>
      <span style={{fontSize:16}}>{icon}</span>{label}
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
    if (user.role !== 'admin' || user.email !== ADMIN_EMAIL) navigate('/');
  }, [user]);

  if (!user || user.role !== 'admin' || user.email !== ADMIN_EMAIL) return null;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f9fafb', fontFamily:"'Nunito', sans-serif" }}>
      <div style={{ width:220, background:'white', borderRight:'1px solid #f3f4f6', display:'flex', flexDirection:'column', position:'sticky', top:0, height:'100vh', boxShadow:'2px 0 8px rgba(0,0,0,0.04)' }}>
        <div style={{ padding:'24px 20px 20px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ fontSize:22 }}>⚙️</span>
            <span style={{ fontSize:20, fontWeight:900, color:'#f472b6' }}>Admin</span>
          </div>
          <div style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>Fluffy Pub Studio</div>
        </div>
        <nav style={{ flex:1, padding:'0 12px' }}>
          <NavItem icon="📊" label="Dashboard" active={tab==='dashboard'} onClick={()=>setTab('dashboard')} />
          <NavItem icon="📚" label="Products"  active={tab==='products'}  onClick={()=>setTab('products')} />
          <NavItem icon="📦" label="Orders"    active={tab==='orders'}    onClick={()=>setTab('orders')} />
          <NavItem icon="🎨" label="Artists"   active={tab==='artists'}   onClick={()=>setTab('artists')} />
          <NavItem icon="✨" label="Theme & CMS" active={tab==='theme'}   onClick={()=>setTab('theme')} />
          <NavItem icon="🌐" label="Language CMS" active={tab==='lang'}    onClick={()=>setTab('lang')} />
        </nav>
        <div style={{ padding:'16px 12px', borderTop:'1px solid #f3f4f6' }}>
          <button onClick={()=>navigate('/')} style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px solid #e5e7eb', color:'#6b7280', cursor:'pointer', background:'transparent', fontSize:13, fontWeight:600, marginBottom:8, fontFamily:'inherit' }}>← View Store</button>
          <button onClick={async()=>{await logout();navigate('/');}} style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px solid #fca5a5', color:'#ef4444', cursor:'pointer', background:'#fef2f2', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Sign Out</button>
        </div>
      </div>
      <div style={{ flex:1, overflow:'auto' }}>
        {tab==='dashboard' && <DashboardTab />}
        {tab==='products'  && <ProductsTab />}
        {tab==='orders'    && <OrdersTab />}
        {tab==='artists'   && <ArtistsTab />}
        {tab==='theme'     && <ThemeTab />}
        {tab==='lang'      && <LanguageCMSTab />}
      </div>
    </div>
  );
}

const P = '#f472b6';
const card = { background:'white', borderRadius:16, boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #f3f4f6' };

function Badge({color,bg,text}:{color:string,bg:string,text:string}) {
  return <span style={{ background:bg, color, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' as const }}>{text}</span>;
}

const STATUS_COLOR:any = { pending_payment:['#d97706','#fef3c7'], paid:['#059669','#d1fae5'], packing:['#2563eb','#dbeafe'], shipped:['#7c3aed','#ede9fe'], delivered:['#059669','#d1fae5'], cancelled:['#dc2626','#fee2e2'] };
const STATUS_TEXT:any  = { pending_payment:'Pending Payment', paid:'Paid', packing:'Packing', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled' };

// ── Dashboard ──────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [, setTab] = useState('dashboard'); // for navigation
  useEffect(()=>{ api.getAnalytics().then(s=>setStats(s)); api.allOrders().then(o=>setOrders(Array.isArray(o)?o.slice(0,8):[])); },[]);

  const statusCards = stats ? [
    {label:'Pending Payment',value:stats.byStatus?.pending_payment||0,icon:'⏳',color:'#d97706',bg:'#fef3c7',status:'pending_payment'},
    {label:'Paid',value:stats.byStatus?.paid||0,icon:'✅',color:'#059669',bg:'#d1fae5',status:'paid'},
    {label:'Preparing',value:stats.byStatus?.packing||0,icon:'📦',color:'#2563eb',bg:'#dbeafe',status:'packing'},
    {label:'Shipped',value:stats.byStatus?.shipped||0,icon:'🚚',color:'#7c3aed',bg:'#ede9fe',status:'shipped'},
    {label:'Delivered',value:stats.byStatus?.delivered||0,icon:'🎉',color:'#059669',bg:'#d1fae5',status:'delivered'},
    {label:'Cancelled',value:stats.byStatus?.cancelled||0,icon:'❌',color:'#dc2626',bg:'#fee2e2',status:'cancelled'},
  ] : [];

  const topCards = stats ? [
    {label:'Revenue (THB)',value:`฿${(stats.revenue_thb||0).toLocaleString('th-TH')}`,icon:'💰',color:'#10b981',bg:'#d1fae5'},
    {label:'Orders Today',value:stats.ordersToday||0,icon:'📅',color:P,bg:'#fce7f3'},
    {label:'This Month',value:stats.ordersThisMonth||0,icon:'📆',color:'#8b5cf6',bg:'#ede9fe'},
    {label:'Total Products',value:stats.totalProducts||0,icon:'📚',color:'#f59e0b',bg:'#fef3c7'},
  ] : [];

  return (
    <div style={{padding:28}}>
      <h1 style={{fontSize:26,fontWeight:900,color:'#111827',margin:'0 0 20px'}}>Dashboard 📊</h1>

      {/* Top stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {topCards.map(s=>(
          <div key={s.label} style={{...card,padding:18}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:11,color:'#6b7280',fontWeight:600,marginBottom:4,textTransform:'uppercase' as const,letterSpacing:0.5}}>{s.label}</div>
                <div style={{fontSize:24,fontWeight:900,color:'#111827'}}>{s.value??'—'}</div>
              </div>
              <div style={{width:40,height:40,borderRadius:10,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:24}}>
        {statusCards.map(s=>(
          <div key={s.label} style={{...card,padding:14,textAlign:'center' as const,cursor:'pointer',borderLeft:`3px solid ${s.color}`}}>
            <div style={{fontSize:22,marginBottom:4}}>{s.icon}</div>
            <div style={{fontSize:20,fontWeight:900,color:s.color}}>{s.value}</div>
            <div style={{fontSize:10,color:'#6b7280',fontWeight:600,marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div style={{...card,padding:20}}>
        <h3 style={{fontSize:15,fontWeight:800,color:'#111827',margin:'0 0 14px'}}>Recent Orders</h3>
        {orders.length===0?<div style={{textAlign:'center',padding:'20px',color:'#9ca3af'}}>No orders yet</div>:(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #f3f4f6'}}>{['Order','Customer','Amount','Status','Date'].map(h=><th key={h} style={{textAlign:'left',padding:'8px 10px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
            <tbody>{orders.map(o=>{const[c,bg]=STATUS_COLOR[o.status]||['#6b7280','#f1f5f9'];return(
              <tr key={o.id} style={{borderBottom:'1px solid #f9fafb'}}>
                <td style={{padding:'10px',fontSize:12,fontWeight:700,color:P}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                <td style={{padding:'10px',fontSize:12,color:'#374151'}}>{o.customer_name||''}</td>
                <td style={{padding:'10px',fontWeight:800,color:'#111827',fontSize:12}}>฿{(o.total_thb||o.total_amount||(parseFloat(o.total||'0')*35)).toLocaleString('th-TH')}</td>
                <td style={{padding:'10px'}}><Badge color={c} bg={bg} text={STATUS_TEXT[o.status]||o.status}/></td>
                <td style={{padding:'10px',fontSize:11,color:'#9ca3af'}}>{new Date(o.created_at).toLocaleDateString('th-TH')}</td>
              </tr>
            );})}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Products (FIXED: no focus loss) ────────────────────────────────────────
function ProductsTab() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state — all in one object, never recreated
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [categories_sel, setCategories_sel] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('🎨');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [type, setType] = useState('digital');
  const [pages, setPages] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('published');
  const [digitalDownloadUrl, setDigitalDownloadUrl] = useState('');
  const [downloadInstruction, setDownloadInstruction] = useState('');
  const [physicalStock, setPhysicalStock] = useState('0');
  const [shippingRequired, setShippingRequired] = useState(false);
  const [shippingNote, setShippingNote] = useState('');
  const [artistId, setArtistId] = useState('');
  const [isDigital, setIsDigital] = useState(true);
  const [isPhysical, setIsPhysical] = useState(false);
  const [richBlocks, setRichBlocks] = useState<Block[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [titleTh, setTitleTh] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [priceTHB, setPriceTHB] = useState('');

  const [descTh, setDescTh] = useState('');

  const [categories, setCategories] = useState<string[]>(['Animals','Fantasy','Botanicals','Mandala','Kawaii','Seasonal']);
  const [newCat, setNewCat] = useState('');
  const [showCatMgr, setShowCatMgr] = useState(false);

  const load = useCallback(() => {
    fetch('/api/products',{headers:{Authorization:`Bearer ${localStorage.getItem('fluffy_token')}`}})
      .then(r=>r.json()).then(d=>setProducts(Array.isArray(d)?d:[]));
    api.getArtists().then((a:any)=>setArtists(Array.isArray(a)?a:[]));
  }, []);

  useEffect(()=>{load();},[load]);

  const resetForm = () => {
    setTitle(''); setPrice(''); setOriginalPrice(''); setCategories_sel([]);
    setDescription(''); setImage('🎨'); setCoverImageUrl(''); setType('digital');
    setPages(''); setTags(''); setStatus('published'); setDigitalDownloadUrl('');
    setDownloadInstruction(''); setPhysicalStock('0'); setShippingRequired(false); setShippingNote('');
    setArtistId(''); setIsDigital(true); setIsPhysical(false); setRichBlocks([]);
    setEditingId(null);
  };

  const startEdit = (pr:any) => {
    setTitle(pr.title||''); setPrice(String(pr.price||'')); setOriginalPrice(String(pr.original_price||''));
    setCategories_sel(pr.category ? (Array.isArray(pr.category) ? pr.category : [pr.category]) : []); setDescription(pr.description||''); setImage(pr.image||'🎨');
    setCoverImageUrl(pr.cover_image_url||''); setType(pr.type||'digital'); setPages(String(pr.pages||''));
    setTags((pr.tags||[]).join(', ')); setStatus(pr.status||'published');
    setDigitalDownloadUrl(pr.digital_download_url||''); setDownloadInstruction(pr.download_instruction||'');
    setPhysicalStock(String(pr.physical_stock||0)); setShippingRequired(!!pr.shipping_required);
    setShippingNote(pr.shipping_note||''); setArtistId(pr.artist_id||'');
    setIsDigital(pr.is_digital !== false);
    setIsPhysical(!!pr.is_physical);
    setRichBlocks(Array.isArray(pr.rich_description) ? pr.rich_description : []);
    setVariants(Array.isArray(pr.variants) ? pr.variants : []);
    setTitleTh(pr.title_th||''); setTitleEn(pr.title_en||'');
    setPriceTHB(String(pr.price_thb||''));
    setDescTh(pr.description_th||'');
    setEditingId(pr.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!title||!priceTHB||!categories_sel.length){setMsg('⚠️ กรุณาใส่ชื่อ ราคา และหมวดหมู่ / Title, price and category required.');return;}
    setSaving(true); setMsg('');
    const body:any = { title, price:parseFloat(priceTHB)||0, category:categories_sel[0]||'', description,
      rich_description:richBlocks.length?richBlocks:null, image,
      cover_image_url:coverImageUrl||null,
      is_digital:isDigital, is_physical:isPhysical,
      type:isPhysical?'physical':'digital', // DB only allows 'digital' or 'physical'
      pages:parseInt(pages)||0,
      tags:tags.split(',').map((t:string)=>t.trim()).filter(Boolean), status,
      digital_download_url:isDigital?(digitalDownloadUrl||null):null,
      download_instruction:isDigital?(downloadInstruction||null):null,
      physical_stock:isPhysical?(parseInt(physicalStock)||0):0,
      shipping_required:isPhysical?shippingRequired:false,
      shipping_note:isPhysical?shippingNote:'',
      artist_id:artistId||undefined,
      variants:variants,
      title_th:titleTh||null, title_en:titleEn||null,
      price_thb:priceTHB?parseFloat(priceTHB):null,
      description_th:descTh||null };
    if (originalPrice) body.original_price = parseFloat(originalPrice);
    const result = editingId ? await api.updateProduct(editingId, body) : await api.createProduct(body);
    if (result.error){setMsg('⚠️ '+result.error);}
    else{setShowForm(false);resetForm();load();setMsg('✓ Saved!');}
    setSaving(false); setTimeout(()=>setMsg(''),4000);
  };

  const del = async (id:string) => { if(!confirm('Delete this product?'))return; await api.deleteProduct(id); load(); };

  // Stable input component — NOT defined inside render, uses direct state setters
  const inp = (label:string, value:string, onChange:(v:string)=>void, placeholder='', type='text') => (
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
      />
    </div>
  );

  return (
    <div style={{padding:32}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:0}}>Products</h1>
        <button onClick={()=>{if(showForm&&!editingId){setShowForm(false);resetForm();}else{setShowForm(true);setEditingId(null);resetForm();}}}
          style={{background:P,color:'white',border:'none',cursor:'pointer',padding:'11px 22px',borderRadius:24,fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 14px ${P}44`}}>
          {showForm&&!editingId?'✕ Cancel':'+ Add Product'}
        </button>
      </div>
      {msg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:12,background:msg.startsWith('✓')?'#d1fae5':'#fee2e2',color:msg.startsWith('✓')?'#065f46':'#991b1b',fontSize:13,fontWeight:600}}>{msg}</div>}

      {showForm&&(
        <div style={{...card,padding:28,marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:17,fontWeight:800,color:'#111827',margin:0}}>{editingId?'Edit Product':'New Product'}</h3>
            {editingId&&<button onClick={()=>{setShowForm(false);resetForm();}} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:18}}>✕</button>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div style={{gridColumn:'1/-1'}}>{inp('Title (EN) *', title, setTitle, 'Product title in English')}</div>
            {inp('Title (TH)', titleTh, setTitleTh, 'ชื่อสินค้าภาษาไทย')}
            {inp('Title (EN fallback)', titleEn, setTitleEn, 'English title fallback')}
            {inp('ราคาขาย (THB ฿) *', priceTHB, setPriceTHB, '350', 'number')}
            {inp('ราคาเปรียบเทียบ (THB ฿)', originalPrice, setOriginalPrice, '490', 'number')}
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Category *</label>
              <div style={{display:'flex',gap:6,marginBottom:6}}>
                <div style={{flex:1,display:'flex',flexWrap:'wrap' as const,gap:7,padding:'8px 0'}}>
                  {categories.map(cat=>(
                    <label key={cat} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',background:categories_sel.includes(cat)?P+'15':'#f9fafb',border:`1.5px solid ${categories_sel.includes(cat)?P:'#e5e7eb'}`,borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,color:categories_sel.includes(cat)?P:'#374151',transition:'all 0.1s'}}>
                      <input type="checkbox" checked={categories_sel.includes(cat)} onChange={e=>{setCategories_sel(prev=>e.target.checked?[...prev,cat]:prev.filter(c=>c!==cat));}} style={{accentColor:P,width:13,height:13}} />
                      {cat}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={()=>setShowCatMgr(x=>!x)} style={{padding:'9px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',background:showCatMgr?'#fdf2f8':'white',cursor:'pointer',fontSize:12,color:P,fontWeight:700}}>⚙️</button>
              </div>
              {showCatMgr&&(
                <div style={{background:'#fdf2f8',borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:P,marginBottom:8}}>Manage Categories</div>
                  <div style={{display:'flex',gap:6,marginBottom:8}}>
                    <input value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="New category name..."
                      style={{flex:1,padding:'7px 10px',borderRadius:8,border:`1.5px solid ${P}30`,fontSize:12,outline:'none',fontFamily:'inherit'}}
                      onKeyDown={e=>{if(e.key==='Enter'&&newCat.trim()){setCategories(cats=>[...cats,newCat.trim()]);setNewCat('');}}}
                    />
                    <button type="button" onClick={()=>{if(newCat.trim()){setCategories(cats=>[...cats,newCat.trim()]);setNewCat('');}}} style={{padding:'7px 12px',borderRadius:8,border:'none',background:P,color:'white',cursor:'pointer',fontSize:12,fontWeight:700}}>Add</button>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap' as const,gap:6}}>
                    {categories.map(cat=>(
                      <span key={cat} style={{background:'white',border:`1px solid ${P}30`,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,color:'#374151',display:'flex',alignItems:'center',gap:4}}>
                        {cat}
                        <button type="button" onClick={()=>setCategories(cats=>cats.filter(c=>c!==cat))} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:12,padding:0,lineHeight:1}}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Artist</label>
              <select value={artistId} onChange={e=>setArtistId(e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="">Select artist...</option>
                {artists.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:10}}>ประเภทสินค้า / Product Type</label>
              <div style={{display:'flex',gap:12,flexWrap:'wrap' as const}}>
                <label style={{display:'flex',gap:7,alignItems:'center',cursor:'pointer',background:isDigital?'#dbeafe':'#f9fafb',border:`2px solid ${isDigital?'#3b82f6':'#e5e7eb'}`,borderRadius:12,padding:'10px 18px',fontSize:13,fontWeight:700,color:isDigital?'#1d4ed8':'#374151',transition:'all 0.1s'}}>
                  <input type="checkbox" checked={isDigital} onChange={e=>setIsDigital(e.target.checked)} style={{width:16,height:16,accentColor:'#3b82f6'}} />
                  ⬇️ ไฟล์ดิจิทัล / Digital File
                </label>
                <label style={{display:'flex',gap:7,alignItems:'center',cursor:'pointer',background:isPhysical?'#d1fae5':'#f9fafb',border:`2px solid ${isPhysical?'#10b981':'#e5e7eb'}`,borderRadius:12,padding:'10px 18px',fontSize:13,fontWeight:700,color:isPhysical?'#065f46':'#374151',transition:'all 0.1s'}}>
                  <input type="checkbox" checked={isPhysical} onChange={e=>setIsPhysical(e.target.checked)} style={{width:16,height:16,accentColor:'#10b981'}} />
                  📦 หนังสือจริง / Physical Book
                </label>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="published">✅ Published</option>
                <option value="draft">📝 Draft</option>
              </select>
            </div>
            {inp('Emoji Icon', image, setImage, '🎨')}
            {inp('Pages', pages, setPages, '30', 'number')}
            <div style={{gridColumn:'1/-1'}}><ImageUpload label="Cover Image" value={coverImageUrl} onChange={setCoverImageUrl} folder="products" hint="Recommended: 800×600px" /></div>
            {isDigital&&(
              <div style={{gridColumn:'1/-1',background:'#eff6ff',border:'1.5px solid #bfdbfe',borderRadius:14,padding:'16px 18px'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#1d4ed8',marginBottom:12}}>⬇️ Digital File Settings</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {inp('ราคาไฟล์ดิจิทัล (THB ฿)', priceTHB, setPriceTHB, '149', 'number')}
                  {inp('Download URL', digitalDownloadUrl, setDigitalDownloadUrl, 'https://drive.google.com/...')}
                </div>
                <div style={{marginTop:8}}>{inp('Download Instructions', downloadInstruction, setDownloadInstruction, 'วิธีดาวน์โหลดไฟล์ / How to access download...', false)}</div>
                <div style={{marginTop:8,fontSize:12,color:'#1d4ed8',background:'#dbeafe',borderRadius:8,padding:'8px 12px'}}>
                  💡 ลูกค้าจะได้รับลิงค์ดาวน์โหลดทางอีเมลหลังจากแอดมินยืนยันการชำระเงิน
                </div>
              </div>
            )}
            {isPhysical&&(
              <div style={{gridColumn:'1/-1',background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:14,padding:'16px 18px'}}>
                <div style={{fontSize:13,fontWeight:800,color:'#065f46',marginBottom:12}}>📦 Physical Book Settings</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:8}}>
                  {inp('Stock Quantity', physicalStock, setPhysicalStock, '0', 'number')}
                  {inp('Shipping Note', shippingNote, setShippingNote, 'น้ำหนัก/ขนาด/ระยะเวลาจัดส่ง', false)}
                </div>
                <div style={{fontSize:12,color:'#065f46',background:'#dcfce7',borderRadius:8,padding:'8px 12px',marginBottom:8}}>
                  💡 เพิ่ม Variant ด้านล่างสำหรับรูปแบบต่างๆ เช่น สันห่วงปกติ / สันห่วงเปิดบน พร้อมราคาแต่ละแบบ
                </div>
                <label style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>
                  <input type="checkbox" checked={shippingRequired} onChange={e=>setShippingRequired(e.target.checked)} style={{width:14,height:14,accentColor:'#10b981'}} />
                  ต้องจัดส่ง / Shipping Required
                </label>
              </div>
            )}
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Description (EN)</label>
              <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3}
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Description (TH) คำอธิบาย</label>
              <textarea value={descTh} onChange={e=>setDescTh(e.target.value)} rows={3}
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>Rich Description</label>
              <RichDescEditor blocks={richBlocks} onChange={setRichBlocks} />
            </div>
            <div style={{gridColumn:'1/-1'}}>{inp('Tags (comma-separated)', tags, setTags, 'bunnies, garden, spring')}</div>
            <div style={{gridColumn:'1/-1'}}>
              <VariantsEditor variants={variants} onChange={setVariants} />
            </div>
          </div>
          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button onClick={save} disabled={saving} style={{background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',padding:'11px 28px',borderRadius:20,fontSize:14,fontWeight:700,fontFamily:'inherit'}}>{saving?'Saving...':'Save Product'}</button>
            <button onClick={()=>{setShowForm(false);resetForm();}} style={{background:'white',border:'1.5px solid #e5e7eb',color:'#6b7280',cursor:'pointer',padding:'11px 22px',borderRadius:20,fontSize:14,fontWeight:600,fontFamily:'inherit'}}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{['','TITLE','ARTIST','CATEGORY','PRICE','STATUS',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>{products.map(pr=>(
            <tr key={pr.id} style={{borderBottom:'1px solid #f9fafb'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#fafafa')}
              onMouseLeave={e=>(e.currentTarget.style.background='white')}>
              <td style={{padding:'14px 16px',width:52,fontSize:28}}>{pr.cover_image_url?<img src={pr.cover_image_url} style={{width:36,height:36,borderRadius:8,objectFit:'cover'}}/>:pr.image}</td>
              <td style={{padding:'14px 16px',fontWeight:700,color:'#111827',fontSize:14}}>{pr.title}</td>
              <td style={{padding:'14px 16px',fontSize:13,color:'#6b7280'}}>{pr.artist_name||pr.artistName}</td>
              <td style={{padding:'14px 16px'}}><Badge color={P} bg="#fce7f3" text={pr.category}/></td>
              <td style={{padding:'14px 16px',fontWeight:800,color:'#111827',fontSize:14}}>฿{pr.price_thb > 0 ? Number(pr.price_thb).toLocaleString('th-TH') : pr.price_thb || '—'}</td>
              <td style={{padding:'14px 16px'}}><Badge color={pr.status==='published'?'#059669':'#6b7280'} bg={pr.status==='published'?'#d1fae5':'#f3f4f6'} text={pr.status==='published'?'Active':'Draft'}/></td>
              <td style={{padding:'14px 16px'}}>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>startEdit(pr)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>Edit</button>
                  <button onClick={()=>del(pr.id)} style={{padding:'5px 14px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:600,color:'#ef4444'}}>Delete</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {products.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>No products yet. Click "+ Add Product" to get started!</div>}
      </div>
    </div>
  );
}

// ── Orders ─────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [tracking, setTracking] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);

  const load = () => api.allOrders().then(o=>setOrders(Array.isArray(o)?o:[]));
  useEffect(()=>{load();},[]);

  const sendReminders = async () => {
    if (!reminderIds.length) return;
    setSendingReminder(true);
    const token = localStorage.getItem('fluffy_token') || '';
    const res = await fetch('/api/orders?action=reminder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderIds: reminderIds }),
    });
    const data = await res.json();
    if (data.error) { setMsg('⚠️ ' + data.error); }
    else {
      setOrders(prev => prev.map(o => reminderIds.includes(o.id) ? { ...o, payment_reminder_sent_at: new Date().toISOString() } : o));
      setReminderIds([]);
      setMsg('✓ Sent reminders to ' + reminderIds.length + ' order(s)');
    }
    setSendingReminder(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const select = (o:any) => {
    setSelected(o);
    setTracking(o.tracking_number||'');
    setProvider(o.shipping_provider||'');
    setStatus(o.status);
    setMsg('');
  };

  const save = async () => {
    if (!selected) return; setSaving(true);
    const updated = await api.updateOrder(selected.id, { status, tracking_number:tracking, shipping_provider:provider });
    setOrders(prev=>prev.map(o=>o.id===selected.id?{...o,...updated}:o));
    setSelected((prev:any)=>({...prev,...updated})); setSaving(false); setMsg('✓ Updated!'); setTimeout(()=>setMsg(''),3000);
  };

  const markPaid = async () => {
    if (!selected) return; setMarking(true);
    try {
      const token = localStorage.getItem('fluffy_token');
      const r = await fetch(`/api/orders?action=pay&id=${selected.id}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const updated = await r.json();
      if (updated.error) setMsg('⚠️ '+updated.error);
      else { setOrders(prev=>prev.map(o=>o.id===selected.id?updated:o)); setSelected(updated); setMsg('✓ Marked as paid!'); }
    } catch { setMsg('⚠️ Failed.'); }
    setMarking(false); setTimeout(()=>setMsg(''),4000);
  };

  const deleteOrder = async (id:string) => {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    setDeleting(true);
    await api.deleteOrder(id);
    setOrders(prev=>prev.filter(o=>o.id!==id));
    if (selected?.id===id) setSelected(null);
    setDeleting(false);
  };

  const printSlip = (o:any) => {
    const sa = o.shipping_address || {};
    const addr = typeof sa === 'string' ? sa : [sa.address,sa.province,sa.postal_code,sa.country].filter(Boolean).join(', ');
    const ref = (o.id||'').slice(-8).toUpperCase();
    const totalTHB = o.total_thb || o.total_amount || (parseFloat(o.total||'0')*35);
    const shippingTHB = o.shipping_thb || 0;

    // Build item rows from snapshot fields — same data as admin order detail
    const itemRows = (o.items||[]).map((i:any) => {
      const optionType: string = i.optionType || (i.type==='digital' ? 'digital' : 'physical');
      const optionName: string = i.optionName || i.variant?.name || '';
      const qty: number = i.qty || 1;
      const unitPrice: number = i.unitPriceTHB || i.price_thb || (i.price ? Math.round(i.price*35) : 0);
      const lineTotal: number = i.lineTotalTHB || (unitPrice * qty);
      return `
        <div class="item">
          <div class="item-title">${i.title}</div>
          ${optionName ? `<div class="item-variant">📌 ${optionName}</div>` : ''}
          <div class="item-meta">${optionType === 'digital' ? '⬇️ Digital' : '📦 Physical'} · Qty: ${qty}</div>
          <div class="item-price">
            ฿${lineTotal.toLocaleString('th-TH')}
            ${qty > 1 ? `<span class="unit-price">฿${unitPrice.toLocaleString('th-TH')} × ${qty}</span>` : ''}
          </div>
        </div>`;
    }).join('');

    const w = window.open('','_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Packing Slip #${ref}</title>
      <style>
        body { font-family: 'Sarabun', sans-serif; padding: 24px; max-width: 420px; margin: 0 auto; color: #111; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        .order-ref { font-size: 13px; color: #555; margin-bottom: 4px; }
        .date { font-size: 11px; color: #888; margin-bottom: 16px; }
        hr { border: none; border-top: 1px solid #ddd; margin: 12px 0; }
        .section-title { font-size: 11px; font-weight: 700; color: #888; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px; }
        .ship-to { font-size: 13px; line-height: 1.6; margin-bottom: 4px; }
        .item { background: #f9fafb; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; border-left: 3px solid #d1fae5; }
        .item.digital { border-left-color: #bfdbfe; }
        .item-title { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
        .item-variant { font-size: 12px; color: #374151; font-weight: 600; margin-bottom: 2px; }
        .item-meta { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
        .item-price { font-weight: 800; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
        .unit-price { font-size: 10px; color: #9ca3af; font-weight: 400; }
        .totals { margin-top: 4px; }
        .total-row { display: flex; justify-content: space-between; font-size: 12px; color: #555; margin: 3px 0; }
        .total-row.grand { font-weight: 900; font-size: 15px; color: #111; margin-top: 6px; padding-top: 6px; border-top: 1px solid #ddd; }
        @media print { body { padding: 8px; } }
      </style>
    </head><body>
      <h2>📦 Packing Slip</h2>
      <div class="order-ref">Order #${ref}</div>
      <div class="date">${new Date(o.created_at).toLocaleString('th-TH')}</div>
      <hr>
      <div class="section-title">Ship To</div>
      <div class="ship-to">
        <strong>${o.customer_name}</strong><br>
        ${addr ? addr + '<br>' : ''}
        ${o.customer_phone || ''}
      </div>
      <hr>
      <div class="section-title">Items</div>
      ${itemRows}
      <hr>
      <div class="totals">
        ${shippingTHB > 0 ? `<div class="total-row"><span>Shipping</span><span>฿${shippingTHB.toLocaleString('th-TH')}</span></div>` : ''}
        <div class="total-row grand"><span>Total</span><span>฿${Number(totalTHB).toLocaleString('th-TH')}</span></div>
      </div>
      <script>window.print();<\/script>
    </body></html>`);
  };

  const filteredOrders = filterStatus==='all' ? orders : orders.filter(o=>o.status===filterStatus);
  const STATUS_OPTS = ['pending_payment','paid','packing','shipped','delivered','cancelled'];
  const FILTER_TABS = [{k:'all',label:'All'},{k:'pending_payment',label:'Pending'},{k:'paid',label:'Paid'},{k:'packing',label:'Preparing'},{k:'shipped',label:'Shipped'},{k:'delivered',label:'Delivered'},{k:'cancelled',label:'Cancelled'}];

  const fmtAddr = (sa:any) => {
    if (!sa) return '';
    if (typeof sa === 'string') return sa;
    return [sa.address,sa.province,sa.postal_code,sa.country].filter(Boolean).join(', ');
  };

  return (
    <div style={{padding:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h1 style={{fontSize:24,fontWeight:900,color:'#111827',margin:0}}>Orders ({filteredOrders.length})</h1>
      </div>

      {/* Reminder panel */}
      {(()=>{
        const now = Date.now();
        const eligible = orders.filter(o => o.status==='pending_payment' && !o.slip_url && (now - new Date(o.created_at).getTime()) > 48*60*60*1000);
        if (!eligible.length) return null;
        return (
          <div style={{background:'#fef3c7',border:'1.5px solid #fcd34d',borderRadius:14,padding:'12px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap' as const}}>
            <span style={{fontSize:13,color:'#92400e',fontWeight:700}}>⏰ {eligible.length} order(s) pending 48h+ without slip</span>
            <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,flex:1}}>
              {eligible.map((o:any)=>(
                <label key={o.id} style={{display:'flex',gap:5,alignItems:'center',cursor:'pointer',fontSize:12,color:'#92400e',fontWeight:600,background:'white',borderRadius:8,padding:'3px 8px',border:'1px solid #fcd34d'}}>
                  <input type="checkbox" checked={reminderIds.includes(o.id)} onChange={e=>setReminderIds(prev=>e.target.checked?[...prev,o.id]:prev.filter(x=>x!==o.id))} style={{accentColor:'#d97706'}} />
                  #{(o.id||'').slice(-6).toUpperCase()}{o.payment_reminder_sent_at?' (reminded)':''}
                </label>
              ))}
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {msg&&<span style={{fontSize:12,color:'#059669',fontWeight:600}}>{msg}</span>}
              <button onClick={sendReminders} disabled={!reminderIds.length||sendingReminder}
                style={{background:reminderIds.length?'#d97706':'#e5e7eb',color:reminderIds.length?'white':'#9ca3af',border:'none',cursor:reminderIds.length&&!sendingReminder?'pointer':'not-allowed',padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:700,fontFamily:'inherit'}}>
                {sendingReminder?'Sending...':'📧 Send Reminder'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Status filter tabs */}
      <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap' as const}}>
        {FILTER_TABS.map(ft=>{
          const count = ft.k==='all'?orders.length:orders.filter(o=>o.status===ft.k).length;
          return (
            <button key={ft.k} onClick={()=>setFilterStatus(ft.k)} style={{padding:'6px 14px',borderRadius:20,border:`1.5px solid ${filterStatus===ft.k?P:'#e5e7eb'}`,background:filterStatus===ft.k?P:'white',color:filterStatus===ft.k?'white':'#374151',cursor:'pointer',fontSize:12,fontWeight:600,fontFamily:'inherit'}}>
              {ft.label} <span style={{opacity:0.7}}>({count})</span>
            </button>
          );
        })}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 380px',gap:20,alignItems:'start'}}>
        <div style={{...card,overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>
              {['Order','Date','Customer','Amount','Status',''].map(h=><th key={h} style={{textAlign:'left' as const,padding:'10px 12px',fontSize:10,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}
            </tr></thead>
            <tbody>{filteredOrders.map(o=>{
              const[c,bg]=STATUS_COLOR[o.status]||['#6b7280','#f1f5f9'];
              const thb = o.total_thb||o.total_amount||(parseFloat(o.total||'0')*35);
              return (
                <tr key={o.id} style={{borderBottom:'1px solid #f9fafb',cursor:'pointer',background:selected?.id===o.id?'#fdf2f8':'white'}}
                  onClick={()=>select(o)} onMouseEnter={e=>{if(selected?.id!==o.id)e.currentTarget.style.background='#fafafa';}} onMouseLeave={e=>{if(selected?.id!==o.id)e.currentTarget.style.background='white';}}>
                  <td style={{padding:'11px 12px',fontSize:12,fontWeight:700,color:P}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                  <td style={{padding:'11px 12px',fontSize:11,color:'#9ca3af'}}>{new Date(o.created_at).toLocaleDateString('th-TH',{day:'2-digit',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</td>
                  <td style={{padding:'11px 12px',fontSize:12,color:'#374151'}}>
                    <div style={{fontWeight:600}}>{o.customer_name}</div>
                    <div style={{fontSize:10,color:'#9ca3af'}}>{o.customer_phone}</div>
                  </td>
                  <td style={{padding:'11px 12px',fontWeight:800,color:'#111827',fontSize:13}}>฿{Number(thb).toLocaleString('th-TH')}</td>
                  <td style={{padding:'11px 12px'}}><Badge color={c} bg={bg} text={STATUS_TEXT[o.status]||o.status}/></td>
                  <td style={{padding:'11px 12px'}}>
                    {o.payment_reminder_sent_at&&<span style={{fontSize:10,background:'#fef3c7',color:'#92400e',borderRadius:6,padding:'2px 6px',fontWeight:600,whiteSpace:'nowrap' as const}}>reminded</span>}
                  <button onClick={e=>{e.stopPropagation();deleteOrder(o.id);}} disabled={deleting} style={{background:'none',border:'none',cursor:'pointer',color:'#fca5a5',fontSize:14,padding:4}}>🗑</button>
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
          {filteredOrders.length===0&&<div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>No orders {filterStatus!=='all'?`with status "${filterStatus}"`:'yet'}</div>}
        </div>

        {selected&&(
          <div style={{...card,padding:20,position:'sticky' as const,top:20,maxHeight:'90vh',overflowY:'auto' as const}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
              <div>
                <div style={{fontWeight:800,color:'#111827',fontSize:15}}>#{(selected.id||'').slice(-8).toUpperCase()}</div>
                <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{new Date(selected.created_at).toLocaleString('th-TH')}</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>printSlip(selected)} style={{background:'#f3f4f6',border:'none',cursor:'pointer',padding:'5px 10px',borderRadius:8,fontSize:11,fontWeight:600}}>🖨️ Print</button>
                <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16}}>✕</button>
              </div>
            </div>

            {/* Customer info */}
            <div style={{background:'#f9fafb',borderRadius:10,padding:'10px 12px',marginBottom:12,fontSize:12}}>
              <div style={{fontWeight:700,color:'#374151',marginBottom:4}}>👤 {selected.customer_name}</div>
              <div style={{color:'#6b7280'}}>{selected.customer_email}</div>
              {selected.customer_phone&&<div style={{color:'#6b7280'}}>📞 {selected.customer_phone}</div>}
              {selected.shipping_address&&<div style={{color:'#6b7280',marginTop:4}}>📍 {fmtAddr(selected.shipping_address)}</div>}
            </div>

            {/* Products */}
            <div style={{borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6',padding:'10px 0',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:8}}>PRODUCTS</div>
              {(selected.items||[]).map((i:any,idx:number)=>{
                // Read from snapshot fields — support both old and new order formats
                const optionType: string = i.optionType || (i.type==='digital' ? 'digital' : i.type==='both' ? 'both' : 'physical');
                const optionName = i.optionName || i.variant?.name || '';
                const qty = i.qty || 1;
                const unitPrice = i.unitPriceTHB || i.price_thb || (i.price ? Math.round(i.price*35) : 0);
                const lineTotal = i.lineTotalTHB || (unitPrice * qty);
                const isDigital = optionType === 'digital';

                return (
                  <div key={idx} style={{background:'#f9fafb',borderRadius:10,padding:'10px 12px',marginBottom:6,border:`1.5px solid ${isDigital?'#bfdbfe':'#bbf7d0'}`}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                      <span style={{fontSize:18,flexShrink:0}}>{i.image}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,color:'#111827',fontWeight:700,lineHeight:1.3,marginBottom:5}}>{i.title}</div>
                        {/* Variant / option name row */}
                        {optionName && (
                          <div style={{fontSize:12,color:'#374151',fontWeight:600,marginBottom:4}}>
                            📌 {optionName}
                          </div>
                        )}
                        <div style={{display:'flex',gap:5,flexWrap:'wrap' as const,alignItems:'center'}}>
                          <span style={{fontSize:11,fontWeight:700,background:isDigital?'#dbeafe':'#d1fae5',color:isDigital?'#1d4ed8':'#065f46',borderRadius:6,padding:'2px 8px'}}>
                            {isDigital ? '⬇️ Digital' : '📦 Physical'}
                          </span>
                          <span style={{fontSize:11,color:'#6b7280',fontWeight:600}}>Qty: {qty}</span>
                        </div>
                      </div>
                      {/* Price */}
                      <div style={{textAlign:'right' as const,flexShrink:0,paddingTop:2}}>
                        <div style={{fontWeight:800,color:'#111827',fontSize:14}}>฿{Number(lineTotal).toLocaleString('th-TH')}</div>
                        {qty>1&&<div style={{fontSize:10,color:'#9ca3af'}}>฿{Number(unitPrice).toLocaleString('th-TH')} × {qty}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {selected.shipping_thb>0&&<div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12,color:'#6b7280'}}><span>Shipping</span><span>฿{selected.shipping_thb}</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontWeight:900,color:'#111827',fontSize:14}}>
                <span>Total</span>
                <span>฿{Number(selected.total_thb||selected.total_amount||(parseFloat(selected.total||'0')*35)).toLocaleString('th-TH')}</span>
              </div>
            </div>

            {/* Slip */}
            {selected.slip_url&&(
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:6}}>PAYMENT SLIP</div>
                <a href={selected.slip_url} target="_blank" rel="noreferrer">
                  <img src={selected.slip_url} alt="slip" style={{width:'100%',borderRadius:8,border:'1px solid #e5e7eb'}} />
                </a>
                <div style={{fontSize:10,color:'#9ca3af',marginTop:4}}>Uploaded: {selected.slip_uploaded_at?new Date(selected.slip_uploaded_at).toLocaleString('th-TH'):''}</div>
              </div>
            )}

            {/* Mark paid */}
            {selected.payment_status!=='paid'&&(
              <button onClick={markPaid} disabled={marking} style={{width:'100%',padding:'10px',background:marking?'#10b981aa':'#10b981',color:'white',border:'none',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',marginBottom:10,boxShadow:'0 4px 12px #10b98144'}}>
                {marking?'Processing...':'✅ Mark as Paid'}
              </button>
            )}
            {selected.payment_status==='paid'&&<div style={{background:'#d1fae5',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#065f46',fontWeight:700,marginBottom:10}}>✅ Payment confirmed</div>}

            {/* Status update */}
            <div style={{marginBottom:8}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Update Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                {STATUS_OPTS.map(s=><option key={s} value={s}>{STATUS_TEXT[s]}</option>)}
              </select>
            </div>

            {(selected.type==='physical'||selected.type==='both')&&<>
              <div style={{marginBottom:8}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Shipping Provider</label>
                <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="Thailand Post, Kerry, Flash..." style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} />
              </div>
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Tracking Number</label>
                <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="TH123456789" style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} />
              </div>
            </>}

            {msg&&<div style={{marginBottom:8,fontSize:12,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
            <button onClick={save} disabled={saving} style={{width:'100%',padding:'10px',background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 12px ${P}44`}}>{saving?'Saving...':'Update Order'}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Artists Manager ─────────────────────────────────────────────────────────
function ArtistsTab() {
  const { navigate } = useRouter();
  const [artists, setArtists] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Individual state per field — fixes focus loss
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [artistStatus, setArtistStatus] = useState('active');

  const load = useCallback(() => {
    api.getArtists().then((a:any)=>setArtists(Array.isArray(a)?a:[]));
  }, []);
  useEffect(()=>{load();},[load]);

  const resetForm = () => {
    setName(''); setSlug(''); setBio(''); setEmail(''); setAvatarUrl(''); setCoverUrl('');
    setWebsite(''); setInstagram(''); setTwitter(''); setArtistStatus('active');
    setEditingId(null);
  };

  // Auto-generate slug from name
  const handleNameChange = (v:string) => {
    setName(v);
    if (!editingId) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''));
  };

  const startEdit = (a:any) => {
    setName(a.name||''); setSlug(a.artist_slug||''); setBio(a.bio||'');
    setEmail(a.email||''); setAvatarUrl(a.avatar_url||''); setCoverUrl(a.cover_image_url||'');
    setWebsite(a.website||'');
    setInstagram(a.social_links?.instagram||''); setTwitter(a.social_links?.twitter||'');
    setArtistStatus(a.artist_status||'active');
    setEditingId(a.id); setShowForm(true);
  };

  const save = async () => {
    if (!name||!slug){setMsg('⚠️ Name and slug required.');return;}
    setSaving(true); setMsg('');
    const body = { name, artist_slug:slug, bio, email:email||undefined, avatar_url:avatarUrl||null, cover_image_url:coverUrl||null, website:website||null, social_links:{instagram:instagram||null,twitter:twitter||null}, artist_status:artistStatus };
    const result = editingId ? await api.updateArtist(editingId, body) : await api.createArtist(body);
    if (result.error){setMsg('⚠️ '+result.error);}
    else{setShowForm(false);resetForm();load();setMsg('✓ Saved!');}
    setSaving(false); setTimeout(()=>setMsg(''),4000);
  };

  const del = async (id:string) => {
    if(!confirm('Remove this artist? Their products will remain but unassigned.'))return;
    await api.deleteArtist(id); load();
  };

  const inp = (label:string, value:string, onChange:(v:string)=>void, placeholder='', type='text') => (
    <div>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
      />
    </div>
  );

  return (
    <div style={{padding:32}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:0}}>Artists</h1>
        <button onClick={()=>{if(showForm&&!editingId){setShowForm(false);resetForm();}else{setShowForm(true);setEditingId(null);resetForm();}}}
          style={{background:P,color:'white',border:'none',cursor:'pointer',padding:'11px 22px',borderRadius:24,fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 14px ${P}44`}}>
          {showForm&&!editingId?'✕ Cancel':'+ Add Artist'}
        </button>
      </div>
      {msg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:12,background:msg.startsWith('✓')?'#d1fae5':'#fee2e2',color:msg.startsWith('✓')?'#065f46':'#991b1b',fontSize:13,fontWeight:600}}>{msg}</div>}

      {showForm&&(
        <div style={{...card,padding:28,marginBottom:24}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:17,fontWeight:800,color:'#111827',margin:0}}>{editingId?'Edit Artist':'New Artist'}</h3>
            {editingId&&<button onClick={()=>{setShowForm(false);resetForm();}} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:18}}>✕</button>}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Artist Name *</label>
              <input value={name} onChange={e=>handleNameChange(e.target.value)} placeholder="Mochi Arts"
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
              />
            </div>
            {inp('Artist Slug *', slug, setSlug, 'mochi-arts')}
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Email <span style={{color:'#9ca3af',fontWeight:400}}>(optional)</span></label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="artist@email.com (leave blank to skip)"
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
              />
              <div style={{fontSize:11,color:'#9ca3af',marginTop:3}}>Only fill if you want to create a login account for this artist.</div>
            </div>
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Status</label>
              <select value={artistStatus} onChange={e=>setArtistStatus(e.target.value)} style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                <option value="active">✅ Active</option>
                <option value="inactive">⏸️ Inactive</option>
              </select>
            </div>
            <div style={{gridColumn:'1/-1'}}>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Bio</label>
              <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={3} placeholder="Artist bio..."
                style={{width:'100%',padding:'9px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'}
              />
            </div>
            <div style={{gridColumn:'1/-1'}}><div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:12}}>Images</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <ImageUpload label="Avatar Image" value={avatarUrl} onChange={setAvatarUrl} folder="artists" hint="Square, 200×200px" />
                <ImageUpload label="Cover Image" value={coverUrl} onChange={setCoverUrl} folder="artists" hint="Wide banner, 1200×400px" />
              </div>
            </div>
            <div style={{gridColumn:'1/-1'}}><div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:12}}>Social Links</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                {inp('Website', website, setWebsite, 'https://yoursite.com')}
                {inp('Instagram', instagram, setInstagram, '@username')}
                {inp('Twitter/X', twitter, setTwitter, '@username')}
              </div>
            </div>
          </div>

          {/* Preview */}
          {(name||avatarUrl)&&(
            <div style={{marginTop:20,padding:'16px',background:'#f9fafb',borderRadius:12,border:'1px solid #f3f4f6'}}>
              <div style={{fontSize:11,color:'#9ca3af',fontWeight:700,marginBottom:10,textTransform:'uppercase' as const}}>Preview</div>
              <div style={{display:'flex',gap:12,alignItems:'center'}}>
                <div style={{width:48,height:48,borderRadius:'50%',background:'#fce7f3',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,overflow:'hidden'}}>
                  {avatarUrl?<img src={avatarUrl} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'🎨'}
                </div>
                <div>
                  <div style={{fontWeight:800,color:'#111827',fontSize:15}}>{name||'Artist Name'}</div>
                  <div style={{fontSize:12,color:'#9ca3af'}}>@{slug||'artist-slug'} · /artists/{slug||'slug'}</div>
                </div>
              </div>
            </div>
          )}

          <div style={{display:'flex',gap:10,marginTop:20}}>
            <button onClick={save} disabled={saving} style={{background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',padding:'11px 28px',borderRadius:20,fontSize:14,fontWeight:700,fontFamily:'inherit'}}>{saving?'Saving...':'Save Artist'}</button>
            <button onClick={()=>{setShowForm(false);resetForm();}} style={{background:'white',border:'1.5px solid #e5e7eb',color:'#6b7280',cursor:'pointer',padding:'11px 22px',borderRadius:20,fontSize:14,fontWeight:600,fontFamily:'inherit'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Artist table */}
      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{['','ARTIST','SLUG','PRODUCTS','STATUS',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>{artists.map(a=>(
            <tr key={a.id} style={{borderBottom:'1px solid #f9fafb'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#fafafa')}
              onMouseLeave={e=>(e.currentTarget.style.background='white')}>
              <td style={{padding:'12px 16px',width:52}}>
                <div style={{width:40,height:40,borderRadius:'50%',background:'#fce7f3',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',fontSize:20}}>
                  {a.avatar_url?<img src={a.avatar_url} style={{width:'100%',height:'100%',objectFit:'cover'}}/>:'🎨'}
                </div>
              </td>
              <td style={{padding:'12px 16px'}}>
                <div style={{fontWeight:700,color:'#111827',fontSize:14}}>{a.name}</div>
                <div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{a.bio?.slice(0,50)}{a.bio?.length>50?'...':''}</div>
              </td>
              <td style={{padding:'12px 16px',fontSize:13,color:'#6b7280'}}>/{a.artist_slug}</td>
              <td style={{padding:'12px 16px',fontWeight:700,color:'#111827'}}>{a.productCount||0}</td>
              <td style={{padding:'12px 16px'}}><Badge color={a.artist_status==='active'?'#059669':'#6b7280'} bg={a.artist_status==='active'?'#d1fae5':'#f3f4f6'} text={a.artist_status==='active'?'Active':'Inactive'}/></td>
              <td style={{padding:'12px 16px'}}>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>navigate(`/artists/${a.artist_slug}`)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>View</button>
                  <button onClick={()=>startEdit(a)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>Edit</button>
                  <button onClick={()=>del(a.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:600,color:'#ef4444'}}>Delete</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {artists.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>No artists yet. Click "+ Add Artist" to get started!</div>}
      </div>
    </div>
  );
}

// ── Theme text field — defined OUTSIDE component to prevent remount ──────────
// StableInput: keeps local state while typing, flushes to parent only on blur.
// This prevents the focus-loss bug caused by parent re-renders on every keystroke.
function TF({label,val,set}:{label:string,val:string,set:(v:string)=>void}) {
  const [local, setLocal] = React.useState(val);
  // Sync from parent only when val changes from outside (e.g. preset applied)
  const prevVal = React.useRef(val);
  if (prevVal.current !== val && local === prevVal.current) {
    setLocal(val);
  }
  prevVal.current = val;
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>{label}</label>
      <input
        value={local}
        onChange={e=>setLocal(e.target.value)}
        onBlur={()=>set(local)}
        style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=P}
      />
    </div>
  );
}

// ── Theme & CMS ─────────────────────────────────────────────────────────────
function ThemeTab() {
  const { theme, saveTheme } = useTheme();
  // Initialize draft ONCE from theme — do NOT reinitialize on every render
  const [draft, setDraft] = useState<ThemeConfig>(() => ({...theme}));
  const [section, setSection] = useState('brand');
  const [saved, setSaved] = useState('');
  // Memoize upd so it never changes reference
  const upd = useCallback((k:keyof ThemeConfig, v:any) => setDraft(p=>({...p,[k]:v})), []);
  const save = useCallback(async () => {
    setDraft(d => { saveTheme(d); return d; });
    setSaved('✓ Saved!'); setTimeout(()=>setSaved(''),3000);
  }, [saveTheme]);

  const SECTIONS=[['brand','🏷️','Brand & Logo'],['colors','🎨','Colors'],['hero','⭐','Hero Section'],['banner','📢','Banner'],['pages','📐','Page Sections'],['background','🖼️','Background'],['footer','🦶','Footer CMS']] as const;
  const PRESETS=[
    {name:'Sakura',primaryColor:'#f472b6',secondaryColor:'#c084fc',accentColor:'#fb923c',bgColor:'#fdf2f8',bgColor2:'#faf5ff',textColor:'#4a1942'},
    {name:'Ocean', primaryColor:'#38bdf8',secondaryColor:'#818cf8',accentColor:'#34d399',bgColor:'#f0f9ff',bgColor2:'#eef2ff',textColor:'#0c4a6e'},
    {name:'Forest',primaryColor:'#4ade80',secondaryColor:'#a3e635',accentColor:'#facc15',bgColor:'#f0fdf4',bgColor2:'#f7fee7',textColor:'#14532d'},
    {name:'Sunset',primaryColor:'#fb923c',secondaryColor:'#f43f5e',accentColor:'#a78bfa',bgColor:'#fff7ed',bgColor2:'#fff1f2',textColor:'#431407'},
    {name:'Lavender',primaryColor:'#a78bfa',secondaryColor:'#f0abfc',accentColor:'#fb7185',bgColor:'#f5f3ff',bgColor2:'#fdf4ff',textColor:'#2e1065'},
  ];

  // TF defined outside component — see below

  return (
    <div style={{padding:32,display:'grid',gridTemplateColumns:'240px 1fr',gap:24}}>
      <div>
        <div style={{...card,overflow:'hidden',marginBottom:16}}>
          {SECTIONS.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setSection(id)} style={{width:'100%',padding:'13px 16px',border:'none',textAlign:'left',cursor:'pointer',display:'flex',gap:10,alignItems:'center',background:section===id?'#fce7f3':'transparent',borderLeft:`3px solid ${section===id?P:'transparent'}`,color:section===id?P:'#374151',fontWeight:section===id?700:500,fontSize:14,fontFamily:'inherit',borderBottom:'1px solid #f3f4f6'}}>
              {icon} {label}
            </button>
          ))}
        </div>
        <button onClick={save} style={{width:'100%',padding:'13px',background:P,color:'white',border:'none',cursor:'pointer',borderRadius:16,fontSize:15,fontWeight:800,fontFamily:'inherit',boxShadow:`0 4px 16px ${P}44`,marginBottom:12}}>💾 {saved||'Save Changes'}</button>
        <div style={{background:'#fef3c7',borderRadius:12,padding:'12px 14px',fontSize:12,color:'#92400e',lineHeight:1.6}}>⚡ Changes preview when you change inputs. Click Save to apply globally.</div>
      </div>
      <div style={{...card,padding:28}}>
        {section==='brand'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:4}}>Brand & Logo</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Customize your store's identity</p>
          <TF label="Store Name" val={draft.logoText} set={v=>upd('logoText',v)} />
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>Logo Emoji</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
              {['🐰','🌸','🎨','🦊','🐱','🌈','💕','🍓','🦄','🌺','✨','🎀'].map(e=>(
                <button key={e} onClick={()=>upd('logoEmoji',e)} style={{width:44,height:44,borderRadius:12,border:`2px solid ${draft.logoEmoji===e?P:'#e5e7eb'}`,background:draft.logoEmoji===e?'#fce7f3':'white',cursor:'pointer',fontSize:22}}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{padding:20,borderRadius:14,background:'#fdf2f8',border:`2px dashed ${P}40`,textAlign:'center' as const}}>
            <div style={{fontSize:32,marginBottom:6}}>{draft.logoEmoji}</div>
            <div style={{fontSize:20,fontWeight:900,color:draft.primaryColor}}>{draft.logoText}</div>
            <div style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Preview</div>
          </div>
        </>)}
        {section==='colors'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:4}}>Colors</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>Choose a preset or customize each color</p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap' as const,marginBottom:20}}>
            {PRESETS.map(pr=><button key={pr.name} onClick={()=>setDraft(d=>({...d,...pr}))} style={{padding:'8px 16px',borderRadius:20,border:`2px solid ${pr.primaryColor}`,background:`linear-gradient(135deg,${pr.bgColor},${pr.bgColor2})`,cursor:'pointer',fontSize:13,fontWeight:700,color:pr.textColor}}>{pr.name}</button>)}
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
          <TF label="Headline" val={draft.heroTitle} set={v=>upd('heroTitle',v)} />
          <TF label="Subtitle" val={draft.heroSubtitle} set={v=>upd('heroSubtitle',v)} />
          <TF label="Background Gradient (CSS)" val={draft.heroBgColor} set={v=>upd('heroBgColor',v)} />
          <ImageCropEditor title="Hero Image (Desktop)" hint="Wide image 1600×600px." value={draft.heroCrop} aspectRatio={16/6} onChange={v=>upd('heroCrop',v)} />
          <div style={{marginTop:16}}><ImageCropEditor title="Hero Image (Mobile)" hint="Portrait 4:3 crop." value={draft.mobileHeroCrop} aspectRatio={4/3} onChange={v=>upd('mobileHeroCrop',v)} /></div>
        </>)}
        {section==='banner'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:20}}>Banner</h2>
          <TF label="Banner Text" val={draft.bannerText} set={v=>upd('bannerText',v)} />
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
            return (<div key={s} style={{display:'flex',alignItems:'center',gap:12,background:'#fafafa',borderRadius:12,padding:'13px 16px',marginBottom:8,border:'1px solid #f3f4f6'}}>
              <span style={{color:'#d1d5db',fontSize:16}}>⠿</span>
              <span style={{flex:1,fontWeight:600,fontSize:14,color:'#374151'}}>{labels[s]||s}</span>
              <button onClick={()=>{const a=[...draft.sections];if(i>0){[a[i],a[i-1]]=[a[i-1],a[i]];upd('sections',a);}}} disabled={i===0} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:i===0?'not-allowed':'pointer',opacity:i===0?0.4:1,fontSize:13}}>↑</button>
              <button onClick={()=>{const a=[...draft.sections];if(i<a.length-1){[a[i],a[i+1]]=[a[i+1],a[i]];upd('sections',a);}}} disabled={i===draft.sections.length-1} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:i===draft.sections.length-1?'not-allowed':'pointer',opacity:i===draft.sections.length-1?0.4:1,fontSize:13}}>↓</button>
            </div>);
          })}
        </>)}
        {section==='background'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:8}}>Background</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Upload a site-wide background image</p>
          <ImageCropEditor title="Background Image" hint="Large image. Set focal point for responsive display." value={draft.bgImageCrop} aspectRatio={16/9} onChange={v=>upd('bgImageCrop',v)} />
        </>)}
        {section==='footer'&&<FooterCMSEditor footer={draft.footer} onFooterChange={upd} />}
      </div>
    </div>
  );
}

// ── Footer text field — defined OUTSIDE to prevent focus loss on re-renders ──
function FooterTextField({ label, value, onChange, onBlur, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  onBlur?: () => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={{ width: '100%', padding: '9px 13px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
        onFocus={e => e.target.style.borderColor = P}
      />
    </div>
  );
}

// ── Footer CMS Editor ────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

function FooterCMSEditor({ footer, onFooterChange }: { footer: FooterConfig; onFooterChange: (k: any, v: any) => void }) {
  // Local state for text fields — prevents focus loss from prop re-renders
  const [description, setDescription] = useState(footer.description || '');
  const [copyright, setCopyright]     = useState(footer.copyright || '');
  const [trustBadges, setTrustBadges] = useState(footer.trustBadges || '');
  const [editingCol, setEditingCol]   = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<{ colId: string; linkId: string } | null>(null);

  // Flush local text to parent (only on blur)
  const flushText = useCallback(() => {
    onFooterChange('footer', { ...footer, description, copyright, trustBadges });
  }, [footer, description, copyright, trustBadges, onFooterChange]);

  // Column/link operations (non-text, no focus issue)
  const updCol = useCallback((updates: Partial<FooterConfig>) => {
    onFooterChange('footer', { ...footer, description, copyright, trustBadges, ...updates });
  }, [footer, description, copyright, trustBadges, onFooterChange]);

  const addColumn = () => {
    const col: FooterColumn = { id: uid(), title: 'New Column', links: [] };
    updCol({ columns: [...footer.columns, col] });
    setEditingCol(col.id);
  };

  const updateColumn = useCallback((colId: string, updates: Partial<FooterColumn>) => {
    updCol({ columns: footer.columns.map(c => c.id === colId ? { ...c, ...updates } : c) });
  }, [footer.columns, updCol]);

  const deleteColumn = useCallback((colId: string) => {
    if (!confirm('Delete this column?')) return;
    updCol({ columns: footer.columns.filter(c => c.id !== colId) });
    if (editingCol === colId) setEditingCol(null);
  }, [footer.columns, editingCol, updCol]);

  const addLink = useCallback((colId: string) => {
    const link: FooterLink = { id: uid(), label: 'New Link', url: '/', newTab: false, enabled: true };
    updateColumn(colId, { links: [...(footer.columns.find(c => c.id === colId)?.links || []), link] });
    setEditingLink({ colId, linkId: link.id });
  }, [footer.columns, updateColumn]);

  const updateLink = (colId: string, linkId: string, updates: Partial<FooterLink>) => {
    updateColumn(colId, {
      links: (footer.columns.find(c => c.id === colId)?.links || []).map(l => l.id === linkId ? { ...l, ...updates } : l),
    });
  };

  const deleteLink = (colId: string, linkId: string) => {
    updateColumn(colId, {
      links: (footer.columns.find(c => c.id === colId)?.links || []).filter(l => l.id !== linkId),
    });
    if (editingLink?.linkId === linkId) setEditingLink(null);
  };

  const moveColumn = useCallback((colId: string, dir: number) => {
    const cols = [...footer.columns];
    const i = cols.findIndex(c => c.id === colId);
    const j = i + dir;
    if (j < 0 || j >= cols.length) return;
    [cols[i], cols[j]] = [cols[j], cols[i]];
    updCol({ columns: cols });
  }, [footer.columns, updCol]);

  const moveLink = (colId: string, linkId: string, dir: number) => {
    const col = footer.columns.find(c => c.id === colId);
    if (!col) return;
    const links = [...col.links];
    const i = links.findIndex(l => l.id === linkId);
    const j = i + dir;
    if (j < 0 || j >= links.length) return;
    [links[i], links[j]] = [links[j], links[i]];
    updateColumn(colId, { links });
  };

  // Field inputs use FooterTextField component (defined outside) to prevent focus loss

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 4 }}>Footer CMS</h2>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>Edit footer content and links</p>

      {/* Global settings — local state to prevent focus loss */}
      <div style={{ ...card, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: '0 0 14px' }}>Global Settings</h3>
        <FooterTextField label="Description" value={description} onChange={setDescription} onBlur={flushText} placeholder="Store description..." />
        <FooterTextField label="Copyright Text" value={copyright} onChange={setCopyright} onBlur={flushText} placeholder="© 2026 Fluffy Pub. Made with 💕" />
        <FooterTextField label="Trust Badges" value={trustBadges} onChange={setTrustBadges} onBlur={flushText} placeholder="🔒 Secure · ⚡ Downloads · 💯 Guaranteed" />
      </div>

      {/* Columns */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#111827', margin: 0 }}>Footer Columns ({footer.columns.length})</h3>
        <button onClick={addColumn} style={{ background: P, color: 'white', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>+ Add Column</button>
      </div>

      {footer.columns.map((col, ci) => (
        <div key={col.id} style={{ ...card, padding: 18, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {editingCol === col.id ? (
                <input value={col.title} onChange={e => updateColumn(col.id, { title: e.target.value })}
                  style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${P}`, fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                  onBlur={() => setEditingCol(null)}
                  autoFocus
                />
              ) : (
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{col.title}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setEditingCol(col.id)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151' }}>Rename</button>
              <button onClick={() => moveColumn(col.id, -1)} disabled={ci === 0} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', cursor: ci === 0 ? 'not-allowed' : 'pointer', opacity: ci === 0 ? 0.4 : 1, fontSize: 11 }}>↑</button>
              <button onClick={() => moveColumn(col.id, 1)} disabled={ci === footer.columns.length - 1} style={{ padding: '4px 8px', borderRadius: 7, border: '1px solid #e5e7eb', background: 'white', cursor: ci === footer.columns.length - 1 ? 'not-allowed' : 'pointer', opacity: ci === footer.columns.length - 1 ? 0.4 : 1, fontSize: 11 }}>↓</button>
              <button onClick={() => deleteColumn(col.id)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#ef4444' }}>Delete</button>
            </div>
          </div>

          {/* Links */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
            {col.links.map((link, li) => (
              <div key={link.id} style={{ background: editingLink?.linkId === link.id ? '#fdf2f8' : '#f9fafb', borderRadius: 10, padding: '10px 12px', marginBottom: 8, border: `1px solid ${editingLink?.linkId === link.id ? P + '40' : '#f3f4f6'}` }}>
                {editingLink?.linkId === link.id ? (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Label</label>
                        <input value={link.label} onChange={e => updateLink(col.id, link.id, { label: e.target.value })}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>URL</label>
                        <input value={link.url} onChange={e => updateLink(col.id, link.id, { url: e.target.value })}
                          placeholder="/products or https://..."
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <label style={{ display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <input type="checkbox" checked={link.newTab} onChange={e => updateLink(col.id, link.id, { newTab: e.target.checked })} style={{ accentColor: P }} />
                        Open in new tab
                      </label>
                      <label style={{ display: 'flex', gap: 5, alignItems: 'center', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        <input type="checkbox" checked={link.enabled} onChange={e => updateLink(col.id, link.id, { enabled: e.target.checked })} style={{ accentColor: P }} />
                        Enabled
                      </label>
                      <button onClick={() => setEditingLink(null)} style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 8, border: `1px solid ${P}`, background: P, color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Done</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: link.enabled ? '#374151' : '#9ca3af' }}>{link.label}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{link.url}</span>
                    {!link.enabled && <span style={{ fontSize: 10, background: '#f3f4f6', color: '#9ca3af', borderRadius: 4, padding: '1px 6px' }}>Off</span>}
                    {link.newTab && <span style={{ fontSize: 10, background: '#dbeafe', color: '#2563eb', borderRadius: 4, padding: '1px 6px' }}>↗</span>}
                    <button onClick={() => moveLink(col.id, link.id, -1)} disabled={li === 0} style={{ padding: '2px 6px', borderRadius: 5, border: '1px solid #e5e7eb', background: 'white', cursor: li === 0 ? 'not-allowed' : 'pointer', opacity: li === 0 ? 0.4 : 1, fontSize: 10 }}>↑</button>
                    <button onClick={() => moveLink(col.id, link.id, 1)} disabled={li === col.links.length - 1} style={{ padding: '2px 6px', borderRadius: 5, border: '1px solid #e5e7eb', background: 'white', cursor: li === col.links.length - 1 ? 'not-allowed' : 'pointer', opacity: li === col.links.length - 1 ? 0.4 : 1, fontSize: 10 }}>↓</button>
                    <button onClick={() => setEditingLink({ colId: col.id, linkId: link.id })} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 11, color: '#374151' }}>Edit</button>
                    <button onClick={() => deleteLink(col.id, link.id)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: 11, color: '#ef4444' }}>✕</button>
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => addLink(col.id)} style={{ padding: '6px 14px', borderRadius: 10, border: `1.5px dashed ${P}40`, background: '#fdf2f8', color: P, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', width: '100%', marginTop: 4 }}>+ Add Link</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Variants Editor ───────────────────────────────────────────────────────────
function VariantsEditor({ variants, onChange }: { variants: any[]; onChange: (v: any[]) => void }) {
  const vuid = () => Math.random().toString(36).slice(2, 9);

  const add = () => onChange([...variants, { id: vuid(), name: '', price_thb: '', enabled: true, stock: '' }]);
  const update = (id: string, key: string, val: any) => onChange(variants.map(v => v.id === id ? { ...v, [key]: val } : v));
  const del = (id: string) => onChange(variants.filter(v => v.id !== id));
  const move = (i: number, dir: number) => {
    const a = [...variants]; const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
          Product Variants <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — each product manages its own variants)</span>
        </label>
        <button onClick={add} style={{ padding: '4px 12px', borderRadius: 8, border: `1.5px solid ${P}`, background: '#fdf2f8', color: P, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>+ Add Variant</button>
      </div>

      {variants.length === 0 && (
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 10, fontSize: 13, color: '#9ca3af', textAlign: 'center' as const }}>
          No variants. Add variants like "สันห่วงปกติ", "สันห่วงเปิดบน", "Digital file" etc.
        </div>
      )}

      {variants.map((v, i) => (
        <div key={v.id} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 60px auto auto auto', gap: 6, alignItems: 'center' }}>
            <input
              value={v.name}
              onChange={e => update(v.id, 'name', e.target.value)}
              placeholder="e.g. สันห่วงปกติ"
              style={{ padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }}
              onFocus={e => e.target.style.borderColor = P}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12 }}>฿</span>
              <input type="number" value={v.price_thb||v.price||''} onChange={e => update(v.id, 'price_thb', e.target.value)} placeholder="THB"
                style={{ padding: '7px 6px 7px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 12, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }}
                onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', fontSize: 11, color: '#374151' }}>
              <input type="checkbox" checked={v.enabled !== false} onChange={e => update(v.id, 'enabled', e.target.checked)} style={{ accentColor: P }} />
              On
            </label>
            <button onClick={() => move(i, -1)} disabled={i === 0} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: i === 0 ? 'not-allowed' : 'pointer', opacity: i === 0 ? 0.4 : 1, fontSize: 11 }}>↑</button>
            <button onClick={() => move(i, 1)} disabled={i === variants.length - 1} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: i === variants.length - 1 ? 'not-allowed' : 'pointer', opacity: i === variants.length - 1 ? 0.4 : 1, fontSize: 11 }}>↓</button>
            <button onClick={() => del(v.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: 11, color: '#ef4444' }}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Language CMS ──────────────────────────────────────────────────────────────
function LanguageCMSTab() {
  const [entries, setEntries] = React.useState<Record<string, {th:string;en:string}>>(() => {
    try {
      const stored = localStorage.getItem('fluffy_translations');
      if (stored) return JSON.parse(stored);
    } catch {}
    return { ...DEFAULT_TRANSLATIONS };
  });
  const [saved, setSaved] = React.useState('');

  const save = () => {
    localStorage.setItem('fluffy_translations', JSON.stringify(entries));
    setSaved('✓ Saved!');
    setTimeout(() => setSaved(''), 2000);
  };

  const upd = (key: string, lang: 'th'|'en', val: string) => {
    setEntries(e => ({ ...e, [key]: { ...e[key], [lang]: val } }));
  };

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:900, color:'#111827', margin:0 }}>🌐 Language CMS</h2>
          <p style={{ fontSize:13, color:'#6b7280', margin:'4px 0 0' }}>Edit all UI text for Thai and English</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {saved && <span style={{ fontSize:13, color:'#10b981', fontWeight:700 }}>{saved}</span>}
          <button onClick={save} style={{ background:P, color:'white', border:'none', cursor:'pointer', padding:'10px 20px', borderRadius:20, fontSize:14, fontWeight:700, fontFamily:'inherit' }}>Save Changes</button>
        </div>
      </div>

      <div style={{ ...card, padding:16 }}>
        <div style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr', gap:8, marginBottom:8, padding:'0 8px' }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const }}>Key</span>
          <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const }}>🇹🇭 Thai</span>
          <span style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' as const }}>🇬🇧 English</span>
        </div>
        {Object.entries(entries).map(([key, val]) => (
          <div key={key} style={{ display:'grid', gridTemplateColumns:'140px 1fr 1fr', gap:8, marginBottom:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#6b7280', fontFamily:'monospace', background:'#f3f4f6', padding:'6px 8px', borderRadius:6 }}>{key}</span>
            <input value={val?.th || ''} onChange={e => upd(key, 'th', e.target.value)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit' }}
              onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            <input value={val?.en || ''} onChange={e => upd(key, 'en', e.target.value)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', fontFamily:'inherit' }}
              onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
          </div>
        ))}
      </div>
    </div>
  );
}
