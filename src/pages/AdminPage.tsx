// v2-stock
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
import HtmlEditor from '../components/HtmlEditor';

const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';
type Tab = 'dashboard'|'products'|'orders'|'artists'|'artist-requests'|'payouts'|'affiliate-requests'|'affiliates'|'categories'|'pages'|'free-downloads'|'legal'|'theme'|'lang';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  useEffect(()=>{
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'admin' || user.email !== ADMIN_EMAIL) navigate('/');
  }, [user]);

  if (!user || user.role !== 'admin' || user.email !== ADMIN_EMAIL) return null;

  const TAB_LABELS: Record<Tab, string> = {
    dashboard:'Dashboard', products:'Products', orders:'Orders', artists:'Artists', 'artist-requests':'Artist Requests', payouts:'Artist Payouts',
    'affiliate-requests':'Affiliate Requests', affiliates:'Affiliates',
    categories:'Categories', pages:'Pages', 'free-downloads':'Free Downloads', legal:'Legal Pages', theme:'Theme & CMS', lang:'Language CMS',
  };

  const selectTab = (t: Tab) => { setTab(t); setSidebarOpen(false); };

  const sidebar = (
    <div style={{ width:220, background:'white', borderRight:'1px solid #f3f4f6', display:'flex', flexDirection:'column', height:'100%', boxShadow:'2px 0 8px rgba(0,0,0,0.04)' }}>
      <div style={{ padding:'24px 20px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
          {theme.logoImageCrop?.croppedDataUrl
            ? <img src={theme.logoImageCrop.croppedDataUrl} style={{ width:28, height:28, borderRadius:'50%', objectFit:'cover' }} alt="logo" />
            : <span style={{ fontSize:22 }}>⚙️</span>}
          <span style={{ fontSize:20, fontWeight:900, color:'#f472b6' }}>Admin</span>
        </div>
        <div style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>Fluffy Pub Studio</div>
      </div>
      <nav style={{ flex:1, padding:'0 12px' }}>
        <NavItem icon="📊" label="Dashboard"    active={tab==='dashboard'}  onClick={()=>selectTab('dashboard')} />
        <NavItem icon="📚" label="Products"     active={tab==='products'}   onClick={()=>selectTab('products')} />
        <NavItem icon="📦" label="Orders"       active={tab==='orders'}     onClick={()=>selectTab('orders')} />
        <NavItem icon="🎨" label="Artists"      active={tab==='artists'}    onClick={()=>selectTab('artists')} />
        <NavItem icon="🙋" label="Artist Requests" active={tab==='artist-requests'} onClick={()=>selectTab('artist-requests')} />
        <NavItem icon="💸" label="Artist Payouts"  active={tab==='payouts'}          onClick={()=>selectTab('payouts')} />
        <NavItem icon="🤝" label="Affiliate Requests" active={tab==='affiliate-requests'} onClick={()=>selectTab('affiliate-requests')} />
        <NavItem icon="💵" label="Affiliates"      active={tab==='affiliates'}       onClick={()=>selectTab('affiliates')} />
        <NavItem icon="🏷️" label="Categories"   active={tab==='categories'} onClick={()=>selectTab('categories')} />
        <NavItem icon="📄" label="Pages"          active={tab==='pages'}           onClick={()=>selectTab('pages')} />
        <NavItem icon="⬇️" label="Free Downloads" active={tab==='free-downloads'}  onClick={()=>selectTab('free-downloads')} />
        <NavItem icon="⚖️" label="Legal Pages"    active={tab==='legal'}           onClick={()=>selectTab('legal')} />
        <NavItem icon="✨" label="Theme & CMS"    active={tab==='theme'}           onClick={()=>selectTab('theme')} />
        <NavItem icon="🌐" label="Language CMS" active={tab==='lang'}       onClick={()=>selectTab('lang')} />
      </nav>
      <div style={{ padding:'16px 12px', borderTop:'1px solid #f3f4f6' }}>
        <button onClick={()=>navigate('/')} style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px solid #e5e7eb', color:'#6b7280', cursor:'pointer', background:'transparent', fontSize:13, fontWeight:600, marginBottom:8, fontFamily:'inherit' }}>← View Store</button>
        <button onClick={async()=>{await logout();navigate('/');}} style={{ width:'100%', padding:'9px', borderRadius:10, border:'1px solid #fca5a5', color:'#ef4444', cursor:'pointer', background:'#fef2f2', fontSize:13, fontWeight:600, fontFamily:'inherit' }}>Sign Out</button>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f9fafb', fontFamily:'inherit' }}>
      <style>{`@media(min-width:768px){.admin-sidebar{display:flex!important;position:sticky!important;top:0;height:100vh;}}`}</style>

      {/* Desktop sidebar */}
      <div className="admin-sidebar" style={{ display:'none', flexDirection:'column', width:220, flexShrink:0 }}>
        {sidebar}
      </div>

      {/* Mobile drawer backdrop */}
      {sidebarOpen && (
        <div onClick={()=>setSidebarOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:40 }} />
      )}

      {/* Mobile drawer */}
      <div style={{ position:'fixed', top:0, left:0, height:'100%', zIndex:50, display:'flex', flexDirection:'column', width:240, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition:'transform 0.25s ease' }}>
        {sidebar}
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'auto', minWidth:0 }}>
        {/* Mobile top bar */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'white', borderBottom:'1px solid #f3f4f6', position:'sticky', top:0, zIndex:30 }} className="admin-topbar">
          <style>{`@media(min-width:768px){.admin-topbar{display:none!important;}}`}</style>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, fontSize:20, lineHeight:1 }}>☰</button>
          <span style={{ fontWeight:800, fontSize:16, color:'#111827' }}>{TAB_LABELS[tab]}</span>
        </div>

        {tab==='dashboard'  && <DashboardTab />}
        {tab==='products'   && <ProductsTab />}
        {tab==='orders'     && <OrdersTab />}
        {tab==='artists'    && <ArtistsTab />}
        {tab==='artist-requests' && <ArtistRequestsTab />}
        {tab==='payouts'         && <ArtistPayoutsTab />}
        {tab==='affiliate-requests' && <AffiliateRequestsTab />}
        {tab==='affiliates'      && <AffiliatesTab />}
        {tab==='categories' && <CategoriesTab />}
        {tab==='pages'           && <PagesCMSTab />}
        {tab==='free-downloads'  && <FreeDownloadsTab />}
        {tab==='legal'           && <LegalPagesTab />}
        {tab==='theme'           && <ThemeTab />}
        {tab==='lang'       && <LanguageCMSTab />}
      </div>
    </div>
  );
}

const P = '#f472b6';
const card = { background:'white', borderRadius:16, boxShadow:'0 1px 8px rgba(0,0,0,0.06)', border:'1px solid #f3f4f6' };

function Badge({color,bg,text}:{color:string,bg:string,text:string}) {
  return <span style={{ background:bg, color, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700, whiteSpace:'nowrap' as const }}>{text}</span>;
}

const STATUS_COLOR:any = { pending_payment:['#d97706','#fef3c7'], payment_submitted:['#7c3aed','#ede9fe'], paid:['#059669','#d1fae5'], packing:['#2563eb','#dbeafe'], shipped:['#7c3aed','#ede9fe'], delivered:['#059669','#d1fae5'], cancelled:['#dc2626','#fee2e2'] };
const STATUS_TEXT:any  = { pending_payment:'Pending Payment', payment_submitted:'Payment Submitted', paid:'Paid', packing:'Packing', shipped:'Shipped', delivered:'Delivered', cancelled:'Cancelled' };

function fmtOrderTotal(o: any): string {
  if (o.currency === 'USD' || o.payment_method === 'paypal') {
    const usd = o.total_usd ?? o.total_usd;
    if (usd != null) return `$${Number(usd).toFixed(2)} USD`;
  }
  const thb = o.total_thb || o.total_amount || 0;
  return `฿${Number(thb).toLocaleString('th-TH')}`;
}

// ── Dashboard ──────────────────────────────────────────────────────────────
function DashboardTab() {
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear,  setSelYear]  = useState(now.getFullYear());
  const [stats, setStats] = useState<any>(null);
  const [exporting, setExporting] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);

  const loadStats = (month: number, year: number) => {
    setStats(null);
    fetch(`/api/analytics?month=${month}&year=${year}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('fluffy_token')||''}` }
    }).then(r => r.json()).then(setStats);
  };

  useEffect(() => { loadStats(selMonth, selYear); }, [selMonth, selYear]);

  const exportCsv = async () => {
    setExporting(true);
    const token = localStorage.getItem('fluffy_token') || '';
    const res = await fetch(`/api/analytics?export=1&month=${selMonth}&year=${selYear}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${selYear}-${String(selMonth).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const exportSalesCsv = async () => {
    const token = localStorage.getItem('fluffy_token') || '';
    const res = await fetch(`/api/analytics?export_sales=1&month=${selMonth}&year=${selYear}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `product-sales-${selYear}-${String(selMonth).padStart(2,'0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const statusCards = stats ? [
    {label:'Pending',value:stats.byStatus?.pending_payment||0,icon:'⏳',color:'#d97706',bg:'#fef3c7'},
    {label:'Submitted',value:stats.byStatus?.payment_submitted||0,icon:'🕐',color:'#7c3aed',bg:'#ede9fe'},
    {label:'Paid',value:stats.byStatus?.paid||0,icon:'✅',color:'#059669',bg:'#d1fae5'},
    {label:'Preparing',value:stats.byStatus?.packing||0,icon:'📦',color:'#2563eb',bg:'#dbeafe'},
    {label:'Shipped',value:stats.byStatus?.shipped||0,icon:'🚚',color:'#7c3aed',bg:'#ede9fe'},
    {label:'Delivered',value:stats.byStatus?.delivered||0,icon:'🎉',color:'#059669',bg:'#d1fae5'},
    {label:'Cancelled',value:stats.byStatus?.cancelled||0,icon:'❌',color:'#dc2626',bg:'#fee2e2'},
  ] : [];

  const topCards = stats ? [
    {label:'Revenue (฿ THB)',value:`฿${(stats.revenue_thb||0).toLocaleString('th-TH')}`,icon:'💰',color:'#10b981',bg:'#d1fae5'},
    {label:'Revenue ($ USD)',value:`$${(stats.revenue_usd||0).toFixed(2)}`,icon:'💵',color:'#0070ba',bg:'#eff6ff'},
    {label:'Orders This Period',value:stats.ordersThisMonth||0,icon:'📦',color:P,bg:'#fce7f3'},
    {label:'Total Products',value:stats.totalProducts||0,icon:'📚',color:'#f59e0b',bg:'#fef3c7'},
    {label:'Customers',value:stats.totalCustomers||0,icon:'👥',color:'#8b5cf6',bg:'#ede9fe'},
  ] : [];

  return (
    <div style={{padding:28}}>
      {/* Header with month selector + export */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap' as const,gap:12}}>
        <h1 style={{fontSize:26,fontWeight:900,color:'#111827',margin:0}}>Dashboard 📊</h1>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' as const}}>
          <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))}
            style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',background:'white',cursor:'pointer'}}>
            {monthNames.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))}
            style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',background:'white',cursor:'pointer'}}>
            {years.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={exportCsv} disabled={exporting||!stats}
            style={{padding:'8px 16px',borderRadius:10,background:exporting?'#e5e7eb':P,color:exporting?'#9ca3af':'white',border:'none',cursor:exporting?'not-allowed':'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}>
            {exporting?'⏳':'📥'} {exporting?'Exporting...':'Export CSV'}
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:14,marginBottom:20}}>
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

      {/* Recent orders — collapsible */}
      <div style={{...card,padding:20,marginBottom:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom: ordersExpanded ? 14 : 0}}>
          <h3 style={{fontSize:15,fontWeight:800,color:'#111827',margin:0}}>
            Orders — {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selMonth]} {selYear}
            {stats && <span style={{fontSize:12,fontWeight:600,color:'#9ca3af',marginLeft:8}}>({(stats.recentOrders||[]).length})</span>}
          </h3>
          <button onClick={()=>setOrdersExpanded(x=>!x)}
            style={{padding:'5px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:700,color:'#374151',fontFamily:'inherit'}}>
            {ordersExpanded ? '▲ Hide Orders' : '▼ Show Orders'}
          </button>
        </div>
        {ordersExpanded && (!stats ? <div style={{textAlign:'center',padding:'20px',color:'#9ca3af'}}>Loading...</div> : (stats.recentOrders||[]).length===0 ? <div style={{textAlign:'center',padding:'20px',color:'#9ca3af'}}>No orders this month</div> : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #f3f4f6'}}>{['Order','Customer','Amount','Status','Date'].map(h=><th key={h} style={{textAlign:'left' as const,padding:'8px 10px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
            <tbody>{(stats.recentOrders||[]).map((o:any)=>{const[cl,bg]=STATUS_COLOR[o.status]||['#6b7280','#f1f5f9'];return(
              <tr key={o.id} style={{borderBottom:'1px solid #f9fafb'}}>
                <td style={{padding:'10px',fontSize:12,fontWeight:700,color:P}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                <td style={{padding:'10px',fontSize:12,color:'#374151'}}>{o.customer_name||''}</td>
                <td style={{padding:'10px',fontWeight:800,color:'#111827',fontSize:12}}>{fmtOrderTotal(o)}</td>
                <td style={{padding:'10px'}}><Badge color={cl} bg={bg} text={STATUS_TEXT[o.status]||o.status}/></td>
                <td style={{padding:'10px',fontSize:11,color:'#9ca3af'}}>{new Date(o.created_at).toLocaleDateString('th-TH')}</td>
              </tr>
            );})}</tbody>
          </table>
        ))}
      </div>

      {/* Product Sales Summary */}
      <div style={{...card,padding:20}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap' as const,gap:8}}>
          <h3 style={{fontSize:15,fontWeight:800,color:'#111827',margin:0}}>
            📦 Product Sales Summary — {['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selMonth]} {selYear}
          </h3>
          <button onClick={exportSalesCsv} disabled={!stats}
            style={{padding:'7px 14px',borderRadius:10,background:P,color:'white',border:'none',cursor:'pointer',fontSize:12,fontWeight:700,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
            📥 Export Sales CSV
          </button>
        </div>
        <p style={{fontSize:11,color:'#9ca3af',margin:'0 0 14px'}}>Counts orders with status: paid, preparing, shipped, delivered only.</p>
        {!stats ? (
          <div style={{textAlign:'center',padding:'20px',color:'#9ca3af'}}>Loading...</div>
        ) : (stats.productSales||[]).length === 0 ? (
          <div style={{textAlign:'center',padding:'20px',color:'#9ca3af'}}>No sales data for this period</div>
        ) : (
          <div style={{overflowX:'auto' as const}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:580}}>
              <thead>
                <tr style={{borderBottom:'2px solid #f3f4f6'}}>
                  {['Product','Artist','Variant','Qty','Gross Sales','Orders'].map(h=>(
                    <th key={h} style={{textAlign:'left' as const,padding:'8px 10px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5,whiteSpace:'nowrap' as const}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats.productSales||[]).map((s:any, i:number)=>(
                  <tr key={i} style={{borderBottom:'1px solid #f9fafb'}}>
                    <td style={{padding:'10px',fontSize:13,fontWeight:600,color:'#111827'}}>{s.productName||'—'}</td>
                    <td style={{padding:'10px',fontSize:12,color:'#6b7280'}}>{s.artistName||'—'}</td>
                    <td style={{padding:'10px',fontSize:12,color:'#6b7280'}}>{s.variantName||'—'}</td>
                    <td style={{padding:'10px',fontSize:13,fontWeight:700,color:'#111827',textAlign:'center' as const}}>{s.qty}</td>
                    <td style={{padding:'10px',fontSize:13,fontWeight:700}}>
                      {s.grossSalesTHB > 0 && <div style={{color:'#059669'}}>฿{Number(s.grossSalesTHB).toLocaleString('th-TH')}</div>}
                      {s.grossSalesUSD > 0 && <div style={{color:'#0070ba'}}>${Number(s.grossSalesUSD).toFixed(2)}</div>}
                      {!s.grossSalesTHB && !s.grossSalesUSD && <span style={{color:'#9ca3af'}}>—</span>}
                    </td>
                    <td style={{padding:'10px',fontSize:12,color:'#6b7280',textAlign:'center' as const}}>{s.orderCount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{borderTop:'2px solid #f3f4f6',background:'#f9fafb'}}>
                  <td colSpan={3} style={{padding:'10px',fontSize:12,fontWeight:700,color:'#374151'}}>Total</td>
                  <td style={{padding:'10px',fontSize:13,fontWeight:900,color:'#111827',textAlign:'center' as const}}>
                    {(stats.productSales||[]).reduce((s:number,r:any)=>s+r.qty,0)}
                  </td>
                  <td style={{padding:'10px',fontSize:13,fontWeight:900}}>
                    {(()=>{
                      const totalTHB = (stats.productSales||[]).reduce((s:number,r:any)=>s+(r.grossSalesTHB||0),0);
                      const totalUSD = (stats.productSales||[]).reduce((s:number,r:any)=>s+(r.grossSalesUSD||0),0);
                      return (<>
                        {totalTHB > 0 && <div style={{color:'#059669'}}>฿{totalTHB.toLocaleString('th-TH')}</div>}
                        {totalUSD > 0 && <div style={{color:'#0070ba'}}>${totalUSD.toFixed(2)}</div>}
                      </>);
                    })()}
                  </td>
                  <td style={{padding:'10px',fontSize:12,fontWeight:700,color:'#374151',textAlign:'center' as const}}>
                    {(stats.productSales||[]).reduce((s:number,r:any)=>s+r.orderCount,0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
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
  const [searchKeywords, setSearchKeywords] = useState('');
  const [status, setStatus] = useState('published');
  const [digitalDownloadUrl, setDigitalDownloadUrl] = useState('');
  const [downloadInstruction, setDownloadInstruction] = useState('');
  const [r2Key, setR2Key] = useState('');
  const [r2FileName, setR2FileName] = useState('');
  const [r2FileSize, setR2FileSize] = useState(0);
  const [r2FileType, setR2FileType] = useState('');
  const [r2Uploading, setR2Uploading] = useState(false);
  const [r2UploadMsg, setR2UploadMsg] = useState('');
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
  const [priceUSD, setPriceUSD] = useState('');
  const [physicalRoyaltyTHB, setPhysicalRoyaltyTHB] = useState('');
  const [digitalRoyaltyPct, setDigitalRoyaltyPct] = useState('');

  const [descTh, setDescTh] = useState('');

  const [categories, setCategories] = useState<string[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    // Load categories from DB (admin sees all, including inactive)
    fetch('/api/categories', { headers: { Authorization: `Bearer ${localStorage.getItem('fluffy_token')||''}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setCategories(d.map((c:any) => c.name)); });
  }, []);

  const load = useCallback(() => {
    fetch('/api/products?admin=1',{headers:{Authorization:`Bearer ${localStorage.getItem('fluffy_token')}`}})
      .then(r=>r.json()).then(d=>setProducts(Array.isArray(d)?d:[]));
    api.getArtists().then((a:any)=>setArtists(Array.isArray(a)?a:[]));
  }, []);

  useEffect(()=>{load();},[load]);

  const filteredProducts = products.filter(pr => {
    const prCats = pr.categories?.length ? pr.categories : (pr.category ? [pr.category] : []);
    const prArtist = pr.artist_name || pr.artistName || '';
    if (filterArtist && prArtist !== filterArtist) return false;
    if (filterCategory && !prCats.includes(filterCategory)) return false;
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      const haystack = [pr.title, prArtist, ...prCats].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const resetForm = () => {
    setTitle(''); setPrice(''); setOriginalPrice(''); setCategories_sel([]);
    setDescription(''); setImage('🎨'); setCoverImageUrl(''); setType('digital');
    setPages(''); setTags(''); setSearchKeywords(''); setStatus('published'); setDigitalDownloadUrl('');
    setDownloadInstruction(''); setPhysicalStock('0'); setShippingRequired(false); setShippingNote('');
    setArtistId(''); setIsDigital(true); setIsPhysical(false); setRichBlocks([]);
    setR2Key(''); setR2FileName(''); setR2FileSize(0); setR2FileType(''); setR2UploadMsg('');
    setPhysicalRoyaltyTHB(''); setDigitalRoyaltyPct('');
    setEditingId(null);
  };

  const startEdit = (pr:any) => {
    setTitle(pr.title||''); setPrice(String(pr.price||'')); setOriginalPrice(String(pr.original_price||''));
    // Load from categories array if available, else fall back to single category field
    setCategories_sel(pr.categories && pr.categories.length ? pr.categories : (pr.category ? [pr.category] : [])); setDescription(pr.description||''); setImage(pr.image||'🎨');
    setCoverImageUrl(pr.cover_image_url||''); setType(pr.type||'digital'); setPages(String(pr.pages||''));
    setTags((pr.tags||[]).join(', ')); setSearchKeywords(pr.search_keywords||''); setStatus(pr.status||'published');
    setDigitalDownloadUrl(pr.digital_download_url||''); setDownloadInstruction(pr.download_instruction||'');
    setPhysicalStock(String(pr.physical_stock||0)); setShippingRequired(!!pr.shipping_required);
    setShippingNote(pr.shipping_note||''); setArtistId(pr.artist_id||'');
    setIsDigital(pr.is_digital !== false);
    setIsPhysical(!!pr.is_physical);
    setRichBlocks(Array.isArray(pr.rich_description) ? pr.rich_description : []);
    setVariants(Array.isArray(pr.variants) ? pr.variants : []);
    setTitleTh(pr.title_th||''); setTitleEn(pr.title_en||'');
    setPriceTHB(String(pr.price_thb||''));
    setPriceUSD(String(pr.price_usd||''));
    setDescTh(pr.description_th||'');
    setR2Key(pr.r2_key||''); setR2FileName(pr.r2_file_name||'');
    setR2FileSize(pr.file_size||0); setR2FileType(pr.file_type||''); setR2UploadMsg('');
    setPhysicalRoyaltyTHB(pr.artist_physical_royalty_thb != null ? String(pr.artist_physical_royalty_thb) : '');
    setDigitalRoyaltyPct(pr.digital_artist_royalty_percent != null ? String(pr.digital_artist_royalty_percent) : '');
    setEditingId(pr.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!title||!priceTHB||!categories_sel.length){setMsg('⚠️ กรุณาใส่ชื่อ ราคา และหมวดหมู่ / Title, price and category required.');return;}
    setSaving(true); setMsg('');
    const body:any = { title, price:parseFloat(priceTHB)||0, category:categories_sel[0]||'', categories:categories_sel, description,
      rich_description:richBlocks.length?richBlocks:null, image,
      cover_image_url:coverImageUrl||null,
      is_digital:isDigital, is_physical:isPhysical,
      type:isPhysical?'physical':'digital', // DB only allows 'digital' or 'physical'
      pages:parseInt(pages)||0,
      tags:tags.split(',').map((t:string)=>t.trim()).filter(Boolean),
      search_keywords: searchKeywords.trim() || null,
      status,
      digital_download_url:isDigital?(digitalDownloadUrl||null):null,
      download_instruction:isDigital?(downloadInstruction||null):null,
      r2_key:isDigital?(r2Key||null):null,
      r2_file_name:isDigital?(r2FileName||null):null,
      file_size:isDigital&&r2FileSize?r2FileSize:null,
      file_type:isDigital?(r2FileType||null):null,
      physical_stock:isPhysical?(parseInt(physicalStock)||0):0,
      shipping_required:isPhysical?shippingRequired:false,
      shipping_note:isPhysical?shippingNote:'',
      artist_id:artistId||undefined,
      variants:variants,
      title_th:titleTh||null, title_en:titleEn||null,
      price_thb:priceTHB?parseFloat(priceTHB):null,
      price_usd:priceUSD?parseFloat(priceUSD):null,
      description_th:descTh||null,
      artist_physical_royalty_thb: physicalRoyaltyTHB ? parseFloat(physicalRoyaltyTHB) : null,
      digital_artist_royalty_percent: digitalRoyaltyPct ? parseFloat(digitalRoyaltyPct) : null,
    };
    if (originalPrice) body.original_price = parseFloat(originalPrice);
    const result = editingId ? await api.updateProduct(editingId, body) : await api.createProduct(body);
    if (result.error){setMsg('⚠️ '+result.error);}
    else{setShowForm(false);resetForm();load();setMsg('✓ Saved!');}
    setSaving(false); setTimeout(()=>setMsg(''),4000);
  };

  const del = async (id:string) => { if(!confirm('Delete this product?'))return; await api.deleteProduct(id); load(); };

  const uploadR2File = async (file: File) => {
    setR2Uploading(true); setR2UploadMsg('');
    try {
      // Step 1: get presigned URL from our API
      const token = localStorage.getItem('fluffy_token');
      let presign: any;
      try {
        const presignRes = await fetch('/api/upload?action=r2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
        });
        presign = await presignRes.json();
      } catch (e: any) {
        setR2UploadMsg('⚠️ Could not reach server: ' + e.message); setR2Uploading(false); return;
      }
      if (presign.error) { setR2UploadMsg('⚠️ ' + presign.error); setR2Uploading(false); return; }

      // Step 2: PUT file directly to R2 using the presigned URL
      try {
        const putRes = await fetch(presign.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!putRes.ok) {
          setR2UploadMsg('⚠️ R2 upload failed (' + putRes.status + '). Check bucket CORS settings.');
          setR2Uploading(false); return;
        }
      } catch (e: any) {
        setR2UploadMsg('⚠️ R2 upload blocked — configure CORS on your R2 bucket (see console).');
        console.error('[R2 upload] PUT failed. You need to add CORS rules to your R2 bucket.\n' +
          'Cloudflare Dashboard → R2 → your bucket → Settings → CORS Policy:\n' +
          JSON.stringify([{AllowedOrigins:['*'],AllowedMethods:['PUT'],AllowedHeaders:['Content-Type'],MaxAgeSeconds:3600}],null,2));
        setR2Uploading(false); return;
      }

      setR2Key(presign.r2Key);
      setR2FileName(file.name); // original filename — saved as r2_file_name in DB
      setR2FileSize(file.size);
      setR2FileType(file.type);
      setR2UploadMsg('✓ Uploaded');
    } catch (e: any) {
      setR2UploadMsg('⚠️ ' + e.message);
    }
    setR2Uploading(false);
  };

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
            {inp('Price (USD $)', priceUSD, setPriceUSD, '9.99', 'number')}
            {inp('ราคาเปรียบเทียบ (THB ฿)', originalPrice, setOriginalPrice, '490', 'number')}
            <div>
              <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5}}>Category *</label>
              <div style={{display:'flex',flexWrap:'wrap' as const,gap:7,padding:'4px 0',marginBottom:6}}>
                  {categories.length === 0
                    ? <div style={{fontSize:12,color:'#f59e0b',fontWeight:600}}>⚠️ No categories yet — go to Admin → 🏷️ Categories to add some.</div>
                    : categories.map(cat=>(
                      <label key={cat} style={{display:'flex',alignItems:'center',gap:5,cursor:'pointer',background:categories_sel.includes(cat)?P+'15':'#f9fafb',border:`1.5px solid ${categories_sel.includes(cat)?P:'#e5e7eb'}`,borderRadius:20,padding:'5px 12px',fontSize:12,fontWeight:600,color:categories_sel.includes(cat)?P:'#374151',transition:'all 0.1s'}}>
                        <input type="checkbox" checked={categories_sel.includes(cat)} onChange={e=>{setCategories_sel(prev=>e.target.checked?[...prev,cat]:prev.filter(c=>c!==cat));}} style={{accentColor:P,width:13,height:13}} />
                        {cat}
                      </label>
                    ))
                  }
                </div>

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
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  {inp('ราคาไฟล์ดิจิทัล (THB ฿)', priceTHB, setPriceTHB, '149', 'number')}
                  {inp('Digital Price (USD $)', priceUSD, setPriceUSD, '3.99', 'number')}
                </div>

                {/* R2 file upload */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>📁 Digital File (R2) <span style={{fontWeight:400,color:'#9ca3af'}}>PDF · ZIP · PNG · max 200 MB</span></div>
                  {r2Key ? (
                    <div style={{background:'white',border:'1.5px solid #86efac',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:20}}>{r2FileType==='application/pdf'?'📄':r2FileType==='image/png'?'🖼️':'🗜️'}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13,fontWeight:700,color:'#065f46',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' as const}}>{r2FileName}</div>
                        <div style={{fontSize:11,color:'#9ca3af'}}>{r2FileType} · {r2FileSize?(r2FileSize/1024/1024).toFixed(2)+' MB':''}</div>
                      </div>
                      <label style={{cursor:'pointer',flexShrink:0}}>
                        <span style={{fontSize:12,fontWeight:700,color:'#2563eb',background:'#dbeafe',borderRadius:8,padding:'4px 10px'}}>🔄 Replace</span>
                        <input type="file" accept=".pdf,.zip,.png" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadR2File(f);e.target.value='';}} />
                      </label>
                    </div>
                  ) : (
                    <label style={{cursor:r2Uploading?'not-allowed':'pointer',display:'block'}}>
                      <div style={{background:r2Uploading?'#f3f4f6':'white',border:`2px dashed ${r2Uploading?'#d1d5db':'#93c5fd'}`,borderRadius:10,padding:'14px',textAlign:'center' as const,fontSize:13,color:r2Uploading?'#9ca3af':'#2563eb',fontWeight:700,transition:'all 0.15s'}}>
                        {r2Uploading ? '⏳ Uploading...' : '📤 Upload Digital File'}
                      </div>
                      <input type="file" accept=".pdf,.zip,.png" style={{display:'none'}} disabled={r2Uploading} onChange={e=>{const f=e.target.files?.[0];if(f)uploadR2File(f);e.target.value='';}} />
                    </label>
                  )}
                  {r2UploadMsg&&<div style={{marginTop:6,fontSize:12,fontWeight:600,color:r2UploadMsg.startsWith('✓')?'#059669':'#dc2626'}}>{r2UploadMsg}</div>}
                </div>

                <div style={{marginBottom:8}}>{inp('Download Instructions', downloadInstruction, setDownloadInstruction, 'วิธีดาวน์โหลดไฟล์ / How to access download...', false)}</div>
                <div style={{margin:'12px 0 8px'}}>
                  {inp('Artist Royalty % (default 80)', digitalRoyaltyPct, setDigitalRoyaltyPct, '80', 'number')}
                </div>
                <div style={{fontSize:11,color:'#1d4ed8',marginBottom:8}}>Artist earns: sale price × royalty % — e.g. 80% means artist gets 80%, platform keeps 20%</div>
                <div style={{fontSize:12,color:'#1d4ed8',background:'#dbeafe',borderRadius:8,padding:'8px 12px'}}>
                  💡 ไฟล์จะถูกเก็บใน Cloudflare R2 — ลิงค์ดาวน์โหลดจะถูกสร้างเมื่อลูกค้าชำระเงินแล้ว
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
                <div style={{marginTop:10}}>{inp('Artist Royalty per item THB (default 100)', physicalRoyaltyTHB, setPhysicalRoyaltyTHB, '100', 'number')}</div>
                <div style={{fontSize:11,color:'#065f46'}}>Artist earns this fixed amount per physical item sold.</div>
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
            <div style={{gridColumn:'1/-1'}}>{inp('Search Keywords (comma-separated, Thai/English)', searchKeywords, setSearchKeywords, 'เงือก, นางเงือก, ทะเล, ocean, sea, mermaid')}</div>
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

      {/* Search + filters */}
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap' as const,alignItems:'center'}}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search title, artist, category…"
          style={{flex:'1 1 200px',padding:'9px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}
          onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
        <select value={filterArtist} onChange={e=>setFilterArtist(e.target.value)}
          style={{padding:'9px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',background:'white',cursor:'pointer'}}>
          <option value="">All Artists</option>
          {artists.map((a:any)=><option key={a.id} value={a.name}>{a.name}</option>)}
        </select>
        <select value={filterCategory} onChange={e=>setFilterCategory(e.target.value)}
          style={{padding:'9px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',background:'white',cursor:'pointer'}}>
          <option value="">All Categories</option>
          {categories.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{fontSize:12,color:'#9ca3af',fontWeight:600,whiteSpace:'nowrap' as const}}>
          Showing {filteredProducts.length} product{filteredProducts.length!==1?'s':''}
        </span>
      </div>

      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{['','TITLE','ARTIST','CATEGORY','PRICE','STATUS',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>{filteredProducts.map(pr=>(
            <tr key={pr.id} style={{borderBottom:'1px solid #f9fafb'}}
              onMouseEnter={e=>(e.currentTarget.style.background='#fafafa')}
              onMouseLeave={e=>(e.currentTarget.style.background='white')}>
              <td style={{padding:'14px 16px',width:52,fontSize:28}}>{pr.cover_image_url?<img src={pr.cover_image_url} style={{width:36,height:36,borderRadius:8,objectFit:'cover'}}/>:pr.image}</td>
              <td style={{padding:'14px 16px',fontWeight:700,color:'#111827',fontSize:14}}>{pr.title}</td>
              <td style={{padding:'14px 16px',fontSize:13,color:'#6b7280'}}>{pr.artist_name||pr.artistName}</td>
              <td style={{padding:'14px 16px'}}>
                <div style={{display:'flex',gap:4,flexWrap:'wrap' as const}}>
                  {(pr.categories && pr.categories.length ? pr.categories : (pr.category ? [pr.category] : [])).map((cat:string) => (
                    <Badge key={cat} color={P} bg="#fce7f3" text={cat} />
                  ))}
                </div>
              </td>
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
        {filteredProducts.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>{products.length===0?'No products yet. Click "+ Add Product" to get started!':'No products match your search.'}</div>}
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
  const [showInactive, setShowInactive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState('');
  const [reminderIds, setReminderIds] = useState<string[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [sendingReminderSingle, setSendingReminderSingle] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [resettingDownload, setResettingDownload] = useState<Record<number,boolean>>({});
  const [increasingLimit, setIncreasingLimit] = useState<Record<string,boolean>>({});

  const applyDownloadItems = (newItems: any[]) => {
    const updated = { ...selected, items: newItems };
    setSelected(updated);
    setOrders((prev: any[]) => prev.map(o => o.id === selected.id ? updated : o));
  };

  const resetDownloads = async (itemIdx: number) => {
    if (!selected) return;
    if (!confirm(`Reset download count for "${selected.items[itemIdx]?.title}"?\nThis will allow the customer to download again from 0.`)) return;
    setResettingDownload(prev => ({ ...prev, [itemIdx]: true }));
    const token = localStorage.getItem('fluffy_token') || '';
    const r = await fetch(`/api/orders?action=reset-downloads&id=${selected.id}&item=${itemIdx}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.error) { setMsg('⚠️ ' + d.error); }
    else {
      applyDownloadItems(d.items);
      setMsg('✓ Download count reset to 0');
      await loadEmailLogs(selected.id);
      setTimeout(() => setMsg(''), 4000);
    }
    setResettingDownload(prev => ({ ...prev, [itemIdx]: false }));
  };

  const increaseLimit = async (itemIdx: number, amount: number) => {
    if (!selected) return;
    const key = `${itemIdx}-${amount}`;
    setIncreasingLimit(prev => ({ ...prev, [key]: true }));
    const token = localStorage.getItem('fluffy_token') || '';
    const r = await fetch(`/api/orders?action=increase-download-limit&id=${selected.id}&item=${itemIdx}&amount=${amount}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    const d = await r.json();
    if (d.error) { setMsg('⚠️ ' + d.error); }
    else {
      applyDownloadItems(d.items);
      setMsg(`✓ Download limit increased by +${amount}`);
      await loadEmailLogs(selected.id);
      setTimeout(() => setMsg(''), 4000);
    }
    setIncreasingLimit(prev => ({ ...prev, [key]: false }));
  };

  const loadEmailLogs = async (orderId: string) => {
    const token = localStorage.getItem('fluffy_token') || '';
    try {
      const r = await fetch(`/api/orders?action=email-logs&id=${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setEmailLogs(Array.isArray(d) ? d : []);
    } catch { setEmailLogs([]); }
  };

  const sendSingleReminder = async () => {
    if (!selected) return;
    setSendingReminderSingle(true);
    const token = localStorage.getItem('fluffy_token') || '';
    const r = await fetch(`/api/orders?action=reminder&id=${selected.id}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json();
    if (d.error) { setMsg('⚠️ ' + d.error); }
    else {
      const now = new Date().toISOString();
      setOrders(prev => prev.map(o => o.id === selected.id ? { ...o, payment_reminder_sent_at: now } : o));
      setSelected((prev: any) => ({ ...prev, payment_reminder_sent_at: now }));
      setMsg('✓ Reminder sent!');
      await loadEmailLogs(selected.id);
    }
    setSendingReminderSingle(false);
    setTimeout(() => setMsg(''), 4000);
  };

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
    setEmailLogs([]);
    loadEmailLogs(o.id);
  };

  const save = async () => {
    if (!selected) return; setSaving(true);
    const updated = await api.updateOrder(selected.id, { status, tracking_number:tracking, shipping_provider:provider });
    setOrders(prev=>prev.map(o=>o.id===selected.id?{...o,...updated}:o));
    setSelected((prev:any)=>({...prev,...updated})); setSaving(false); setMsg('✓ Updated!');
    await loadEmailLogs(selected.id);
    setTimeout(()=>setMsg(''),3000);
  };

  const markPaid = async () => {
    if (!selected) return; setMarking(true);
    try {
      const token = localStorage.getItem('fluffy_token');
      const r = await fetch(`/api/orders?action=pay&id=${selected.id}`,{method:'POST',headers:{Authorization:`Bearer ${token}`}});
      const updated = await r.json();
      if (updated.error) setMsg('⚠️ '+updated.error);
      else { setOrders(prev=>prev.map(o=>o.id===selected.id?updated:o)); setSelected(updated); setMsg('✓ Marked as paid!'); await loadEmailLogs(selected.id); }
    } catch { setMsg('⚠️ Failed.'); }
    setMarking(false); setTimeout(()=>setMsg(''),4000);
  };

  const rejectSlip = async () => {
    if (!selected || !rejectReason) return;
    setRejecting(true);
    try {
      const token = localStorage.getItem('fluffy_token');
      const r = await fetch(`/api/orders?action=reject-slip&id=${selected.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason, note: rejectNote }),
      });
      // Safe JSON parse — Vercel may return non-JSON on timeout even if the action succeeded
      let updated: any = null;
      try { updated = await r.json(); } catch {}
      if (updated?.error) {
        setMsg('⚠️ ' + updated.error);
      } else {
        // Reload order from server to get fresh state (handles timeout/partial response)
        const fresh = await api.allOrders().then((all: any[]) => all.find(o => o.id === selected.id));
        const next = fresh || updated || selected;
        setOrders(prev => prev.map(o => o.id === selected.id ? next : o));
        setSelected(next);
        setStatus(next.status);
        setRejectOpen(false);
        setRejectReason('');
        setRejectNote('');
        setMsg('✓ Slip rejected — customer notified.');
        await loadEmailLogs(selected.id);
      }
    } catch { setMsg('⚠️ Failed.'); }
    setRejecting(false);
    setTimeout(() => setMsg(''), 5000);
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

  const ACTIVE_STATUSES = ['pending_payment','payment_submitted','paid','packing','shipped'];
  const INACTIVE_STATUSES = ['delivered','cancelled'];
  const filteredOrders = filterStatus==='all' ? orders : orders.filter(o=>o.status===filterStatus);
  const activeOrders   = filteredOrders.filter(o=>ACTIVE_STATUSES.includes(o.status));
  const inactiveOrders = filteredOrders.filter(o=>INACTIVE_STATUSES.includes(o.status));
  const DIGITAL_ONLY_STATUS_OPTS = ['pending_payment','payment_submitted','delivered','cancelled'];
  const PHYSICAL_STATUS_OPTS = ['pending_payment','payment_submitted','paid','packing','shipped','delivered','cancelled'];
  const STATUS_OPTS = ['pending_payment','payment_submitted','paid','packing','shipped','delivered','cancelled'];
  const FILTER_TABS = [{k:'all',label:'All'},{k:'pending_payment',label:'Pending'},{k:'payment_submitted',label:'Submitted'},{k:'paid',label:'Paid'},{k:'packing',label:'Preparing'},{k:'shipped',label:'Shipped'},{k:'delivered',label:'Delivered'},{k:'cancelled',label:'Cancelled'}];

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
          {(()=>{
            const renderRows = (list: any[]) => list.map(o=>{
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
                  <td style={{padding:'11px 12px',fontWeight:800,color:'#111827',fontSize:13}}>{fmtOrderTotal(o)}</td>
                  <td style={{padding:'11px 12px'}}><Badge color={c} bg={bg} text={STATUS_TEXT[o.status]||o.status}/></td>
                  <td style={{padding:'11px 12px'}}>
                    {o.payment_reminder_sent_at&&<span style={{fontSize:10,background:'#fef3c7',color:'#92400e',borderRadius:6,padding:'2px 6px',fontWeight:600,whiteSpace:'nowrap' as const}}>reminded</span>}
                    <button onClick={e=>{e.stopPropagation();deleteOrder(o.id);}} disabled={deleting} style={{background:'none',border:'none',cursor:'pointer',color:'#fca5a5',fontSize:14,padding:4}}>🗑</button>
                  </td>
                </tr>
              );
            });
            const cols = ['Order','Date','Customer','Amount','Status',''];
            const thead = <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{cols.map(h=><th key={h} style={{textAlign:'left' as const,padding:'10px 12px',fontSize:10,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>;
            if (filteredOrders.length===0) return <div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>No orders {filterStatus!=='all'?`with status "${filterStatus}"`:'yet'}</div>;
            if (activeOrders.length===0 && inactiveOrders.length===0) return null;
            return (
              <>
                {activeOrders.length>0&&(
                  <>
                    <div style={{padding:'10px 14px',background:'#f0fdf4',borderBottom:'1px solid #d1fae5',fontSize:11,fontWeight:700,color:'#065f46',letterSpacing:0.5}}>
                      🟢 ACTIVE ORDERS ({activeOrders.length})
                    </div>
                    <table style={{width:'100%',borderCollapse:'collapse'}}>
                      {thead}
                      <tbody>{renderRows(activeOrders)}</tbody>
                    </table>
                  </>
                )}
                {inactiveOrders.length>0&&(
                  <>
                    <div style={{padding:'10px 14px',background:'#f9fafb',borderTop:activeOrders.length>0?'2px solid #e5e7eb':'none',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:11,fontWeight:700,color:'#6b7280',letterSpacing:0.5}}>✓ COMPLETED / INACTIVE ({inactiveOrders.length})</span>
                      <button onClick={()=>setShowInactive(v=>!v)} style={{background:'none',border:'1px solid #e5e7eb',borderRadius:8,cursor:'pointer',fontSize:11,fontWeight:600,color:'#6b7280',padding:'3px 10px',fontFamily:'inherit'}}>
                        {showInactive?'Hide':'Show'} Completed
                      </button>
                    </div>
                    {showInactive&&(
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        {thead}
                        <tbody>{renderRows(inactiveOrders)}</tbody>
                      </table>
                    )}
                  </>
                )}
              </>
            );
          })()}
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
              {(()=>{
                const selIsUSD = selected.currency === 'USD' || selected.payment_method === 'paypal';
                return (selected.items||[]).map((i:any,idx:number)=>{
                  const optionType: string = i.optionType || (i.type==='digital' ? 'digital' : i.type==='both' ? 'both' : 'physical');
                  const optionName = i.optionName || i.variant?.name || '';
                  const qty = i.qty || 1;
                  const isDigital = optionType === 'digital';
                  let lineFmt: string;
                  let unitFmt: string;
                  if (selIsUSD && i.unitPriceUSD != null) {
                    lineFmt = `$${((i.unitPriceUSD ?? 0) * qty).toFixed(2)}`;
                    unitFmt = `$${Number(i.unitPriceUSD).toFixed(2)}`;
                  } else {
                    const unitPrice = i.unitPriceTHB || i.price_thb || (i.price ? Math.round(i.price*35) : 0);
                    const lineTotal = i.lineTotalTHB || (unitPrice * qty);
                    lineFmt = `฿${Number(lineTotal).toLocaleString('th-TH')}`;
                    unitFmt = `฿${Number(unitPrice).toLocaleString('th-TH')}`;
                  }
                  return (
                    <div key={idx} style={{background:'#f9fafb',borderRadius:10,padding:'10px 12px',marginBottom:6,border:`1.5px solid ${isDigital?'#bfdbfe':'#bbf7d0'}`}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
                        <span style={{fontSize:18,flexShrink:0}}>{i.image}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,color:'#111827',fontWeight:700,lineHeight:1.3,marginBottom:5}}>{i.title}</div>
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
                        <div style={{textAlign:'right' as const,flexShrink:0,paddingTop:2}}>
                          <div style={{fontWeight:800,color:'#111827',fontSize:14}}>{lineFmt}</div>
                          {qty>1&&<div style={{fontSize:10,color:'#9ca3af'}}>{unitFmt} × {qty}</div>}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              {selected.shipping_thb>0&&selected.currency!=='USD'&&<div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontSize:12,color:'#6b7280'}}><span>Shipping</span><span>฿{selected.shipping_thb}</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontWeight:900,color:'#111827',fontSize:14}}>
                <span>Total</span>
                <span>{fmtOrderTotal(selected)}</span>
              </div>
            </div>

            {/* Digital Download Management — shown for paid orders with digital items */}
            {selected.payment_status === 'paid' && (selected.items||[]).some((i:any)=>(i.optionType||i.type)==='digital') && (
              <div style={{marginBottom:12,borderTop:'1px solid #f3f4f6',paddingTop:12}}>
                <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:8,letterSpacing:0.5}}>⬇️ DIGITAL DOWNLOAD MANAGEMENT</div>
                {(selected.items||[]).map((i:any,idx:number)=>{
                  if ((i.optionType||i.type)!=='digital') return null;
                  const count  = i.download_count  ?? 0;
                  const limit  = i.download_limit  ?? 3;
                  const left   = Math.max(0, limit - count);
                  const hit    = count >= limit;
                  const lastDl = i.last_download_at
                    ? new Date(i.last_download_at).toLocaleString('en-GB',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})
                    : '—';
                  return (
                    <div key={idx} style={{background: hit ? '#fff7ed' : '#f0fdf4', borderRadius:10, padding:'12px 14px', marginBottom:8, border:`1.5px solid ${hit?'#fed7aa':'#bbf7d0'}`}}>
                      {/* Product name */}
                      <div style={{fontSize:13,fontWeight:700,color:'#111827',marginBottom:8}}>{i.title}</div>

                      {/* Stats grid */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
                        <div style={{background:'white',borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                          <div style={{fontSize:18,fontWeight:900,color: hit?'#dc2626':'#1e293b'}}>{count} / {limit}</div>
                          <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginTop:2}}>DOWNLOADS</div>
                        </div>
                        <div style={{background:'white',borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                          <div style={{fontSize:18,fontWeight:900,color: left===0?'#dc2626':left<=1?'#f59e0b':'#059669'}}>{left}</div>
                          <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginTop:2}}>REMAINING</div>
                        </div>
                        <div style={{background:'white',borderRadius:8,padding:'8px 10px',textAlign:'center' as const}}>
                          <div style={{fontSize:12,fontWeight:800,color: hit?'#dc2626':'#059669', paddingTop:4}}>{hit ? '🔒 Limit Reached' : '✅ Active'}</div>
                          <div style={{fontSize:10,color:'#9ca3af',fontWeight:600,marginTop:2}}>STATUS</div>
                        </div>
                      </div>

                      {/* Last download */}
                      <div style={{fontSize:11,color:'#6b7280',marginBottom:10}}>
                        🕐 Last Download: <span style={{fontWeight:700,color:'#374151'}}>{lastDl}</span>
                      </div>

                      {/* Actions */}
                      <div style={{display:'flex',gap:6,flexWrap:'wrap' as const}}>
                        <button
                          disabled={!!resettingDownload[idx]}
                          onClick={()=>resetDownloads(idx)}
                          style={{padding:'6px 12px',borderRadius:8,border:'1.5px solid #fca5a5',background:'#fef2f2',color:'#dc2626',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                          {resettingDownload[idx]?'…':'🔄 Reset Count'}
                        </button>
                        <div style={{display:'flex',gap:4,alignItems:'center'}}>
                          <span style={{fontSize:11,color:'#6b7280',fontWeight:600}}>Increase Limit:</span>
                          {[1,3,5].map(amt=>(
                            <button key={amt}
                              disabled={!!increasingLimit[`${idx}-${amt}`]}
                              onClick={()=>increaseLimit(idx,amt)}
                              style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #bfdbfe',background:'#eff6ff',color:'#1d4ed8',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit'}}>
                              {increasingLimit[`${idx}-${amt}`]?'…':`+${amt}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Payment method badge */}
            {selected.payment_method&&selected.payment_method!=='promptpay'&&(
              <div style={{background:'#eff6ff',borderRadius:8,padding:'7px 11px',marginBottom:10,fontSize:12,color:'#1d4ed8',fontWeight:700}}>
                💳 Payment via: {selected.payment_method==='paypal'?'PayPal QR':'PromptPay'}
              </div>
            )}

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

            {/* Payment submitted — Approve / Reject */}
            {selected.payment_status==='payment_submitted'&&(
              <div style={{marginBottom:10}}>
                <div style={{background:'#ede9fe',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#5b21b6',fontWeight:700,marginBottom:8}}>🕐 Payment slip submitted — awaiting review</div>
                <div style={{display:'flex',gap:8,marginBottom:rejectOpen?8:0}}>
                  <button onClick={markPaid} disabled={marking} style={{flex:1,padding:'10px',background:marking?'#10b981aa':'#10b981',color:'white',border:'none',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:'0 2px 8px #10b98133'}}>
                    {marking?'Processing...':'✅ Approve Payment'}
                  </button>
                  <button onClick={()=>{setRejectOpen(o=>!o);setRejectReason('');setRejectNote('');}} style={{flex:1,padding:'10px',background:'#fef2f2',color:'#dc2626',border:'1.5px solid #fca5a5',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
                    ✕ Reject Slip
                  </button>
                </div>
                {rejectOpen&&(
                  <div style={{background:'#fef2f2',borderRadius:10,padding:12,border:'1.5px solid #fca5a5'}}>
                    <div style={{fontSize:11,fontWeight:700,color:'#dc2626',marginBottom:8}}>REJECT REASON</div>
                    <select value={rejectReason} onChange={e=>setRejectReason(e.target.value)} style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #fca5a5',fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:8,background:'white',color:'#111827',boxSizing:'border-box' as const}}>
                      <option value=''>— Select reason —</option>
                      <option value='Wrong payment amount'>Wrong payment amount</option>
                      <option value='Wrong payment proof'>Wrong payment proof</option>
                      <option value='Unreadable image'>Unreadable image</option>
                      <option value='Duplicate payment proof'>Duplicate payment proof</option>
                      <option value='Other'>Other</option>
                    </select>
                    <input value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="Optional note to customer..." style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #fca5a5',fontSize:13,outline:'none',fontFamily:'inherit',marginBottom:8,boxSizing:'border-box' as const}} />
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={rejectSlip} disabled={rejecting||!rejectReason} style={{flex:1,padding:'9px',background:(!rejectReason||rejecting)?'#fca5a5':'#dc2626',color:'white',border:'none',cursor:!rejectReason?'not-allowed':'pointer',borderRadius:8,fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
                        {rejecting?'Sending...':'Send Rejection'}
                      </button>
                      <button onClick={()=>setRejectOpen(false)} style={{padding:'9px 14px',background:'white',color:'#6b7280',border:'1px solid #e5e7eb',cursor:'pointer',borderRadius:8,fontSize:13,fontFamily:'inherit'}}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mark paid — for orders without slip submission flow */}
            {selected.payment_status!=='paid'&&selected.payment_status!=='payment_submitted'&&(
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <button onClick={markPaid} disabled={marking} style={{flex:1,padding:'10px',background:marking?'#10b981aa':'#10b981',color:'white',border:'none',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:'0 4px 12px #10b98144'}}>
                  {marking?'Processing...':'✅ Mark as Paid'}
                </button>
                <button onClick={sendSingleReminder} disabled={sendingReminderSingle} title="Send payment reminder email" style={{padding:'10px 12px',background:sendingReminderSingle?'#f59e0baa':'#f59e0b',color:'white',border:'none',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit'}}>
                  {sendingReminderSingle?'...':'📧'}
                </button>
              </div>
            )}
            {(()=>{
              const isDigOnly = (selected.items||[]).length>0 && (selected.items||[]).every((i:any)=>(i.optionType||i.type)==='digital');
              if (isDigOnly && selected.status==='delivered') return <div style={{background:'#d1fae5',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#065f46',fontWeight:700,marginBottom:10}}>✅ Payment confirmed · ⬇️ Digital fulfillment complete</div>;
              if (selected.payment_status==='paid') return <div style={{background:'#d1fae5',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#065f46',fontWeight:700,marginBottom:10}}>✅ Payment confirmed</div>;
              return null;
            })()}

            {/* Status update */}
            {(()=>{
              const isDigOnly = (selected.items||[]).length>0 && (selected.items||[]).every((i:any)=>(i.optionType||i.type)==='digital');
              const opts = isDigOnly ? DIGITAL_ONLY_STATUS_OPTS : PHYSICAL_STATUS_OPTS;
              return (
                <div style={{marginBottom:8}}>
                  <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Update Status</label>
                  <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
                    {opts.map((s:string)=><option key={s} value={s}>{STATUS_TEXT[s]}</option>)}
                  </select>
                </div>
              );
            })()}

            {(()=>{
              const hasPhysical = (selected.items||[]).some((i:any)=>(i.optionType||i.type)==='physical');
              return (hasPhysical||selected.type==='physical'||selected.type==='both') ? <>
              <div style={{marginBottom:8}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Shipping Provider</label>
                <input value={provider} onChange={e=>setProvider(e.target.value)} placeholder="Thailand Post, Kerry, Flash..." style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} />
              </div>
              <div style={{marginBottom:12}}>
                <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Tracking Number</label>
                <input value={tracking} onChange={e=>setTracking(e.target.value)} placeholder="TH123456789" style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}} />
              </div>
            </> : null;
            })()}

            {msg&&<div style={{marginBottom:8,fontSize:12,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
            <button onClick={save} disabled={saving} style={{width:'100%',padding:'10px',background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',borderRadius:10,fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 12px ${P}44`}}>{saving?'Saving...':'Update Order'}</button>

            {/* Send custom message */}
            <CustomEmailBox orderId={selected.id} customerEmail={selected.customer_email} onSent={()=>loadEmailLogs(selected.id)} />

            {/* Email history */}
            <div style={{marginTop:18,borderTop:'1px solid #f3f4f6',paddingTop:14}}>
              <div style={{fontSize:11,fontWeight:700,color:'#9ca3af',marginBottom:8,letterSpacing:0.5}}>📧 EMAIL HISTORY</div>
              {emailLogs.length === 0
                ? <div style={{fontSize:12,color:'#d1d5db',fontStyle:'italic'}}>No emails logged yet</div>
                : emailLogs.map((log:any) => {
                    const EVENT_LABELS:any = {
                      order_created:'Order Created → Customer', admin_order_created:'Order Created → Admin',
                      payment_reminder:'Payment Reminder → Customer', payment_confirmed:'Payment Confirmed → Customer',
                      admin_payment_confirmed:'Payment Confirmed → Admin', tracking_added:'Tracking Updated → Customer',
                      shipped_notification:'Shipped Notification → Customer', slip_uploaded:'Slip Uploaded → Admin',
                      slip_rejected:'Slip Rejected → Customer',
                      access_link_resent:'Order Link Resent → Customer',
                      custom_message:'Custom Message → Customer',
                      download_reset:'⬇️ Download Count Reset (Admin)',
                      download_limit_changed:'⬇️ Download Limit Increased (Admin)',
                    };
                    const isErr = log.status === 'error';
                    return (
                      <div key={log.id} style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'6px 0',borderBottom:'1px solid #f9fafb',gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:700,color:isErr?'#dc2626':'#374151'}}>{EVENT_LABELS[log.event_type]||log.event_type}</div>
                          <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>{log.recipient_email}</div>
                          {isErr&&<div style={{fontSize:10,color:'#ef4444',marginTop:1}}>{log.error}</div>}
                        </div>
                        <div style={{textAlign:'right',flexShrink:0}}>
                          <span style={{fontSize:10,background:isErr?'#fee2e2':log.status==='dev_skip'?'#f3f4f6':'#d1fae5',color:isErr?'#dc2626':log.status==='dev_skip'?'#6b7280':'#065f46',borderRadius:6,padding:'2px 6px',fontWeight:600}}>{isErr?'error':log.status==='dev_skip'?'dev':' sent'}</span>
                          <div style={{fontSize:9,color:'#d1d5db',marginTop:2}}>{new Date(log.created_at).toLocaleString('th-TH',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
                        </div>
                      </div>
                    );
                  })
              }
            </div>
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

  const revoke = async (id:string) => {
    if(!confirm('Revoke artist access (set this account back to customer)? Their products, orders and sales history are kept.'))return;
    const res = await api.revokeArtist(id);
    if(res?.error){setMsg('⚠️ '+res.error);}else{setMsg('✓ Artist access revoked.');load();}
    setTimeout(()=>setMsg(''),4000);
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
                  <button onClick={()=>revoke(a.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fcd34d',background:'#fffbeb',cursor:'pointer',fontSize:12,fontWeight:600,color:'#b45309'}}>Revoke</button>
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

// ── Artist Requests ─────────────────────────────────────────────────────────
function ArtistRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [approving, setApproving] = useState<string|null>(null);  // request id being approved
  const [linkChoice, setLinkChoice] = useState('');               // selected artist profile id

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.getArtistRequests(), api.getArtists()]).then(([reqs, arts]) => {
      setRequests(Array.isArray(reqs) ? reqs : []);
      setArtists(Array.isArray(arts) ? arts : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const deleteRequest = async (id: string, name: string) => {
    if (!confirm(`Permanently delete the request from "${name}"? This cannot be undone.`)) return;
    const res = await (api as any).deleteArtistRequest(id);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setMsg('✓ Request deleted.'); load();
    setTimeout(() => setMsg(''), 4000);
  };

  const approve = async (id: string) => {
    setMsg('');
    const res = await api.approveArtistRequest(id, linkChoice || undefined);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setApproving(null); setLinkChoice(''); setMsg('✓ Approved.'); load();
    setTimeout(() => setMsg(''), 4000);
  };
  const reject = async (id: string) => {
    if (!confirm('Reject this artist request?')) return;
    const res = await api.rejectArtistRequest(id);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setMsg('✓ Rejected.'); load();
    setTimeout(() => setMsg(''), 4000);
  };
  // Revoke targets the requesting USER (works for both linked and self-promoted artists).
  const revoke = async (userId: string) => {
    if (!confirm('Revoke artist access (set this user back to customer)? Their products, orders and sales history are kept.')) return;
    const res = await api.revokeArtist(userId);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setMsg('✓ Artist access revoked.'); load();
    setTimeout(() => setMsg(''), 4000);
  };

  const STATUS: Record<string,{c:string,bg:string,t:string}> = {
    pending:  { c:'#92400e', bg:'#fef3c7', t:'Pending' },
    approved: { c:'#065f46', bg:'#d1fae5', t:'Approved' },
    rejected: { c:'#991b1b', bg:'#fee2e2', t:'Rejected' },
    revoked:  { c:'#92400e', bg:'#fffbeb', t:'Revoked' },
  };

  return (
    <div style={{padding:32}}>
      <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:'0 0 8px'}}>Artist Requests</h1>
      <p style={{fontSize:13,color:'#6b7280',margin:'0 0 24px'}}>Review customers who want to become artists. Approving promotes them to the artist role.</p>
      {msg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:12,background:msg.startsWith('✓')?'#d1fae5':'#fee2e2',color:msg.startsWith('✓')?'#065f46':'#991b1b',fontSize:13,fontWeight:600}}>{msg}</div>}

      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{['NAME','EMAIL','MESSAGE','DATE','STATUS',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>{requests.map(r=>(
            <React.Fragment key={r.id}>
            <tr style={{borderBottom:'1px solid #f9fafb'}}>
              <td style={{padding:'12px 16px',fontWeight:700,color:'#111827',fontSize:14}}>{r.username||'—'}</td>
              <td style={{padding:'12px 16px',fontSize:13,color:'#6b7280'}}>{r.email||'—'}</td>
              <td style={{padding:'12px 16px',fontSize:12,color:'#6b7280',maxWidth:280}}>{r.message||<span style={{color:'#cbd5e1'}}>—</span>}</td>
              <td style={{padding:'12px 16px',fontSize:12,color:'#9ca3af'}}>{r.request_date?new Date(r.request_date).toLocaleDateString():'—'}</td>
              <td style={{padding:'12px 16px'}}><Badge color={STATUS[r.status]?.c||'#6b7280'} bg={STATUS[r.status]?.bg||'#f3f4f6'} text={STATUS[r.status]?.t||r.status}/></td>
              <td style={{padding:'12px 16px'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {r.status==='pending'&&(<>
                    <button onClick={()=>{setApproving(approving===r.id?null:r.id);setLinkChoice('');}} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #6ee7b7',background:'#d1fae5',cursor:'pointer',fontSize:12,fontWeight:700,color:'#065f46'}}>Approve</button>
                    <button onClick={()=>reject(r.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:700,color:'#ef4444'}}>Reject</button>
                  </>)}
                  {r.status==='approved'&&(
                    <button onClick={()=>revoke(r.user_id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fcd34d',background:'#fffbeb',cursor:'pointer',fontSize:12,fontWeight:700,color:'#b45309'}}>Revoke</button>
                  )}
                  <button onClick={()=>deleteRequest(r.id, r.username||r.email||'this user')} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:700,color:'#dc2626'}}>Delete</button>
                </div>
              </td>
            </tr>
            {approving===r.id&&(
              <tr style={{background:'#fafafa'}}>
                <td colSpan={6} style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>Link to existing artist profile (optional):</span>
                    <select value={linkChoice} onChange={e=>setLinkChoice(e.target.value)} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit'}}>
                      <option value="">— Self (promote this user as a new artist) —</option>
                      {artists.map(a=><option key={a.id} value={a.id}>{a.name} (/{a.artist_slug})</option>)}
                    </select>
                    <button onClick={()=>approve(r.id)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:P,color:'white',cursor:'pointer',fontSize:13,fontWeight:700}}>Confirm Approve</button>
                    <button onClick={()=>{setApproving(null);setLinkChoice('');}} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:13,fontWeight:600,color:'#6b7280'}}>Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
          ))}</tbody>
        </table>
        {!loading&&requests.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>No artist requests yet.</div>}
        {loading&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>Loading...</div>}
      </div>
    </div>
  );
}

// ── Affiliate Requests ──────────────────────────────────────────────────────
function AffiliateRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [approving, setApproving] = useState<string|null>(null);
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('10');
  const [commission, setCommission] = useState('20');

  const load = useCallback(() => {
    setLoading(true);
    api.getAffiliateRequests().then(reqs => { setRequests(Array.isArray(reqs)?reqs:[]); setLoading(false); }).catch(()=>setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const startApprove = (id: string) => { setApproving(approving===id?null:id); setCode(''); setDiscount('10'); setCommission('20'); setMsg(''); };
  const approve = async (id: string) => {
    const c = code.toUpperCase().trim();
    if (!/^[A-Z0-9]{1,10}$/.test(c)) { setMsg('⚠️ Code must be uppercase letters/numbers, max 10 chars.'); return; }
    const res = await api.approveAffiliate(id, { code: c, discount_amount: Number(discount)||10, affiliate_commission: Number(commission)||20 });
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setApproving(null); setMsg('✓ Approved & code created.'); load();
    setTimeout(()=>setMsg(''), 4000);
  };
  const reject = async (id: string) => {
    if (!confirm('Reject this affiliate request?')) return;
    const res = await api.rejectAffiliate(id);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setMsg('✓ Rejected.'); load(); setTimeout(()=>setMsg(''), 4000);
  };
  const del = async (id: string, name: string) => {
    if (!confirm(`Permanently delete the request from "${name}"?`)) return;
    const res = await api.deleteAffiliateRequest(id);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setMsg('✓ Request deleted.'); load(); setTimeout(()=>setMsg(''), 4000);
  };
  const revoke = async (userId: string) => {
    if (!confirm('Revoke affiliate access? Codes are disabled but all payout, commission and order history is kept.')) return;
    const res = await api.revokeAffiliate(userId);
    if (res?.error) { setMsg('⚠️ ' + res.error); return; }
    setMsg('✓ Affiliate access revoked.'); load(); setTimeout(()=>setMsg(''), 4000);
  };

  const STATUS: Record<string,{c:string,bg:string,t:string}> = {
    pending:{c:'#92400e',bg:'#fef3c7',t:'Pending'}, approved:{c:'#065f46',bg:'#d1fae5',t:'Approved'}, rejected:{c:'#991b1b',bg:'#fee2e2',t:'Rejected'},
  };

  return (
    <div style={{padding:32}}>
      <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:'0 0 8px'}}>Affiliate Requests</h1>
      <p style={{fontSize:13,color:'#6b7280',margin:'0 0 24px'}}>Approving grants affiliate access (keeps existing role) and creates the affiliate's code.</p>
      {msg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:12,background:msg.startsWith('✓')?'#d1fae5':'#fee2e2',color:msg.startsWith('✓')?'#065f46':'#991b1b',fontSize:13,fontWeight:600}}>{msg}</div>}
      <div style={{...card,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{['NAME','EMAIL','PLATFORM','LINK','DATE','STATUS',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'12px 16px',fontSize:11,color:'#9ca3af',fontWeight:700,letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>{requests.map(r=>(
            <React.Fragment key={r.id}>
            <tr style={{borderBottom:'1px solid #f9fafb'}}>
              <td style={{padding:'12px 16px',fontWeight:700,color:'#111827',fontSize:14}}>{r.username||'—'}</td>
              <td style={{padding:'12px 16px',fontSize:13,color:'#6b7280'}}>{r.email||'—'}</td>
              <td style={{padding:'12px 16px',fontSize:12,color:'#6b7280',textTransform:'capitalize'}}>{r.platform||'—'}</td>
              <td style={{padding:'12px 16px',fontSize:12,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.social_media_link?<a href={r.social_media_link} target="_blank" rel="noreferrer" style={{color:P}}>{r.social_media_link}</a>:'—'}</td>
              <td style={{padding:'12px 16px',fontSize:12,color:'#9ca3af'}}>{r.request_date?new Date(r.request_date).toLocaleDateString():'—'}</td>
              <td style={{padding:'12px 16px'}}><Badge color={STATUS[r.status]?.c||'#6b7280'} bg={STATUS[r.status]?.bg||'#f3f4f6'} text={STATUS[r.status]?.t||r.status}/></td>
              <td style={{padding:'12px 16px'}}>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {r.status==='pending'&&(<>
                    <button onClick={()=>startApprove(r.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #6ee7b7',background:'#d1fae5',cursor:'pointer',fontSize:12,fontWeight:700,color:'#065f46'}}>Approve</button>
                    <button onClick={()=>reject(r.id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:700,color:'#ef4444'}}>Reject</button>
                  </>)}
                  {r.status==='approved'&&(
                    <button onClick={()=>revoke(r.user_id)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fcd34d',background:'#fffbeb',cursor:'pointer',fontSize:12,fontWeight:700,color:'#b45309'}}>Revoke</button>
                  )}
                  <button onClick={()=>del(r.id, r.username||r.email||'this user')} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:700,color:'#dc2626'}}>Delete</button>
                </div>
              </td>
            </tr>
            {approving===r.id&&(
              <tr style={{background:'#fafafa'}}>
                <td colSpan={7} style={{padding:'14px 16px'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>Code:</span>
                    <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="YING10" maxLength={10} style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit',textTransform:'uppercase',width:140}} />
                    <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>Discount ฿:</span>
                    <input value={discount} onChange={e=>setDiscount(e.target.value)} type="number" style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit',width:80}} />
                    <span style={{fontSize:13,fontWeight:700,color:'#374151'}}>Commission ฿:</span>
                    <input value={commission} onChange={e=>setCommission(e.target.value)} type="number" style={{padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit',width:80}} />
                    <button onClick={()=>approve(r.id)} style={{padding:'8px 18px',borderRadius:10,border:'none',background:P,color:'white',cursor:'pointer',fontSize:13,fontWeight:700}}>Confirm Approve</button>
                    <button onClick={()=>setApproving(null)} style={{padding:'8px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:13,fontWeight:600,color:'#6b7280'}}>Cancel</button>
                  </div>
                </td>
              </tr>
            )}
            </React.Fragment>
          ))}</tbody>
        </table>
        {!loading&&requests.length===0&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>No affiliate requests yet.</div>}
        {loading&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>Loading...</div>}
      </div>
    </div>
  );
}

// ── Affiliates (management + earnings + payouts) ─────────────────────────────
function AffiliatesTab() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [expanded, setExpanded] = useState<string|null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getAffiliates().then(d => { setAffiliates(Array.isArray(d)?d:[]); setLoading(false); }).catch(()=>setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(()=>setMsg(''), 4000); };

  const toggleAccess = async (a: any) => {
    const res = a.affiliate_enabled ? await api.revokeAffiliate(a.id) : await api.enableAffiliate(a.id);
    if (res?.error) return flash('⚠️ ' + res.error);
    flash(a.affiliate_enabled ? '✓ Affiliate disabled.' : '✓ Affiliate enabled.'); load();
  };
  const saveCode = async (codeRow: any, updates: any) => {
    const res = await api.updateAffiliateCode(codeRow.id, updates);
    if (res?.error) return flash('⚠️ ' + res.error);
    flash('✓ Code updated.'); load();
  };
  const delCode = async (id: string) => {
    if (!confirm('Delete this code? (Test records only — historical orders keep their snapshot.)')) return;
    const res = await api.deleteAffiliateCode(id);
    if (res?.error) return flash('⚠️ ' + res.error);
    flash('✓ Code deleted.'); load();
  };
  const addCode = async (userId: string) => {
    const c = (prompt('New code (uppercase, max 10):')||'').toUpperCase().trim();
    if (!c) return;
    const res = await api.createAffiliateCode({ user_id: userId, code: c, discount_amount: 10, affiliate_commission: 20 });
    if (res?.error) return flash('⚠️ ' + res.error);
    flash('✓ Code created.'); load();
  };
  const markPaid = async (order: any, unpay: boolean) => {
    let note: string|undefined, proof: string|undefined;
    if (!unpay) {
      note = prompt('Payout note (optional):') || undefined;
      proof = prompt('Payout proof URL (optional):') || undefined;
    }
    const res = await api.markAffiliatePaid(order.id, { unpay, payout_note: note, payout_proof_url: proof });
    if (res?.error) return flash('⚠️ ' + res.error);
    flash(unpay ? '✓ Marked unpaid.' : '✓ Marked paid.'); load();
  };

  const thb = (n:number)=>`฿${Number(n||0).toLocaleString('th-TH')}`;

  return (
    <div style={{padding:32}}>
      <h1 style={{fontSize:28,fontWeight:900,color:'#111827',margin:'0 0 8px'}}>Affiliates</h1>
      <p style={{fontSize:13,color:'#6b7280',margin:'0 0 24px'}}>Manage affiliate access, codes, earnings, and commission payouts. Commission counts only on delivered orders.</p>
      {msg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:12,background:msg.startsWith('✓')?'#d1fae5':'#fee2e2',color:msg.startsWith('✓')?'#065f46':'#991b1b',fontSize:13,fontWeight:600}}>{msg}</div>}

      {loading&&<div style={{textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>Loading...</div>}
      {!loading&&affiliates.length===0&&<div style={{...card,textAlign:'center',padding:'48px',color:'#9ca3af',fontSize:14}}>No affiliates yet.</div>}

      {affiliates.map(a=>(
        <div key={a.id} style={{...card,marginBottom:16,padding:20}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{fontSize:16,fontWeight:800,color:'#111827'}}>{a.name||a.email} {a.role==='artist'&&<span style={{fontSize:11,color:'#7c3aed',fontWeight:700}}>· artist</span>}</div>
              <div style={{fontSize:12,color:'#6b7280'}}>{a.email}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <Badge color={a.affiliate_enabled?'#065f46':'#6b7280'} bg={a.affiliate_enabled?'#d1fae5':'#f3f4f6'} text={a.affiliate_enabled?'Enabled':'Disabled'}/>
              <button onClick={()=>toggleAccess(a)} style={{padding:'6px 14px',borderRadius:10,border:a.affiliate_enabled?'1px solid #fcd34d':'1px solid #6ee7b7',background:a.affiliate_enabled?'#fffbeb':'#d1fae5',cursor:'pointer',fontSize:12,fontWeight:700,color:a.affiliate_enabled?'#b45309':'#065f46'}}>{a.affiliate_enabled?'Disable':'Enable'}</button>
            </div>
          </div>

          {/* Earnings */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))',gap:10,margin:'16px 0'}}>
            {[
              ['Orders', a.summary?.ordersReferred ?? 0],
              ['Physical Rev.', thb(a.summary?.physicalRevenueTHB)],
              ['Earned', thb(a.summary?.commissionEarned)],
              ['Pending', thb(a.summary?.pendingCommission)],
              ['Paid', thb(a.summary?.paidCommission)],
            ].map(([l,v])=>(
              <div key={l as string} style={{background:'#fafafa',borderRadius:12,padding:'10px 12px'}}>
                <div style={{fontSize:10,color:'#9ca3af',fontWeight:700}}>{l}</div>
                <div style={{fontSize:15,fontWeight:900,color:'#111827'}}>{v}</div>
              </div>
            ))}
          </div>

          {/* Codes */}
          <div style={{marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontSize:13,fontWeight:800,color:'#374151'}}>Codes</span>
              <button onClick={()=>addCode(a.id)} style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${P}`,background:'white',cursor:'pointer',fontSize:11,fontWeight:700,color:P}}>+ Add Code</button>
            </div>
            {(a.codes||[]).map((c:any)=><AffiliateCodeRow key={c.id} codeRow={c} onSave={saveCode} onDelete={delCode} />)}
            {(!a.codes||a.codes.length===0)&&<div style={{fontSize:12,color:'#9ca3af'}}>No codes.</div>}
          </div>

          {/* Payout account details */}
          <div style={{background:'#f8fafc',borderRadius:12,padding:'12px 14px',marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:800,color:'#374151',marginBottom:6}}>💳 Payout Account</div>
            {a.payout_account_name||a.payout_account_number||a.payout_payment_method ? (
              <div style={{fontSize:12,color:'#475569',lineHeight:1.7}}>
                <div><b>Name:</b> {a.payout_account_name||'—'}</div>
                <div><b>Method:</b> {a.payout_payment_method||'—'}{a.payout_bank_name?` · ${a.payout_bank_name}`:''}</div>
                <div><b>Account / PayPal:</b> {a.payout_account_number||'—'}</div>
                {a.payout_note&&<div><b>Note:</b> {a.payout_note}</div>}
              </div>
            ) : <div style={{fontSize:12,color:'#9ca3af'}}>No payout account details provided yet.</div>}
          </div>

          {/* Monthly payout management */}
          <AffiliatePayoutSection a={a} onChange={load} />

          {/* Orders / payouts */}
          <button onClick={()=>setExpanded(expanded===a.id?null:a.id)} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:700,color:'#6b7280'}}>
            {expanded===a.id?'Hide':'View'} referred orders ({(a.orders||[]).length})
          </button>
          {expanded===a.id&&(
            <div style={{marginTop:12,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:680}}>
                <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>{['ORDER','DATE','CODE','AMOUNT','DISCOUNT','COMMISSION','STATUS','PAYOUT'].map((h,i)=><th key={i} style={{textAlign:'left',padding:'8px 12px',fontSize:10,color:'#9ca3af',fontWeight:700}}>{h}</th>)}</tr></thead>
                <tbody>{(a.orders||[]).map((o:any)=>{
                  const delivered = o.status==='delivered';
                  return (
                    <tr key={o.id} style={{borderBottom:'1px solid #f9fafb'}}>
                      <td style={{padding:'8px 12px',fontSize:12,fontWeight:700,color:P}}>#{(o.id||'').slice(-8).toUpperCase()}</td>
                      <td style={{padding:'8px 12px',fontSize:11,color:'#9ca3af'}}>{o.created_at?new Date(o.created_at).toLocaleDateString():'—'}</td>
                      <td style={{padding:'8px 12px',fontSize:12,fontWeight:700}}>{o.affiliate_code}</td>
                      <td style={{padding:'8px 12px',fontSize:12}}>{thb(o.total_thb)}</td>
                      <td style={{padding:'8px 12px',fontSize:12,color:'#dc2626'}}>−{thb(o.affiliate_discount_thb)}</td>
                      <td style={{padding:'8px 12px',fontSize:12,fontWeight:800,color:delivered?'#059669':'#9ca3af'}}>{thb(o.affiliate_commission_thb)}</td>
                      <td style={{padding:'8px 12px',fontSize:11,textTransform:'capitalize'}}>{o.status}</td>
                      <td style={{padding:'8px 12px'}}>
                        {delivered ? (
                          o.affiliate_paid_at
                            ? <button onClick={()=>markPaid(o,true)} style={{padding:'4px 10px',borderRadius:8,border:'1px solid #6ee7b7',background:'#d1fae5',cursor:'pointer',fontSize:11,fontWeight:700,color:'#065f46'}}>✓ Paid</button>
                            : <button onClick={()=>markPaid(o,false)} style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${P}`,background:'white',cursor:'pointer',fontSize:11,fontWeight:700,color:P}}>Mark Paid</button>
                        ) : <span style={{fontSize:11,color:'#9ca3af'}}>—</span>}
                        {o.affiliate_payout_proof_url&&<a href={o.affiliate_payout_proof_url} target="_blank" rel="noreferrer" style={{marginLeft:6,fontSize:11,color:P}}>proof</a>}
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
              {(a.orders||[]).length===0&&<div style={{textAlign:'center',padding:'24px',color:'#9ca3af',fontSize:13}}>No referred orders.</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AffiliateCodeRow({codeRow,onSave,onDelete}:{codeRow:any,onSave:(c:any,u:any)=>void,onDelete:(id:string)=>void}) {
  const [code, setCode] = useState(codeRow.code);
  const [discount, setDiscount] = useState(String(codeRow.discount_amount ?? 10));
  const [commission, setCommission] = useState(String(codeRow.affiliate_commission ?? 20));
  const dirty = code!==codeRow.code || Number(discount)!==Number(codeRow.discount_amount) || Number(commission)!==Number(codeRow.affiliate_commission);
  return (
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',padding:'8px 0',borderBottom:'1px solid #f9fafb'}}>
      <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} maxLength={10} style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,fontWeight:700,textTransform:'uppercase',width:120,fontFamily:'inherit'}} />
      <span style={{fontSize:12,color:'#6b7280'}}>Discount ฿</span>
      <input value={discount} onChange={e=>setDiscount(e.target.value)} type="number" style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,width:70,fontFamily:'inherit'}} />
      <span style={{fontSize:12,color:'#6b7280'}}>Commission ฿</span>
      <input value={commission} onChange={e=>setCommission(e.target.value)} type="number" style={{padding:'6px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,width:70,fontFamily:'inherit'}} />
      <button onClick={()=>onSave(codeRow,{active:!codeRow.active})} style={{padding:'5px 10px',borderRadius:8,border:'1px solid #e5e7eb',background:codeRow.active?'#d1fae5':'#f3f4f6',cursor:'pointer',fontSize:11,fontWeight:700,color:codeRow.active?'#065f46':'#6b7280'}}>{codeRow.active?'Active':'Inactive'}</button>
      {dirty&&<button onClick={()=>onSave(codeRow,{code:code.toUpperCase().trim(),discount_amount:Number(discount),affiliate_commission:Number(commission)})} style={{padding:'5px 12px',borderRadius:8,border:'none',background:P,color:'white',cursor:'pointer',fontSize:11,fontWeight:700}}>Save</button>}
      <button onClick={()=>onDelete(codeRow.id)} style={{padding:'5px 10px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:11,fontWeight:700,color:'#dc2626'}}>Delete</button>
    </div>
  );
}

// ── Affiliate monthly payout (admin) ─────────────────────────────────────────
function AffiliatePayoutSection({a, onChange}:{a:any, onChange:()=>void}) {
  const MON = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()+1);
  const [year, setYear] = useState(now.getFullYear());
  const [paid, setPaid] = useState('');
  const [note, setNote] = useState('');
  const [proof, setProof] = useState('');
  const [status, setStatus] = useState('pending');
  const [msg, setMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const years = Array.from({length:3},(_,i)=>now.getFullYear()-i);
  const thb=(n:number)=>`฿${Number(n||0).toLocaleString('th-TH')}`;

  // Calculated commission = delivered + physical orders referred in this month/year
  const calculated = (a.orders||[]).filter((o:any)=>{
    if (o.status!=='delivered') return false;
    if (!((o.items||[]).some((i:any)=>(i.optionType||i.type)==='physical'))) return false;
    const d = new Date(o.created_at||0);
    return d.getMonth()+1===month && d.getFullYear()===year;
  }).reduce((s:number,o:any)=>s+Number(o.affiliate_commission_thb||0),0);

  const existing = (a.payouts||[]).find((py:any)=>py.month===month && py.year===year);

  useEffect(()=>{
    if (existing) { setPaid(String(existing.paid_amount??'')); setNote(existing.payout_note||''); setProof(existing.payout_proof_url||''); setStatus(existing.status||'pending'); }
    else { setPaid(String(calculated)); setNote(''); setProof(''); setStatus('pending'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[month,year,a.id]);

  const uploadProof = async (f:File) => {
    setUploading(true);
    const res = await api.uploadFile(f,'payouts');
    setUploading(false);
    if (res?.error) { setMsg('⚠️ '+res.error); return; }
    setProof(res.publicUrl||res.url||'');
  };

  const save = async () => {
    setMsg('');
    const body:any = {
      affiliate_user_id: a.id, month, year,
      calculated_commission: calculated,
      paid_amount: Number(paid)||0,
      status, payout_note: note||null, payout_proof_url: proof||null,
      paid_at: status==='paid' ? (existing?.paid_at || new Date().toISOString()) : null,
    };
    if (existing) body.id = existing.id;
    const res = await api.saveAffiliatePayout(body);
    if (res?.error) { setMsg('⚠️ '+res.error); return; }
    setMsg('✓ Saved.'); onChange(); setTimeout(()=>setMsg(''),3000);
  };
  const del = async (id:string) => {
    if (!confirm('Delete this payout record?')) return;
    const res = await api.deleteAffiliatePayout(id);
    if (res?.error) { setMsg('⚠️ '+res.error); return; }
    setMsg('✓ Deleted.'); onChange();
  };

  return (
    <div style={{background:'#fafafa',borderRadius:12,padding:14,marginBottom:12}}>
      <div style={{fontSize:12,fontWeight:800,color:'#374151',marginBottom:10}}>💸 Monthly Payout</div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} style={{padding:'7px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit'}}>{MON.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
        <select value={year} onChange={e=>setYear(Number(e.target.value))} style={{padding:'7px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit'}}>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
        <span style={{fontSize:13,color:'#374151'}}>Calculated: <b>{thb(calculated)}</b></span>
      </div>
      <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginBottom:10}}>
        <span style={{fontSize:12,color:'#6b7280'}}>Paid ฿</span>
        <input value={paid} onChange={e=>setPaid(e.target.value)} type="number" style={{padding:'7px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,width:100,fontFamily:'inherit'}} />
        <select value={status} onChange={e=>setStatus(e.target.value)} style={{padding:'7px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit'}}>
          <option value="pending">Pending</option><option value="paid">Paid</option>
        </select>
        <label style={{padding:'7px 12px',borderRadius:8,border:`1px solid ${P}`,background:'white',cursor:'pointer',fontSize:12,fontWeight:700,color:P}}>
          {uploading?'Uploading…':(proof?'Replace proof':'Upload proof')}
          <input type="file" accept="image/*,.pdf" style={{display:'none'}} disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)uploadProof(f);e.target.value='';}} />
        </label>
        {proof&&<a href={proof} target="_blank" rel="noreferrer" style={{fontSize:12,color:P,fontWeight:700}}>view</a>}
      </div>
      <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Payout note (optional)" style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit',marginBottom:10,boxSizing:'border-box'}} />
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <button onClick={save} style={{padding:'8px 18px',borderRadius:10,border:'none',background:P,color:'white',cursor:'pointer',fontSize:13,fontWeight:700}}>{existing?'Update Payout':'Save Payout'}</button>
        {msg&&<span style={{fontSize:12,fontWeight:700,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</span>}
      </div>

      {(a.payouts||[]).length>0&&(
        <div style={{marginTop:12,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:560}}>
            <thead><tr style={{borderBottom:'1px solid #e5e7eb'}}>{['MONTH','CALC','PAID','STATUS','PAID DATE','PROOF',''].map((h,i)=><th key={i} style={{textAlign:'left',padding:'6px 10px',fontSize:10,color:'#9ca3af',fontWeight:700}}>{h}</th>)}</tr></thead>
            <tbody>{(a.payouts||[]).map((py:any)=>(
              <tr key={py.id} style={{borderBottom:'1px solid #f3f4f6'}}>
                <td style={{padding:'6px 10px',fontSize:12,fontWeight:700}}>{MON[py.month]} {py.year}</td>
                <td style={{padding:'6px 10px',fontSize:12}}>{thb(py.calculated_commission)}</td>
                <td style={{padding:'6px 10px',fontSize:12,fontWeight:800,color:'#059669'}}>{thb(py.paid_amount)}</td>
                <td style={{padding:'6px 10px',fontSize:11}}><Badge color={py.status==='paid'?'#065f46':'#92400e'} bg={py.status==='paid'?'#d1fae5':'#fef3c7'} text={py.status==='paid'?'Paid':'Pending'}/></td>
                <td style={{padding:'6px 10px',fontSize:11,color:'#9ca3af'}}>{py.paid_at?new Date(py.paid_at).toLocaleDateString():'—'}</td>
                <td style={{padding:'6px 10px'}}>{py.payout_proof_url?<a href={py.payout_proof_url} target="_blank" rel="noreferrer" style={{color:P,fontSize:11,fontWeight:700}}>View</a>:<span style={{color:'#9ca3af',fontSize:11}}>—</span>}</td>
                <td style={{padding:'6px 10px'}}><button onClick={()=>del(py.id)} style={{padding:'3px 8px',borderRadius:6,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:10,fontWeight:700,color:'#dc2626'}}>Del</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Theme text field — defined OUTSIDE component to prevent remount ──────────
// StableInput: keeps local state while typing, flushes to parent only on blur.
// This prevents the focus-loss bug caused by parent re-renders on every keystroke.
function TF({label,val,set,ph}:{label:string,val:string,set:(v:string)=>void,ph?:string}) {
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
        placeholder={ph}
        onChange={e=>setLocal(e.target.value)}
        onBlur={()=>set(local)}
        style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=P}
      />
    </div>
  );
}

// ── Theme & CMS ─────────────────────────────────────────────────────────────
function CategoriesTab() {
  const P = '#f472b6';
  const card = { background:'white', borderRadius:16, boxShadow:'0 2px 10px rgba(0,0,0,0.06)' };
  const [cats, setCats] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName]     = useState('');
  const [slug, setSlug]     = useState('');
  const [icon, setIcon]     = useState('🎨');
  const [iconType, setIconType] = useState<'emoji'|'image'>('emoji');
  const [active, setActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');
  const [msg, setMsg]       = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const tok = () => localStorage.getItem('fluffy_token') || '';
  const load = async () => {
    const r = await fetch('/api/categories', { headers:{ Authorization:`Bearer ${tok()}` } });
    const d = await r.json();
    setCats(Array.isArray(d) ? d : []);
  };
  useEffect(() => { load(); }, []);

  const startNew  = () => { setEditing({}); setName(''); setSlug(''); setIcon('🎨'); setIconType('emoji'); setActive(true); setSortOrder('0'); setMsg(''); };
  const startEdit = (ct:any) => { setEditing(ct); setName(ct.name); setSlug(ct.slug); setIcon(ct.icon||'🎨'); setIconType(ct.icon_type||'emoji'); setActive(ct.active); setSortOrder(String(ct.sort_order||0)); setMsg(''); };
  const cancel    = () => { setEditing(null); setMsg(''); };

  const uploadIcon = async (file: File) => {
    setUploading(true);
    const result = await api.uploadFile(file, 'categories');
    setUploading(false);
    if (result.error) { alert('Upload failed: ' + result.error); return; }
    setIcon(result.publicUrl);
    setIconType('image');
  };

  const save = async () => {
    if (!name.trim()) { setMsg('⚠️ Name required'); return; }
    setSaving(true); setMsg('');
    const body = { name:name.trim(), slug:slug.trim()||name.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''), icon, icon_type:iconType, active, sort_order:parseInt(sortOrder)||0 };
    const url  = editing?.id ? `/api/categories?id=${editing.id}` : '/api/categories';
    const meth = editing?.id ? 'PUT' : 'POST';
    const res  = await fetch(url, { method:meth, headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok()}`}, body:JSON.stringify(body) }).then(r=>r.json());
    if (res.error) { setMsg('⚠️ ' + res.error); setSaving(false); return; }
    setMsg('✓ Saved!'); await load(); setTimeout(cancel, 1000); setSaving(false);
  };

  const del = async (id:string, n:string) => {
    if (!confirm(`Delete "${n}"?`)) return;
    await fetch(`/api/categories?id=${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${tok()}` } });
    load();
  };

  const toggleActive = async (ct:any) => {
    await fetch(`/api/categories?id=${ct.id}`, { method:'PUT', headers:{'Content-Type':'application/json',Authorization:`Bearer ${tok()}`}, body:JSON.stringify({ active:!ct.active }) });
    load();
  };

  const inp = (label:string, val:string, set:(v:string)=>void, ph='', type='text') => (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
        style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
        onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
    </div>
  );

  if (editing !== null) return (
    <div style={{padding:28,maxWidth:520}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:900,color:'#111827',margin:0}}>{editing?.id ? 'Edit Category' : 'New Category'}</h1>
        <button onClick={cancel} style={{background:'#f3f4f6',border:'none',cursor:'pointer',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600}}>✕ Cancel</button>
      </div>
      <div style={{...card,padding:24}}>
        {inp('Category Name *', name, setName, 'Animals')}
        <div style={{display:'grid',gridTemplateColumns:'1fr 80px',gap:12}}>
          {inp('Slug', slug, setSlug, 'animals')}
          {inp('Sort Order', sortOrder, setSortOrder, '0', 'number')}
        </div>
        {/* Icon */}
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Icon</label>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <button type="button" onClick={()=>setIconType('emoji')} style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${iconType==='emoji'?P:'#e5e7eb'}`,background:iconType==='emoji'?P+'10':'white',cursor:'pointer',fontSize:12,fontWeight:600,color:iconType==='emoji'?P:'#374151'}}>
              😀 Emoji
            </button>
            <button type="button" onClick={()=>setIconType('image')} style={{padding:'7px 14px',borderRadius:8,border:`1.5px solid ${iconType==='image'?P:'#e5e7eb'}`,background:iconType==='image'?P+'10':'white',cursor:'pointer',fontSize:12,fontWeight:600,color:iconType==='image'?P:'#374151'}}>
              🖼️ Image
            </button>
          </div>
          {iconType==='emoji'
            ? <input value={icon} onChange={e=>setIcon(e.target.value)} placeholder="🎨"
                style={{width:80,padding:'10px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:24,textAlign:'center' as const,outline:'none'}} />
            : <div style={{display:'flex',gap:10,alignItems:'center'}}>
                {icon && iconType==='image' && <img src={icon} alt="" style={{width:48,height:48,borderRadius:8,objectFit:'cover',border:'1px solid #e5e7eb'}} />}
                <label style={{cursor:'pointer',padding:'8px 14px',borderRadius:8,border:`1.5px solid ${P}`,background:'#fdf2f8',color:P,fontSize:12,fontWeight:700}}>
                  {uploading?'⏳ Uploading...':'📤 Upload Image'}
                  <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadIcon(f);}} />
                </label>
              </div>
          }
        </div>
        <div style={{marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
          <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} id="cat-active" style={{width:15,height:15,accentColor:P}} />
          <label htmlFor="cat-active" style={{fontSize:13,fontWeight:700,color:'#374151',cursor:'pointer'}}>Active (visible on site)</label>
        </div>
        {/* Preview */}
        <div style={{background:'#f9fafb',borderRadius:12,padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontSize:32}}>
            {iconType==='image'&&icon ? <img src={icon} alt="" style={{width:40,height:40,borderRadius:8,objectFit:'cover'}} /> : <span>{icon||'🎨'}</span>}
          </div>
          <div>
            <div style={{fontWeight:700,color:'#111827'}}>{name||'Category Name'}</div>
            <div style={{fontSize:11,color:'#9ca3af'}}>/categories/{slug||'slug'}</div>
          </div>
          <span style={{marginLeft:'auto',fontSize:11,fontWeight:700,background:active?'#d1fae5':'#f3f4f6',color:active?'#065f46':'#9ca3af',borderRadius:20,padding:'2px 10px'}}>{active?'Active':'Inactive'}</span>
        </div>
        {msg&&<div style={{marginBottom:10,fontSize:13,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{padding:'11px 24px',background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
          {saving?'Saving...':'💾 Save Category'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:900,color:'#111827',margin:0}}>Categories ({cats.length})</h1>
        <button onClick={startNew} style={{background:P,color:'white',border:'none',cursor:'pointer',padding:'10px 20px',borderRadius:20,fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 14px ${P}44`}}>+ Add Category</button>
      </div>
      <p style={{fontSize:13,color:'#6b7280',marginBottom:16}}>Categories are used on the shop page and homepage. Add categories here, then assign products to them.</p>
      <div style={{...card,overflow:'hidden'}}>
        {cats.length===0 ? (
          <div style={{textAlign:'center' as const,padding:'48px',color:'#9ca3af'}}>
            No categories yet. Click "+ Add Category" to create your first.<br/>
            <small style={{color:'#d97706'}}>Tip: Create categories matching your existing products (Animals, Kawaii, Fantasy, etc.)</small>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>
              {['Icon','Name','Slug','Order','Status',''].map(h=><th key={h} style={{textAlign:'left' as const,padding:'11px 14px',fontSize:11,color:'#9ca3af',fontWeight:700}}>{h}</th>)}
            </tr></thead>
            <tbody>{cats.map(ct=>(
              <tr key={ct.id} style={{borderBottom:'1px solid #f9fafb'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <td style={{padding:'10px 14px',fontSize:24}}>
                  {ct.icon_type==='image'&&ct.icon ? <img src={ct.icon} alt="" style={{width:32,height:32,borderRadius:6,objectFit:'cover'}} /> : <span>{ct.icon}</span>}
                </td>
                <td style={{padding:'10px 14px',fontWeight:700,color:'#111827',fontSize:14}}>{ct.name}</td>
                <td style={{padding:'10px 14px',fontSize:12,color:'#6b7280',fontFamily:'monospace'}}>{ct.slug}</td>
                <td style={{padding:'10px 14px',fontSize:13,color:'#374151'}}>{ct.sort_order}</td>
                <td style={{padding:'10px 14px'}}>
                  <button onClick={()=>toggleActive(ct)} style={{padding:'3px 10px',borderRadius:20,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:ct.active?'#d1fae5':'#f3f4f6',color:ct.active?'#065f46':'#9ca3af'}}>
                    {ct.active?'✅ Active':'⬜ Inactive'}
                  </button>
                  {ct.show_on_homepage&&<span style={{fontSize:10,background:'#dbeafe',color:'#1d4ed8',borderRadius:20,padding:'2px 8px',fontWeight:700,marginLeft:4}}>🏠</span>}
                </td>
                <td style={{padding:'10px 14px',display:'flex',gap:6}}>
                  <button onClick={()=>startEdit(ct)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600}}>Edit</button>
                  <button onClick={()=>del(ct.id,ct.name)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:600,color:'#ef4444'}}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function PagesCMSTab() {
  const P = '#f472b6'; // module-level primary color constant
  const card = { background:'white', borderRadius:16, boxShadow:'0 2px 10px rgba(0,0,0,0.06)' };
  const [pgs, setPgs] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [status, setStatus] = useState('draft');
  const [excerpt, setExcerpt] = useState('');
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [sortOrder, setSortOrder] = useState('0');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  const tok = () => localStorage.getItem('fluffy_token') || '';
  const load = async () => {
    setLoadErr('');
    try {
      const r = await fetch('/api/pages', { headers:{ Authorization:`Bearer ${tok()}` } });
      const d = await r.json();
      if (d.error) { setLoadErr('API error: ' + d.error); return; }
      if (!Array.isArray(d)) { setLoadErr('Unexpected response: ' + JSON.stringify(d).slice(0,100)); return; }
      setPgs(d);
    } catch(e:any) { setLoadErr('Fetch failed: ' + e.message); }
  };
  useEffect(() => { load(); }, []);

  const startNew  = () => { setEditing({}); setTitle(''); setSlug(''); setContent(''); setImageUrl(''); setStatus('draft'); setExcerpt(''); setShowOnHomepage(false); setSortOrder('0'); setMsg(''); };
  const startEdit = (p:any) => { setEditing(p); setTitle(p.title); setSlug(p.slug); setContent(p.content||''); setImageUrl(p.image_url||''); setStatus(p.status); setExcerpt(p.excerpt||''); setShowOnHomepage(p.show_on_homepage||false); setSortOrder(String(p.sort_order||0)); setMsg(''); };
  const cancel    = () => { setEditing(null); setMsg(''); };

  const save = async () => {
    if (!title.trim() || !slug.trim()) { setMsg('⚠️ Title and slug required'); return; }
    setSaving(true); setMsg('');
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-');
    const body = { title:title.trim(), slug:cleanSlug, content, excerpt:excerpt.trim()||null, image_url:imageUrl||null, status, show_on_homepage:showOnHomepage, sort_order:parseInt(sortOrder)||0 };
    const url  = editing?.id ? `/api/pages?id=${editing.id}` : '/api/pages';
    const meth = editing?.id ? 'PUT' : 'POST';
    let result: any;
    try {
      const r = await fetch(url, { method:meth, headers:{'Content-Type':'application/json', Authorization:`Bearer ${tok()}`}, body:JSON.stringify(body) });
      result = await r.json();
    } catch(e:any) { setMsg('⚠️ Network error: ' + e.message); setSaving(false); return; }
    if (result.error) { setMsg('⚠️ ' + result.error + (result.hint ? ' — ' + result.hint : '')); setSaving(false); return; }
    // Update editing state with saved data so form reflects DB state
    setEditing(result);
    setSlug(result.slug); // slug may have been cleaned by API
    setMsg('✓ Saved successfully!');
    await load(); // refresh list in background
    setSaving(false);
  };

  const del = async (id:string, t:string) => {
    if (!confirm(`Delete "${t}"?`)) return;
    await fetch(`/api/pages?id=${id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${tok()}` } });
    load();
  };

  const toggle = async (p:any) => {
    const s = p.status==='published' ? 'draft' : 'published';
    await fetch(`/api/pages?id=${p.id}`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${tok()}`}, body:JSON.stringify({status:s}) });
    load();
  };

  const F = (label:string, val:string, set:(v:string)=>void, ph='', area=false) => (
    <div style={{marginBottom:12}}>
      <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>{label}</label>
      {area
        ? <textarea value={val} onChange={e=>set(e.target.value)} placeholder={ph} rows={12}
            style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}}
            onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
        : <input value={val} onChange={e=>set(e.target.value)} placeholder={ph}
            style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
            onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
      }
    </div>
  );

  if (editing !== null) return (
    <div style={{padding:28,maxWidth:720}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:900,color:'#111827',margin:0}}>{editing?.id ? 'Edit Page' : 'New Page'}</h1>
        <button onClick={cancel} style={{background:'#f3f4f6',border:'none',cursor:'pointer',padding:'8px 16px',borderRadius:10,fontSize:13,fontWeight:600}}>✕ Cancel</button>
      </div>
      <div style={{...card,padding:24}}>
        {F('Title *', title, setTitle, 'About Us')}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            {F('Slug *', slug, setSlug, 'about-us')}
            <div style={{fontSize:11,color:'#6b7280',marginTop:-8,marginBottom:12}}>
              URL: /pages/{slug||'your-slug'}
              {title&&!slug&&<button type="button" onClick={()=>setSlug(title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''))} style={{marginLeft:8,background:'none',border:'none',cursor:'pointer',color:P,fontSize:11,fontWeight:600}}>Auto</button>}
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Status</label>
            <select value={status} onChange={e=>setStatus(e.target.value)} style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit'}}>
              <option value="draft">📝 Draft</option>
              <option value="published">✅ Published</option>
            </select>
          </div>
        </div>
        {/* Cover image upload */}
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>Cover Image (optional)</label>
          {imageUrl && (
            <div style={{position:'relative' as const,marginBottom:8,display:'inline-block'}}>
              <img src={imageUrl} alt="cover" style={{width:'100%',maxWidth:340,height:160,objectFit:'cover',borderRadius:10,border:'1.5px solid #e5e7eb',display:'block'}} />
              <button onClick={()=>setImageUrl('')} style={{position:'absolute' as const,top:6,right:6,background:'rgba(0,0,0,0.55)',color:'white',border:'none',borderRadius:'50%',width:24,height:24,cursor:'pointer',fontSize:12,lineHeight:'24px',textAlign:'center' as const}}>✕</button>
            </div>
          )}
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,border:`1.5px solid ${P}`,background:'#fdf2f8',cursor:uploadingCover?'not-allowed':'pointer',fontSize:12,fontWeight:700,color:P}}>
              {uploadingCover ? '⏳ Uploading…' : '📤 Upload Image'}
              <input type="file" accept="image/*" style={{display:'none'}} disabled={uploadingCover} onChange={async e=>{
                const file = e.target.files?.[0]; if (!file) return;
                setUploadingCover(true);
                const result = await api.uploadFile(file, 'pages');
                setUploadingCover(false);
                if (result.error) { alert('Upload failed: ' + result.error); return; }
                setImageUrl(result.publicUrl);
                e.target.value = '';
              }} />
            </label>
            <span style={{fontSize:11,color:'#9ca3af'}}>or paste URL:</span>
            <input value={imageUrl} onChange={e=>setImageUrl(e.target.value)} placeholder="https://..."
              style={{flex:1,padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:12,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
              onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
          </div>
        </div>
        {F('Excerpt (optional)', excerpt, setExcerpt, 'Short summary shown on homepage and pages list...')}
        <div style={{display:'grid',gridTemplateColumns:'1fr 100px',gap:12,marginBottom:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',background:showOnHomepage?P+'10':'#f9fafb',border:`1.5px solid ${showOnHomepage?P:'#e5e7eb'}`,borderRadius:10,padding:'10px 14px',fontSize:13,fontWeight:600,color:showOnHomepage?P:'#374151',transition:'all 0.1s'}}>
            <input type="checkbox" checked={showOnHomepage} onChange={e=>setShowOnHomepage(e.target.checked)} style={{accentColor:P,width:15,height:15}} />
            🏠 Show on Homepage
          </label>
          <div>
            <label style={{display:'block',fontSize:11,fontWeight:700,color:'#374151',marginBottom:4}}>Sort Order</label>
            <input type="number" value={sortOrder} onChange={e=>setSortOrder(e.target.value)} placeholder="0"
              style={{width:'100%',padding:'10px 13px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
              onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
          </div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:4}}>Content</label>
          <HtmlEditor value={content} onChange={setContent} />
        </div>
        {msg&&<div style={{marginBottom:12,fontSize:13,fontWeight:600,color:msg.startsWith('✓')?'#059669':'#dc2626'}}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{padding:'12px 28px',background:saving?P+'88':P,color:'white',border:'none',cursor:'pointer',borderRadius:12,fontSize:14,fontWeight:700,fontFamily:'inherit'}}>
          {saving?'Saving...':'💾 Save Page'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{padding:28}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
        <h1 style={{fontSize:22,fontWeight:900,color:'#111827',margin:0}}>Pages ({pgs.length})</h1>
        <button onClick={startNew} style={{background:P,color:'white',border:'none',cursor:'pointer',padding:'10px 20px',borderRadius:20,fontSize:14,fontWeight:700,fontFamily:'inherit',boxShadow:`0 4px 14px ${P}44`}}>+ Add Page</button>
      </div>
      {loadErr&&<div style={{background:'#fef2f2',border:'1.5px solid #fca5a5',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#dc2626',fontWeight:600}}>
        ⚠️ {loadErr}
        <button onClick={load} style={{marginLeft:12,background:'none',border:'none',cursor:'pointer',color:P,fontWeight:700,fontSize:12}}>Retry</button>
      </div>}
      <div style={{...card,overflow:'hidden'}}>
        {!loadErr&&pgs.length===0?(
          <div style={{textAlign:'center' as const,padding:'48px',color:'#9ca3af'}}>
            No pages yet. Click "+ Add Page" to create your first page.<br/>
            <small style={{color:'#d97706'}}>If this keeps appearing, run the SQL in Supabase to create the pages table.</small>
          </div>
        ):(
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr style={{borderBottom:'2px solid #f3f4f6',background:'#fafafa'}}>
              {['Title','Slug','Status','Updated',''].map(h=><th key={h} style={{textAlign:'left' as const,padding:'11px 16px',fontSize:11,color:'#9ca3af',fontWeight:700}}>{h}</th>)}
            </tr></thead>
            <tbody>{pgs.map(p=>(
              <tr key={p.id} style={{borderBottom:'1px solid #f9fafb'}}
                onMouseEnter={e=>e.currentTarget.style.background='#fafafa'}
                onMouseLeave={e=>e.currentTarget.style.background='white'}>
                <td style={{padding:'12px 16px',fontWeight:700,color:'#111827',fontSize:14}}>{p.title}</td>
                <td style={{padding:'12px 16px',fontSize:12,color:'#6b7280',fontFamily:'monospace'}}>/pages/{p.slug}</td>
                <td style={{padding:'12px 16px'}}>
                  <button onClick={()=>toggle(p)} style={{padding:'4px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:11,fontWeight:700,background:p.status==='published'?'#d1fae5':'#f3f4f6',color:p.status==='published'?'#065f46':'#6b7280'}}>
                    {p.status==='published'?'✅ Published':'📝 Draft'}
                  </button>
                </td>
                <td style={{padding:'12px 16px',fontSize:11,color:'#9ca3af'}}>{new Date(p.updated_at||p.created_at).toLocaleDateString('th-TH')}</td>
                <td style={{padding:'12px 16px',display:'flex',gap:6}}>
                  <button onClick={()=>startEdit(p)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600}}>Edit</button>
                  <a href={`/#/pages/${p.slug}`} target="_blank" rel="noreferrer" style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,textDecoration:'none',color:'#374151'}}>👁 View</a>
                  <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin}/#/pages/${p.slug}`);}} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',fontSize:12,fontWeight:600,color:'#374151'}}>📋 Copy URL</button>
                  <button onClick={()=>del(p.id,p.title)} style={{padding:'5px 12px',borderRadius:8,border:'1px solid #fca5a5',background:'#fef2f2',cursor:'pointer',fontSize:12,fontWeight:600,color:'#ef4444'}}>Delete</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FeaturedProductsPicker({ draft, setDraft }: any) {
  const [allProducts, setAllProducts] = useState<any[]>([]);
  useEffect(() => { api.getProducts().then((p:any) => setAllProducts(Array.isArray(p)?p:[])); }, []);
  const ids: string[] = draft.featuredProductIds || [];
  const toggle = (id: string) => {
    setDraft((d: any) => {
      const cur: string[] = d.featuredProductIds || [];
      return { ...d, featuredProductIds: cur.includes(id) ? cur.filter((x:string)=>x!==id) : [...cur, id] };
    });
  };
  return (
    <div style={{marginTop:8,marginBottom:16}}>
      <label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:4}}>Featured Products on Homepage</label>
      <p style={{fontSize:12,color:'#6b7280',marginBottom:10}}>Select products to show in "Featured Collections". If none selected, section is hidden.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:8,maxHeight:280,overflowY:'auto',padding:2}}>
        {allProducts.map((p:any)=>{
          const sel = ids.includes(p.id);
          return (
            <label key={p.id} style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',background:sel?P+'10':'#f9fafb',border:`1.5px solid ${sel?P:'#e5e7eb'}`,borderRadius:10,padding:'8px 10px',transition:'all 0.1s'}}>
              <input type="checkbox" checked={sel} onChange={()=>toggle(p.id)} style={{accentColor:P,flexShrink:0}} />
              <span style={{fontSize:16}}>{p.image}</span>
              <div style={{minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:'#374151',overflow:'hidden',whiteSpace:'nowrap' as const,textOverflow:'ellipsis'}}>{p.title}</div>
                <div style={{fontSize:11,color:'#9ca3af'}}>฿{p.price_thb||'—'}</div>
              </div>
            </label>
          );
        })}
      </div>
      {ids.length > 0 && <div style={{marginTop:6,fontSize:12,color:P,fontWeight:600}}>{ids.length} product{ids.length!==1?'s':''} selected</div>}
    </div>
  );
}

// ── Legal Pages Tab ───────────────────────────────────────────────────────────

function LegalPagesTab() {
  const P = '#f472b6';
  const card = { background:'white', borderRadius:16, boxShadow:'0 2px 10px rgba(0,0,0,0.06)' };
  const [pages, setPages]   = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle]   = useState('');
  const [slug, setSlug]     = useState('');
  const [content, setContent] = useState('');
  const [published, setPublished] = useState(false);
  const [msg, setMsg]       = useState('');
  const [saving, setSaving] = useState(false);

  const tok = () => localStorage.getItem('fluffy_token') || '';

  const load = async () => {
    const r = await fetch('/api/pages?type=legal', { headers: { Authorization: `Bearer ${tok()}` } });
    const d = await r.json();
    if (Array.isArray(d)) setPages(d);
  };
  useEffect(() => { load(); }, []);

  const DEFAULT_PAGES = [
    { slug: 'about-us',          title: 'About Us' },
    { slug: 'privacy-policy',    title: 'Privacy Policy' },
    { slug: 'terms-of-service',  title: 'Terms of Service' },
    { slug: 'artist-guidelines', title: 'Artist Guidelines' },
  ];

  const startEdit = (p: any) => {
    setEditing(p);
    setTitle(p.title || '');
    setSlug(p.slug || '');
    setContent(p.content || '');
    setPublished(p.published || false);
    setMsg('');
  };

  const startNew = () => {
    setEditing({});
    setTitle(''); setSlug(''); setContent(''); setPublished(false); setMsg('');
  };

  const cancel = () => { setEditing(null); setMsg(''); };

  const save = async () => {
    if (!title.trim() || !slug.trim()) { setMsg('⚠️ Title and slug required'); return; }
    setSaving(true); setMsg('');
    const body = { title: title.trim(), slug: slug.trim(), content, published };
    let result: any;
    if (editing?.id) {
      const r = await fetch(`/api/pages?type=legal&id=${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` }, body: JSON.stringify(body) });
      result = await r.json();
    } else {
      const r = await fetch('/api/pages?type=legal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` }, body: JSON.stringify(body) });
      result = await r.json();
    }
    setSaving(false);
    if (result.error) { setMsg('⚠️ ' + result.error); return; }
    setEditing(result);
    setMsg('✓ Saved!');
    load();
  };

  const del = async (id: string, t: string) => {
    if (!confirm(`Delete "${t}"?`)) return;
    await fetch(`/api/pages?type=legal&id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tok()}` } });
    load();
  };

  const togglePublish = async (p: any) => {
    await fetch(`/api/pages?type=legal&id=${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` }, body: JSON.stringify({ published: !p.published }) });
    load();
  };

  const missingDefaults = DEFAULT_PAGES.filter(d => !pages.find(p => p.slug === d.slug));

  const seedMissing = async () => {
    for (const d of missingDefaults) {
      await fetch('/api/pages?type=legal', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok()}` }, body: JSON.stringify({ title: d.title, slug: d.slug, content: '', published: false }) });
    }
    load();
  };

  if (editing !== null) return (
    <div style={{ padding: 28, maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>{editing?.id ? `Edit: ${title}` : 'New Legal Page'}</h1>
        <button onClick={cancel} style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>✕ Cancel</button>
      </div>
      <div style={{ ...card, padding: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Title *</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Privacy Policy"
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
            onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Slug *</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="privacy-policy"
            style={{ width: '100%', padding: '10px 13px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'monospace', boxSizing: 'border-box' as const }}
            onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>URL: /{slug || 'page-slug'}</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Content</label>
          <HtmlEditor value={content} onChange={setContent} />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: published ? P + '10' : '#f9fafb', border: `1.5px solid ${published ? P : '#e5e7eb'}`, borderRadius: 10, padding: '11px 16px', marginBottom: 16, width: 'fit-content' }}>
          <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} style={{ width: 16, height: 16, accentColor: P }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: published ? P : '#374151' }}>{published ? '✅ Published — visible to public' : '📝 Draft — not visible to public'}</span>
        </label>
        {msg && <div style={{ marginBottom: 12, fontSize: 13, fontWeight: 600, color: msg.startsWith('✓') ? '#059669' : '#dc2626' }}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{ padding: '12px 28px', background: saving ? P + '88' : P, color: 'white', border: 'none', cursor: 'pointer', borderRadius: 12, fontSize: 14, fontWeight: 700, fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : '💾 Save Page'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: '0 0 4px' }}>Legal Pages ({pages.length})</h1>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Accessible via footer links only. Never shown in Blog or Pages listing.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {missingDefaults.length > 0 && (
            <button onClick={seedMissing} style={{ background: '#fff7ed', border: '1.5px solid #fb923c', color: '#c2410c', cursor: 'pointer', padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700 }}>
              ＋ Seed {missingDefaults.length} default page{missingDefaults.length > 1 ? 's' : ''}
            </button>
          )}
          <button onClick={startNew} style={{ background: P, color: 'white', border: 'none', cursor: 'pointer', padding: '10px 20px', borderRadius: 20, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', boxShadow: `0 4px 14px ${P}44` }}>+ New Page</button>
        </div>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        {pages.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '48px', color: '#9ca3af' }}>
            No legal pages yet. Run the SQL below or click "Seed default pages".
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #f3f4f6', background: '#fafafa' }}>
              {['Title', 'Slug / URL', 'Status', 'Updated', ''].map(h => (
                <th key={h} style={{ textAlign: 'left' as const, padding: '11px 16px', fontSize: 11, color: '#9ca3af', fontWeight: 700 }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>{pages.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#111827', fontSize: 14 }}>{p.title}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>/{p.slug}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => togglePublish(p)} style={{ padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: p.published ? '#d1fae5' : '#f3f4f6', color: p.published ? '#065f46' : '#6b7280' }}>
                    {p.published ? '✅ Published' : '📝 Draft'}
                  </button>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: '#9ca3af' }}>
                  {p.updated_at ? new Date(p.updated_at).toLocaleDateString('th-TH') : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(p)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Edit</button>
                    <a href={`/#/${p.slug}`} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none', color: '#374151' }}>👁 View</a>
                    <button onClick={() => del(p.id, p.title)} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fef2f2', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

    </div>
  );
}

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

  const SECTIONS=[['brand','🏷️','Brand & Logo'],['colors','🎨','Colors'],['hero','⭐','Hero Section'],['banner','📢','Banner'],['pages','📐','Page Sections'],['background','🖼️','Background'],['footer','🦶','Footer CMS'],['payment','💳','Payment Settings']] as const;
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
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>Font Family</label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[
                {name:'Itim',label:'Itim — น่ารักมาก 🌸',css:"'Itim', sans-serif"},
                {name:'Mitr',label:'Mitr — กลมน่ารัก',css:"'Mitr', sans-serif"},
                {name:'Sriracha',label:'Sriracha — สนุก',css:"'Sriracha', sans-serif"},
                {name:'Kanit',label:'Kanit — ทันสมัย',css:"'Kanit', sans-serif"},
                {name:'Sarabun',label:'Sarabun — อ่านง่าย',css:"'Sarabun', sans-serif"},
                {name:'Prompt',label:'Prompt — เรียบหรู',css:"'Prompt', sans-serif"},
                {name:'Nunito',label:'Nunito — English only',css:"'Nunito', sans-serif"},
                {name:'Quicksand',label:'Quicksand — English only',css:"'Quicksand', sans-serif"},
              ].map(f=>{
                const active = draft.fontFamily?.includes(f.name);
                return (
                  <button key={f.name} onClick={()=>upd('fontFamily',f.css)}
                    style={{padding:'10px 14px',borderRadius:12,border:`2px solid ${active?P:'#e5e7eb'}`,background:active?'#fce7f3':'white',cursor:'pointer',textAlign:'left' as const,fontFamily:f.css,fontSize:14,color:active?P:'#374151',fontWeight:active?700:400}}>
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>Logo Emoji</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap' as const}}>
              {['🐰','🌸','🎨','🦊','🐱','🌈','💕','🍓','🦄','🌺','✨','🎀'].map(e=>(
                <button key={e} onClick={()=>upd('logoEmoji',e)} style={{width:44,height:44,borderRadius:12,border:`2px solid ${draft.logoEmoji===e?P:'#e5e7eb'}`,background:draft.logoEmoji===e?'#fce7f3':'white',cursor:'pointer',fontSize:22}}>{e}</button>
              ))}
            </div>
          </div>
          <ImageCropEditor title="Logo Image (optional)" hint="Upload a logo image. If set, replaces the emoji across the site." value={draft.logoImageCrop} aspectRatio={1} onChange={v=>upd('logoImageCrop',v)} />
          <TF label="Logo URL for Emails (optional)" val={draft.logoUrl||''} set={v=>upd('logoUrl',v)} ph="https://fluffypub.com/logo.png — paste a public image URL to show in emails" />
          <div style={{padding:20,borderRadius:14,background:'#fdf2f8',border:`2px dashed ${P}40`,textAlign:'center' as const,marginTop:16}}>
            {draft.logoImageCrop?.croppedDataUrl
              ? <img src={draft.logoImageCrop.croppedDataUrl} style={{width:48,height:48,borderRadius:'50%',objectFit:'cover',marginBottom:6}} alt="logo" />
              : <div style={{fontSize:32,marginBottom:6}}>{draft.logoEmoji}</div>}
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
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <TF label="Headline (EN)" val={draft.heroTitle} set={v=>upd('heroTitle',v)} />
            <TF label="Headline (TH)" val={draft.heroTitle_th||''} set={v=>upd('heroTitle_th',v)} ph="ภาษาไทย (ไม่บังคับ)" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <TF label="Subtitle (EN)" val={draft.heroSubtitle} set={v=>upd('heroSubtitle',v)} />
            <TF label="Subtitle (TH)" val={draft.heroSubtitle_th||''} set={v=>upd('heroSubtitle_th',v)} ph="ภาษาไทย (ไม่บังคับ)" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <TF label="Hero Badge (EN)" val={draft.heroBadge||''} set={v=>upd('heroBadge',v)} ph="e.g. 🌸 Digital Coloring Books — Download Instantly" />
            <TF label="Hero Badge (TH)" val={draft.heroBadge_th||''} set={v=>upd('heroBadge_th',v)} ph="ภาษาไทย (ไม่บังคับ)" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <TF label="Shop Button (EN)" val={draft.heroShopBtn||''} set={v=>upd('heroShopBtn',v)} ph="Shop Now 🛍️" />
            <TF label="Shop Button (TH)" val={draft.heroShopBtn_th||''} set={v=>upd('heroShopBtn_th',v)} ph="ช้อปเลย 🛍️" />
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <TF label="Artists Button (EN)" val={draft.heroArtistsBtn||''} set={v=>upd('heroArtistsBtn',v)} ph="Meet Artists 🎨" />
            <TF label="Artists Button (TH)" val={draft.heroArtistsBtn_th||''} set={v=>upd('heroArtistsBtn_th',v)} ph="พบศิลปิน 🎨" />
          </div>
          <div style={{marginBottom:6,fontSize:13,fontWeight:700,color:'#374151'}}>Stats (leave empty to hide)</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {([['statBooks','Books Count','500+'],['statColorists','Happy Colorists Count','12K+'],['statArtists','Artists Count','50+'],['statRating','Rating','4.9 ⭐']] as [keyof typeof draft, string, string][]).map(([k,lbl,ph])=>(
              <div key={k} style={{marginBottom:14}}>
                <label style={{display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:6}}>{lbl}</label>
                <input value={(draft as any)[k]||''} placeholder={ph} onChange={e=>upd(k,e.target.value)} style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box'}} onFocus={e=>e.target.style.borderColor='#f472b6'} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
              </div>
            ))}
          </div>
          <TF label="Background Gradient (CSS)" val={draft.heroBgColor} set={v=>upd('heroBgColor',v)} />
          <ImageCropEditor title="Hero Image (Desktop)" hint="Wide image 1600×600px." value={draft.heroCrop} aspectRatio={16/6} onChange={v=>upd('heroCrop',v)} />
          <div style={{marginTop:16}}><ImageCropEditor title="Hero Image (Mobile)" hint="Portrait 4:3 crop." value={draft.mobileHeroCrop} aspectRatio={4/3} onChange={v=>upd('mobileHeroCrop',v)} /></div>
        </>)}
        {section==='banner'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:20}}>Banner</h2>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:0}}>
            <TF label="Banner Text (EN)" val={draft.bannerText} set={v=>upd('bannerText',v)} />
            <TF label="Banner Text (TH)" val={draft.bannerText_th||''} set={v=>upd('bannerText_th',v)} ph="ข้อความแบนเนอร์ภาษาไทย (ไม่บังคับ)" />
          </div>
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

          {/* ── Card: Maintenance Mode ────────────────────────── */}
          <div style={{background:draft.maintenance_mode?'#fef2f2':'white',border:`1.5px solid ${draft.maintenance_mode?'#fca5a5':'#f3f4f6'}`,borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>🔧</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Maintenance Mode</span>
              {draft.maintenance_mode&&<span style={{fontSize:11,fontWeight:800,background:'#dc2626',color:'white',borderRadius:6,padding:'2px 8px',letterSpacing:0.5}}>ON</span>}
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>When ON, public pages show a maintenance screen. Admin users bypass it automatically.</p>
            <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',background:draft.maintenance_mode?'#fee2e2':'#f9fafb',border:`1.5px solid ${draft.maintenance_mode?'#f87171':'#e5e7eb'}`,borderRadius:10,padding:'12px 16px',width:'fit-content'}}>
              <input type="checkbox" checked={!!draft.maintenance_mode} onChange={e=>setDraft((d:any)=>({...d,maintenance_mode:e.target.checked}))} style={{width:18,height:18,accentColor:'#dc2626'}} />
              <span style={{fontSize:14,fontWeight:800,color:draft.maintenance_mode?'#dc2626':'#374151'}}>
                {draft.maintenance_mode?'🔴 Maintenance Mode ON — site is hidden from public':'⚪ Maintenance Mode OFF — site is live'}
              </span>
            </label>
          </div>

          {/* ── Card: Header Navigation ───────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>🔗</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Header Navigation Labels</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Text shown in the top navigation bar. Leave empty to use defaults.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([
                ['nav_shop','nav_shop_th','Shop','ร้านค้า'],
                ['nav_artists','nav_artists_th','Artists','ศิลปิน'],
                ['nav_blog','nav_blog_th','Blog','บทความ'],
              ] as [string,string,string,string][]).map(([key,keyTh,label,phTh])=>(
                <React.Fragment key={key}>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (EN)</label>
                    <input value={(draft.labels||{})[key]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [key]:e.target.value}}))} placeholder={label}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (TH)</label>
                    <input value={(draft.labels||{})[keyTh]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [keyTh]:e.target.value}}))} placeholder={phTh}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Card: Browse by Category ─────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>📂</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Browse by Category Section</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Displayed on the homepage when categories with products exist.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([
                ['categories_title','categories_title_th','Section title','Browse by Category 🎨','เลือกดูตามหมวดหมู่ 🎨'],
                ['categories_subtitle','categories_subtitle_th','Subtitle','Find your perfect coloring style','ค้นหาสไตล์ที่ใช่สำหรับคุณ'],
              ] as [string,string,string,string,string][]).map(([key,keyTh,label,ph,phTh])=>(
                <React.Fragment key={key}>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (EN)</label>
                    <input value={(draft.labels||{})[key]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [key]:e.target.value}}))} placeholder={ph}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (TH)</label>
                    <input value={(draft.labels||{})[keyTh]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [keyTh]:e.target.value}}))} placeholder={phTh}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Card: Meet Our Artists ────────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>🎨</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Meet Our Artists Section</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Shown on the homepage when active artists exist.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([
                ['artists_title','artists_title_th','Section title','Meet Our Artists 🌟','พบกับศิลปินของเรา 🌟'],
                ['artists_subtitle','artists_subtitle_th','Subtitle','Talented creators bringing joy through coloring','ศิลปินผู้สร้างสรรค์ความสุขผ่านการระบายสี'],
              ] as [string,string,string,string,string][]).map(([key,keyTh,label,ph,phTh])=>(
                <React.Fragment key={key}>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (EN)</label>
                    <input value={(draft.labels||{})[key]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [key]:e.target.value}}))} placeholder={ph}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (TH)</label>
                    <input value={(draft.labels||{})[keyTh]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [keyTh]:e.target.value}}))} placeholder={phTh}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Card: Featured Products ───────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>⭐</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Featured Products Section</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Shown on the homepage. Select which products to highlight and customize the section text.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {([
                ['featured_eyebrow','featured_eyebrow_th','Eyebrow text','✨ Handpicked for You'],
                ['featured_title','featured_title_th','Section title','Featured Collections'],
                ['featured_btn','featured_btn_th','Button text','View All Books →'],
              ] as [string,string,string,string][]).map(([key,keyTh,label,ph])=>(
                <React.Fragment key={key}>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (EN)</label>
                    <input value={(draft.labels||{})[key]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [key]:e.target.value}}))} placeholder={ph}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (TH)</label>
                    <input value={(draft.labels||{})[keyTh]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [keyTh]:e.target.value}}))} placeholder="ภาษาไทย (ไม่บังคับ)"
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                </React.Fragment>
              ))}
            </div>
            <div style={{borderTop:'1px solid #f3f4f6',paddingTop:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:6}}>FEATURED PRODUCTS <span style={{fontWeight:400}}>(select which products appear)</span></label>
              <FeaturedProductsPicker draft={draft} setDraft={setDraft} />
            </div>
          </div>

          {/* ── Card: Blog / Pages ────────────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>📄</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Blog / Featured Pages Section</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Shows pages marked "Show on Homepage" in Pages CMS. Hidden automatically when no pages are selected.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([
                ['blog_eyebrow','blog_eyebrow_th','Eyebrow text','📄 From the Blog'],
                ['blog_title','blog_title_th','Section title','Latest Updates'],
                ['blog_btn','blog_btn_th','Button text','View All Posts →'],
              ] as [string,string,string,string][]).map(([key,keyTh,label,ph])=>(
                <React.Fragment key={key}>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (EN)</label>
                    <input value={(draft.labels||{})[key]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [key]:e.target.value}}))} placeholder={ph}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (TH)</label>
                    <input value={(draft.labels||{})[keyTh]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [keyTh]:e.target.value}}))} placeholder="ภาษาไทย (ไม่บังคับ)"
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Card: Newsletter ─────────────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>💌</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Newsletter Section</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Email signup section at the bottom of the homepage.</p>
            <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',background:draft.showNewsletter?P+'10':'#f9fafb',border:`1.5px solid ${draft.showNewsletter?P:'#e5e7eb'}`,borderRadius:10,padding:'11px 16px',marginBottom:14,width:'fit-content'}}>
              <input type="checkbox" checked={draft.showNewsletter||false} onChange={e=>setDraft((d:any)=>({...d,showNewsletter:e.target.checked}))} style={{width:16,height:16,accentColor:P}} />
              <span style={{fontSize:13,fontWeight:700,color:draft.showNewsletter?P:'#374151'}}>{draft.showNewsletter?'✅ Newsletter visible on homepage':'⬜ Newsletter hidden'}</span>
            </label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {([
                ['newsletter_title','newsletter_title_th','Title','Join the Fluffy Family!','เข้าร่วมครอบครัว Fluffy!'],
                ['newsletter_body','newsletter_body_th','Body text','Get new releases, exclusive discounts, and coloring tips delivered to your inbox 🌸','รับข่าวสาร ส่วนลดพิเศษ และเคล็ดลับการระบายสีส่งตรงถึงอีเมลคุณ 🌸'],
                ['newsletter_btn','newsletter_btn_th','Button text','Subscribe 🌸','สมัครรับข่าวสาร 🌸'],
                ['newsletter_success','newsletter_success_th','Success message','🎉 You\'re in! Welcome to the family!','🎉 ยินดีต้อนรับเข้าสู่ครอบครัว!'],
              ] as [string,string,string,string,string][]).map(([key,keyTh,label,ph,phTh])=>(
                <React.Fragment key={key}>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (EN)</label>
                    <input value={(draft.labels||{})[key]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [key]:e.target.value}}))} placeholder={ph}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:11,fontWeight:700,color:'#6b7280',marginBottom:4}}>{label} (TH)</label>
                    <input value={(draft.labels||{})[keyTh]||''} onChange={e=>setDraft((d:any)=>({...d,labels:{...(d.labels||{}), [keyTh]:e.target.value}}))} placeholder={phTh}
                      style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',fontFamily:'inherit',boxSizing:'border-box' as const}}
                      onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ── Card: Section Order ───────────────────────────── */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontSize:18}}>↕️</span>
              <span style={{fontSize:14,fontWeight:800,color:'#111827'}}>Homepage Section Order</span>
            </div>
            <p style={{fontSize:12,color:'#9ca3af',margin:'0 0 14px'}}>Drag or click ↑↓ to reorder sections on the homepage.</p>
            {draft.sections?.map((s:string,i:number)=>{
              const sLabels:any={hero:'🌟 Hero Banner',featured:'⭐ Featured Products',categories:'📂 Browse by Category',artists:'🎨 Meet Our Artists',newsletter:'💌 Newsletter',blog:'📄 Blog / Pages'};
              return (
                <div key={s} style={{display:'flex',alignItems:'center',gap:10,background:'#fafafa',borderRadius:10,padding:'11px 14px',marginBottom:6,border:'1px solid #f3f4f6'}}>
                  <span style={{color:'#d1d5db',fontSize:16,userSelect:'none' as const}}>⠿</span>
                  <span style={{flex:1,fontWeight:600,fontSize:14,color:'#374151'}}>{sLabels[s]||s}</span>
                  <button onClick={()=>{const a=[...draft.sections];if(i>0){[a[i],a[i-1]]=[a[i-1],a[i]];upd('sections',a);}}} disabled={i===0}
                    style={{padding:'5px 11px',borderRadius:7,border:'1px solid #e5e7eb',background:'white',cursor:i===0?'not-allowed':'pointer',opacity:i===0?0.4:1,fontSize:13,fontWeight:700}}>↑</button>
                  <button onClick={()=>{const a=[...draft.sections];if(i<a.length-1){[a[i],a[i+1]]=[a[i+1],a[i]];upd('sections',a);}}} disabled={i===draft.sections.length-1}
                    style={{padding:'5px 11px',borderRadius:7,border:'1px solid #e5e7eb',background:'white',cursor:i===draft.sections.length-1?'not-allowed':'pointer',opacity:i===draft.sections.length-1?0.4:1,fontSize:13,fontWeight:700}}>↓</button>
                </div>
              );
            })}
          </div>

        </>)}
        {section==='background'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:8}}>Background</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>Upload a site-wide background image</p>
          <ImageCropEditor title="Background Image" hint="Large image. Set focal point for responsive display." value={draft.bgImageCrop} aspectRatio={16/9} onChange={v=>upd('bgImageCrop',v)} />
        </>)}
        {section==='footer'&&<FooterCMSEditor footer={draft.footer} onFooterChange={upd} />}
        {section==='payment'&&(<>
          <h2 style={{fontSize:20,fontWeight:900,color:'#111827',marginBottom:4}}>Payment Settings</h2>
          <p style={{fontSize:13,color:'#6b7280',marginBottom:20}}>
            🇹🇭 Thai site uses <strong>PromptPay</strong> · 🌍 English site uses <strong>PayPal</strong> (payment link)
          </p>

          {/* PayPal toggle */}
          <div style={{background:draft.paypal?.enabled?'#f0fdf4':'white',border:`1.5px solid ${draft.paypal?.enabled?'#86efac':'#f3f4f6'}`,borderRadius:14,padding:'18px 20px',marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <span style={{fontSize:18}}>🅿️</span>
              <span style={{fontSize:15,fontWeight:800,color:'#111827'}}>PayPal Payment Link</span>
              {draft.paypal?.enabled&&<span style={{fontSize:11,fontWeight:800,background:'#16a34a',color:'white',borderRadius:6,padding:'2px 8px',letterSpacing:0.5}}>ON</span>}
            </div>
            <p style={{fontSize:12,color:'#6b7280',margin:'0 0 12px'}}>When enabled, English-site customers see a "Pay with PayPal" button instead of PromptPay. Opens PayPal in a new tab with the order amount pre-filled.</p>
            <label style={{display:'flex',alignItems:'center',gap:12,cursor:'pointer',background:draft.paypal?.enabled?'#dcfce7':'#f9fafb',border:`1.5px solid ${draft.paypal?.enabled?'#86efac':'#e5e7eb'}`,borderRadius:10,padding:'12px 16px',width:'fit-content'}}>
              <input type="checkbox" checked={!!draft.paypal?.enabled} onChange={e=>setDraft((d:any)=>({...d,paypal:{...d.paypal,enabled:e.target.checked}}))} style={{width:18,height:18,accentColor:'#16a34a'}} />
              <span style={{fontSize:14,fontWeight:800,color:draft.paypal?.enabled?'#16a34a':'#374151'}}>
                {draft.paypal?.enabled?'✅ PayPal Enabled for English site':'⚪ PayPal Disabled'}
              </span>
            </label>
          </div>

          {/* PayPal.me username */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#374151',marginBottom:14}}>🔗 PayPal.me Username</div>
            <TF label="PayPal.me Username" val={draft.paypal?.username||''} set={v=>setDraft((d:any)=>({...d,paypal:{...d.paypal,username:v.replace(/^@/,'')}}))} ph="yourpaypalname" />
            {draft.paypal?.username&&(
              <div style={{marginTop:8,background:'#f0fdf4',borderRadius:8,padding:'8px 12px',fontSize:12,color:'#166534'}}>
                🔗 Payment link preview: <strong>paypal.me/{draft.paypal.username}/[amount]USD</strong>
              </div>
            )}
            <p style={{fontSize:11,color:'#9ca3af',marginTop:8}}>Your PayPal.me username (without @). Customers are sent to this link to complete payment.</p>
          </div>

          {/* Exchange rate */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#374151',marginBottom:14}}>💱 THB → USD Exchange Rate</div>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
              <span style={{fontSize:13,color:'#374151',fontWeight:600}}>1 USD =</span>
              <input type="number" value={draft.paypal?.usd_rate||35} min={1} step={0.5}
                onChange={e=>setDraft((d:any)=>({...d,paypal:{...d.paypal,usd_rate:parseFloat(e.target.value)||35}}))}
                style={{width:90,padding:'8px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:14,fontWeight:700,fontFamily:'inherit'}} />
              <span style={{fontSize:13,color:'#374151',fontWeight:600}}>THB</span>
            </div>
            <p style={{fontSize:11,color:'#9ca3af'}}>Used to convert the order total to USD for the PayPal link. Update when the exchange rate changes.</p>
          </div>

          {/* PayPal email */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#374151',marginBottom:14}}>📧 PayPal Email (for reference)</div>
            <TF label="PayPal Email" val={draft.paypal?.email||''} set={v=>setDraft((d:any)=>({...d,paypal:{...d.paypal,email:v}}))} ph="your@paypal.com" />
            <p style={{fontSize:11,color:'#9ca3af',marginTop:4}}>Shown in confirmation email so customers know who they paid.</p>
          </div>

          {/* Custom instructions */}
          <div style={{background:'white',border:'1.5px solid #f3f4f6',borderRadius:14,padding:'18px 20px',boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:14,fontWeight:800,color:'#374151',marginBottom:14}}>📝 Extra Instructions (optional)</div>
            <textarea value={draft.paypal?.instructions||''} onChange={e=>setDraft((d:any)=>({...d,paypal:{...d.paypal,instructions:e.target.value}}))}
              rows={3} placeholder="e.g. Please include your order number in the PayPal note."
              style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1.5px solid #e5e7eb',fontSize:13,fontFamily:'inherit',resize:'vertical' as const,boxSizing:'border-box' as const}} />
            <p style={{fontSize:11,color:'#9ca3af',marginTop:6}}>Shown below the PayPal button and included in the confirmation email.</p>
          </div>
        </>)}
      </div>
    </div>
  );
}

// ── Custom Email Box ─────────────────────────────────────────────────────────
function CustomEmailBox({ orderId, customerEmail, onSent }: { orderId: string; customerEmail: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState('');

  const send = async () => {
    if (!subject.trim() || !message.trim()) { setResult('⚠️ Subject and message are required.'); return; }
    if (!confirm(`Send email to ${customerEmail}?\n\nSubject: ${subject}`)) return;
    setSending(true); setResult('');
    try {
      const token = localStorage.getItem('fluffy_token');
      const res = await fetch(`/api/orders?action=custom-email&id=${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ subject, message }),
      });
      // Safe parse — Vercel may return non-JSON on timeout even if the email sent
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (data?.error) { setResult(`⚠️ ${data.error}`); }
      else { setResult('✓ Email sent!'); setSubject(''); setMessage(''); onSent(); }
    } catch { setResult('⚠️ Network error.'); }
    setSending(false);
  };

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
      <button onClick={() => { setOpen(v => !v); setResult(''); }}
        style={{ width: '100%', textAlign: 'left' as const, background: open ? '#fdf2f8' : '#f9fafb', border: `1.5px solid ${open ? '#f9a8d4' : '#e5e7eb'}`, borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: open ? '#be185d' : '#374151', fontFamily: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>✉️ Send Message to Customer</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>To: {customerEmail}</div>
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Message body..."
            rows={5} style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 12, outline: 'none', fontFamily: 'inherit', resize: 'vertical' as const, boxSizing: 'border-box' as const }} />
          {result && <div style={{ fontSize: 12, fontWeight: 600, color: result.startsWith('✓') ? '#059669' : '#dc2626' }}>{result}</div>}
          <button onClick={send} disabled={sending}
            style={{ padding: '9px', background: sending ? '#f9a8d4' : '#f472b6', color: 'white', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', borderRadius: 10, fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
            {sending ? 'Sending...' : '📤 Send Email'}
          </button>
        </div>
      )}
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
  const [descriptionTh, setDescriptionTh] = useState(footer.description_th || '');
  const [copyright, setCopyright]     = useState(footer.copyright || '');
  const [copyrightTh, setCopyrightTh] = useState(footer.copyright_th || '');
  const [trustBadges, setTrustBadges] = useState(footer.trustBadges || '');
  const [trustBadgesTh, setTrustBadgesTh] = useState(footer.trustBadges_th || '');
  const [cmsPages, setCmsPages] = useState<any[]>([]);
  useEffect(() => {
    api.getPages().then((d:any) => setCmsPages(Array.isArray(d) ? d.filter((p:any) => p.status==='published') : []));
  }, []);

  const [editingCol, setEditingCol]   = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<{ colId: string; linkId: string } | null>(null);

  // Flush local text to parent (only on blur)
  const flushText = useCallback(() => {
    onFooterChange('footer', { ...footer, description, description_th: descriptionTh||undefined, copyright, copyright_th: copyrightTh||undefined, trustBadges, trustBadges_th: trustBadgesTh||undefined });
  }, [footer, description, descriptionTh, copyright, copyrightTh, trustBadges, trustBadgesTh, onFooterChange]);

  // Column/link operations (non-text, no focus issue)
  const updCol = useCallback((updates: Partial<FooterConfig>) => {
    onFooterChange('footer', { ...footer, description, description_th: descriptionTh||undefined, copyright, copyright_th: copyrightTh||undefined, trustBadges, trustBadges_th: trustBadgesTh||undefined, ...updates });
  }, [footer, description, descriptionTh, copyright, copyrightTh, trustBadges, trustBadgesTh, onFooterChange]);

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FooterTextField label="Description (EN)" value={description} onChange={setDescription} onBlur={flushText} placeholder="Store description..." />
          <FooterTextField label="Description (TH)" value={descriptionTh} onChange={setDescriptionTh} onBlur={flushText} placeholder="คำอธิบายร้านค้า (ไม่บังคับ)" />
          <FooterTextField label="Copyright Text (EN)" value={copyright} onChange={setCopyright} onBlur={flushText} placeholder="© 2026 Fluffy Pub. Made with 💕" />
          <FooterTextField label="Copyright Text (TH)" value={copyrightTh} onChange={setCopyrightTh} onBlur={flushText} placeholder="ภาษาไทย (ไม่บังคับ)" />
          <FooterTextField label="Trust Badges (EN)" value={trustBadges} onChange={setTrustBadges} onBlur={flushText} placeholder="🔒 Secure · ⚡ Downloads · 💯 Guaranteed" />
          <FooterTextField label="Trust Badges (TH)" value={trustBadgesTh} onChange={setTrustBadgesTh} onBlur={flushText} placeholder="ภาษาไทย (ไม่บังคับ)" />
        </div>
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
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input value={col.title} onChange={e => updateColumn(col.id, { title: e.target.value })}
                    style={{ padding: '6px 10px', borderRadius: 8, border: `1.5px solid ${P}`, fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit', width: 120 }}
                    onBlur={() => setEditingCol(null)}
                    autoFocus
                    placeholder="EN"
                  />
                  <input value={col.title_th||''} onChange={e => updateColumn(col.id, { title_th: e.target.value||undefined })}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', fontFamily: 'inherit', width: 120 }}
                    onBlur={() => setEditingCol(null)}
                    placeholder="TH (ไม่บังคับ)"
                  />
                </div>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{col.title}{col.title_th ? ` / ${col.title_th}` : ''}</span>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Label (EN)</label>
                        <input value={link.label} onChange={e => updateLink(col.id, link.id, { label: e.target.value })}
                          style={{ width: '100%', padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 3 }}>Label (TH)</label>
                        <input value={link.label_th||''} onChange={e => updateLink(col.id, link.id, { label_th: e.target.value||undefined })}
                          placeholder="ภาษาไทย (ไม่บังคับ)"
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

  const add = () => onChange([...variants, { id: vuid(), name: '', price_thb: '', price_usd: '', enabled: true, stock: '', stock_quantity: '' }]);
  const update = (id: string, key: string, val: any) => onChange(variants.map(v => v.id === id ? { ...v, [key]: val } : v));
  const del = (id: string) => onChange(variants.filter(v => v.id !== id));
  const move = (i: number, dir: number) => {
    const a = [...variants]; const j = i + dir;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]]; onChange(a);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
          Product Variants <span style={{ color: '#9ca3af', fontWeight: 400 }}>(each variant has its own price and stock)</span>
        </label>
        <button onClick={add} style={{ padding: '4px 12px', borderRadius: 8, border: `1.5px solid ${P}`, background: '#fdf2f8', color: P, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>+ Add Variant</button>
      </div>
      {variants.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 64px 44px auto auto auto', gap: 6, padding: '0 0 4px', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, paddingLeft: 10 }}>VARIANT NAME</span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, paddingLeft: 18 }}>PRICE ฿</span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, paddingLeft: 18 }}>PRICE $</span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, textAlign: 'center' as const }}>STOCK</span>
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700 }}>ON</span>
        </div>
      )}

      {variants.length === 0 && (
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 10, fontSize: 13, color: '#9ca3af', textAlign: 'center' as const }}>
          No variants. Add variants like "สันห่วงปกติ", "สันห่วงเปิดบน", "Digital file" etc.
        </div>
      )}

      {variants.map((v, i) => (
        <div key={v.id} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px 64px 44px auto auto auto', gap: 6, alignItems: 'center' }}>
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
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 12 }}>$</span>
              <input type="number" value={v.price_usd||''} onChange={e => update(v.id, 'price_usd', e.target.value)} placeholder="USD"
                style={{ padding: '7px 6px 7px 18px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 12, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const }}
                onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
            </div>

            {/* Stock per variant */}
            <div style={{ position: 'relative' }}>
              <input type="number" min="0"
                value={v.stock_quantity !== undefined && v.stock_quantity !== '' ? v.stock_quantity : (v.stock !== undefined && v.stock !== '' ? v.stock : '')}
                onChange={e => { const val = e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value)||0); onChange(variants.map(v2 => v2.id === v.id ? { ...v2, stock_quantity: val, stock: val } : v2)); }}
                placeholder="∞"
                style={{ padding: '7px 6px', borderRadius: 8, border: `1.5px solid ${(v.stock_quantity===0||v.stock===0)?'#fca5a5':'#e5e7eb'}`, fontSize: 12, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const, background: (v.stock_quantity===0||v.stock===0)?'#fef2f2':'white' }}
                onFocus={e => e.target.style.borderColor = P}
                onBlur={e => e.target.style.borderColor = (v.stock_quantity===0||v.stock===0)?'#fca5a5':'#e5e7eb'}
                title="Stock quantity for this variant. Leave empty = unlimited. 0 = out of stock." />
              {(v.stock_quantity===0||v.stock===0) && <div style={{fontSize:8,color:'#ef4444',fontWeight:700,textAlign:'center' as const,marginTop:1}}>OUT</div>}
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

// ── Free Downloads Tab ─────────────────────────────────────────────────────────

function FreeDownloadsTab() {
  const [items, setItems]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<any>(null);   // null = list, {} = new, item = edit
  const [saving, setSaving]       = useState(false);
  const [r2Uploading, setR2Uploading] = useState(false);
  const [msg, setMsg]             = useState('');

  // Form state
  const [titleEn, setTitleEn]         = useState('');
  const [titleTh, setTitleTh]         = useState('');
  const [slug, setSlug]               = useState('');
  const [coverUrl, setCoverUrl]       = useState('');
  const [descEn, setDescEn]           = useState('');
  const [descTh, setDescTh]           = useState('');
  const [highlight, setHighlight]     = useState('');
  const [category, setCategory]       = useState('');
  const [keywords, setKeywords]       = useState('');
  const [sortOrder, setSortOrder]     = useState(0);
  const [fileType, setFileType]       = useState('');
  const [r2Key, setR2Key]             = useState('');
  const [r2FileName, setR2FileName]   = useState('');
  const [fileSize, setFileSize]       = useState(0);
  const [status, setStatus]           = useState<'draft'|'published'>('draft');
  const [artistId, setArtistId]       = useState('');
  const [artists, setArtists]         = useState<any[]>([]);

  const load = () => api.getFreeDownloads().then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); });
  useEffect(() => {
    load();
    api.getArtists().then((d: any) => { if (Array.isArray(d)) setArtists(d); });
  }, []);

  const resetForm = (item?: any) => {
    setTitleEn(item?.title_en || '');
    setTitleTh(item?.title_th || '');
    setSlug(item?.slug || '');
    setCoverUrl(item?.cover_image_url || '');
    setDescEn(item?.description_en || '');
    setDescTh(item?.description_th || '');
    setHighlight(item?.highlight || '');
    setCategory(item?.category || '');
    setKeywords((item?.keywords || []).join(', '));
    setSortOrder(item?.sort_order || 0);
    setFileType(item?.file_type || '');
    setR2Key(item?.r2_key || '');
    setR2FileName(item?.r2_file_name || '');
    setFileSize(item?.file_size || 0);
    setStatus(item?.status || 'draft');
    setArtistId(item?.artist_id || '');
  };

  const startNew  = () => { resetForm(); setEditing({}); setMsg(''); };
  const startEdit = (item: any) => { resetForm(item); setEditing(item); setMsg(''); };
  const cancel    = () => { setEditing(null); setMsg(''); };

  const uploadR2File = async (file: File) => {
    setR2Uploading(true);
    setMsg('');
    try {
      const token = localStorage.getItem('fluffy_token') || '';
      const presignRes = await fetch('/api/upload?action=r2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, fileSize: file.size }),
      });
      const presign = await presignRes.json();
      if (presign.error) { setMsg('⚠️ ' + presign.error); setR2Uploading(false); return; }
      const putRes = await fetch(presign.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      if (!putRes.ok) { setMsg('⚠️ Upload failed: ' + putRes.status); setR2Uploading(false); return; }
      setR2Key(presign.r2Key);
      setR2FileName(file.name);
      setFileSize(file.size);
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      setFileType(ext === 'pdf' ? 'pdf' : ext === 'zip' ? 'zip' : ext);
      setMsg('✓ File uploaded: ' + file.name);
    } catch (e: any) {
      setMsg('⚠️ ' + e.message);
    }
    setR2Uploading(false);
  };

  const save = async () => {
    if (!titleEn.trim()) { setMsg('⚠️ Title (EN) is required'); return; }
    setSaving(true); setMsg('');
    const payload = {
      title_en: titleEn.trim(), title_th: titleTh.trim() || null,
      slug: slug.trim() || undefined,
      cover_image_url: coverUrl.trim() || null,
      description_en: descEn.trim() || null, description_th: descTh.trim() || null,
      highlight: highlight.trim() || null, category: category.trim() || null,
      keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
      sort_order: sortOrder,
      file_type: fileType || null, r2_key: r2Key || null,
      r2_file_name: r2FileName || null, file_size: fileSize || null,
      status, artist_id: artistId || null,
    };
    const res = editing?.id
      ? await api.updateFreeDownload(editing.id, payload)
      : await api.createFreeDownload(payload);
    if (res.error) { setMsg('⚠️ ' + res.error); setSaving(false); return; }
    await load();
    setEditing(null);
    setMsg('');
    setSaving(false);
  };

  const del = async (id: string, titleEn: string) => {
    if (!confirm(`Delete "${titleEn}"? This cannot be undone.`)) return;
    const res = await api.deleteFreeDownload(id);
    if (res.error) { setMsg('⚠️ ' + res.error); return; }
    await load();
  };

  const toggleStatus = async (item: any) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateFreeDownload(item.id, { status: newStatus });
    await load();
  };

  const inp = (label: string, val: string, set: (v: string) => void, placeholder = '') => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{label}</label>
      <input value={val} onChange={e => set(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }}
        onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
    </div>
  );

  const txta = (label: string, val: string, set: (v: string) => void, rows = 3) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>{label}</label>
      <textarea value={val} onChange={e => set(e.target.value)} rows={rows}
        style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const, resize: 'vertical' as const }}
        onFocus={e => e.target.style.borderColor = P} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
    </div>
  );

  // ── Form ──
  if (editing !== null) return (
    <div style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>
          {editing?.id ? 'Edit Free Download' : 'New Free Download'}
        </h2>
        <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20 }}>✕</button>
      </div>

      {/* Basic info */}
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 12 }}>BASIC INFORMATION</div>
        {inp('Title EN *', titleEn, setTitleEn, 'English title')}
        {inp('Title TH', titleTh, setTitleTh, 'ชื่อภาษาไทย')}
        {inp('Slug', slug, setSlug, 'auto-generated if empty')}
        <div style={{ marginBottom: 12 }}>
          <ImageUpload label="Cover Image" value={coverUrl} onChange={setCoverUrl} folder="uploads" hint="Recommended: 800×600px" />
        </div>
        {txta('Highlight / Summary', highlight, setHighlight, 2)}
        {txta('Description EN', descEn, setDescEn, 4)}
        {txta('Description TH', descTh, setDescTh, 4)}
        {inp('Category', category, setCategory, 'e.g. Illustration, Fonts')}
        {inp('Keywords (comma-separated)', keywords, setKeywords, 'procreate, brush, free')}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Sort Order</label>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
            style={{ width: 100, padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 4 }}>Artist</label>
          <select value={artistId} onChange={e => setArtistId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: 'white' }}>
            <option value="">— No artist —</option>
            {artists.map((a: any) => (
              <option key={a.id} value={a.id}>{a.display_name || a.name || a.slug}</option>
            ))}
          </select>
        </div>
      </div>

      {/* File upload */}
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 12 }}>FILE (PDF / ZIP)</div>
        {r2Key ? (
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{fileType === 'pdf' ? '📄' : fileType === 'png' ? '🖼️' : '🗜️'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r2FileName}</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>{fileType?.toUpperCase()} · {fileSize ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : ''}</div>
            </div>
            <label style={{ cursor: r2Uploading ? 'not-allowed' : 'pointer' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: P, cursor: 'pointer' }}>Replace</span>
              <input type="file" accept=".pdf,.zip,.png" style={{ display: 'none' }} disabled={r2Uploading}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadR2File(f); e.target.value = ''; }} />
            </label>
          </div>
        ) : (
          <label style={{ cursor: r2Uploading ? 'not-allowed' : 'pointer', display: 'block' }}>
            <div style={{ background: r2Uploading ? '#f3f4f6' : 'white', border: `2px dashed ${r2Uploading ? '#d1d5db' : '#93c5fd'}`, borderRadius: 10, padding: '16px', textAlign: 'center' as const, fontSize: 13, color: r2Uploading ? '#9ca3af' : '#2563eb', fontWeight: 700 }}>
              {r2Uploading ? '⏳ Uploading...' : '📤 Upload PDF, ZIP or PNG'}
            </div>
            <input type="file" accept=".pdf,.zip,.png" style={{ display: 'none' }} disabled={r2Uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadR2File(f); e.target.value = ''; }} />
          </label>
        )}
      </div>

      {/* Status */}
      <div style={{ ...card, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 12 }}>STATUS</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['draft', 'published'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ padding: '8px 20px', borderRadius: 10, border: `2px solid ${status === s ? P : '#e5e7eb'}`, background: status === s ? P + '10' : 'white', color: status === s ? P : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {s === 'published' ? '✅ Published' : '📝 Draft'}
            </button>
          ))}
        </div>
      </div>

      {msg && <div style={{ borderRadius: 10, padding: '9px 13px', marginBottom: 12, fontSize: 13, fontWeight: 600, background: msg.startsWith('✓') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✓') ? '#065f46' : '#dc2626' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: '11px', background: saving ? P + '88' : P, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Create'}
        </button>
        <button onClick={cancel}
          style={{ padding: '11px 20px', background: '#f9fafb', border: '1.5px solid #e5e7eb', color: '#6b7280', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Cancel
        </button>
      </div>
    </div>
  );

  // ── List ──
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>⬇️ Free Downloads</h2>
        <button onClick={startNew}
          style={{ background: P, color: 'white', border: 'none', cursor: 'pointer', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
          + Add New
        </button>
      </div>

      {msg && <div style={{ borderRadius: 10, padding: '9px 13px', marginBottom: 16, fontSize: 13, fontWeight: 600, background: msg.startsWith('✓') ? '#d1fae5' : '#fee2e2', color: msg.startsWith('✓') ? '#065f46' : '#dc2626' }}>{msg}</div>}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</div>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'white', borderRadius: 16, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
          <div style={{ fontWeight: 700 }}>No free downloads yet. Click "+ Add New" to create one.</div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
        {items.map(item => (
          <div key={item.id} style={{ ...card, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Cover thumbnail */}
            {item.cover_image_url
              ? <img src={item.cover_image_url} alt={item.title_en} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {item.file_type === 'pdf' ? '📄' : item.file_type === 'png' ? '🖼️' : '🗜️'}
                </div>
            }

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: 14, marginBottom: 2 }}>{item.title_en}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const }}>
                {item.file_type && (
                  <span style={{ fontSize: 11, fontWeight: 700, background: item.file_type === 'pdf' ? '#fee2e2' : item.file_type === 'png' ? '#f3e8ff' : '#dbeafe', color: item.file_type === 'pdf' ? '#dc2626' : item.file_type === 'png' ? '#7c3aed' : '#1d4ed8', borderRadius: 5, padding: '1px 6px' }}>
                    {item.file_type.toUpperCase()}
                  </span>
                )}
                {item.category && <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.category}</span>}
                <span style={{ fontSize: 11, color: '#9ca3af' }}>⬇️ {item.download_count || 0} downloads</span>
                {item.last_download_at && (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    · Last: {new Date(item.last_download_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>

            {/* Status toggle */}
            <button onClick={() => toggleStatus(item)}
              style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', background: item.status === 'published' ? '#d1fae5' : '#f3f4f6', color: item.status === 'published' ? '#059669' : '#9ca3af' }}>
              {item.status === 'published' ? '✅ Live' : '📝 Draft'}
            </button>

            {/* Actions */}
            <button onClick={() => startEdit(item)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Edit
            </button>
            <button onClick={() => del(item.id, item.title_en)}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Artist Payouts ─────────────────────────────────────────────────────────

const PAID_STATUSES_PAYOUT = new Set(['paid','packing','shipped','delivered']);
const DEFAULT_PHYSICAL_ROYALTY = 100;
const DEFAULT_DIGITAL_PCT = 80;

function calcPayoutBreakdown(orders: any[], productMap: Map<string,any>, month: number, year: number) {
  let physicalQty = 0, physicalEarningTHB = 0;
  let digitalQtyTHB = 0, digitalGrossTHB = 0, digitalEarningTHB = 0;
  let digitalQtyUSD = 0, digitalGrossUSD = 0, digitalEarningUSD = 0;

  for (const o of orders) {
    if (!PAID_STATUSES_PAYOUT.has(o.payment_status || o.paymentStatus)) continue;
    const d = new Date(o.created_at || o.createdAt || 0);
    if (d.getMonth() + 1 !== month || d.getFullYear() !== year) continue;
    const isUSD = o.currency === 'USD';
    for (const i of (o.items || [])) {
      const qty = i.qty || 1;
      const isDigital = (i.optionType || i.type) === 'digital';
      const product = productMap.get(i.productId || i.product_id || '');
      if (isDigital) {
        const pct = (product?.digital_artist_royalty_percent ?? DEFAULT_DIGITAL_PCT) / 100;
        if (isUSD) {
          const unit = i.unitPriceUSD ?? i.price_usd ?? 0;
          digitalQtyUSD += qty;
          digitalGrossUSD += unit * qty;
          digitalEarningUSD += unit * pct * qty;
        } else {
          const unit = i.unitPriceTHB ?? i.price_thb ?? 0;
          digitalQtyTHB += qty;
          digitalGrossTHB += unit * qty;
          digitalEarningTHB += unit * pct * qty;
        }
      } else {
        const royalty = product?.artist_physical_royalty_thb ?? DEFAULT_PHYSICAL_ROYALTY;
        physicalQty += qty;
        physicalEarningTHB += royalty * qty;
      }
    }
  }
  return {
    physicalQty, physicalEarningTHB,
    digitalQtyTHB, digitalGrossTHB, digitalEarningTHB,
    digitalQtyUSD, digitalGrossUSD, digitalEarningUSD,
    totalEarningTHB: physicalEarningTHB + digitalEarningTHB,
    totalEarningUSD: digitalEarningUSD,
  };
}

function ArtistPayoutsTab() {
  const now = new Date();
  const [artists, setArtists] = useState<any[]>([]);
  const [selArtist, setSelArtist] = useState('');
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [payouts, setPayouts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [calcLoading, setCalcLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [delConfirm, setDelConfirm] = useState<string|null>(null);
  const [msg, setMsg] = useState('');
  const [payAcct, setPayAcct] = useState<any>(null);

  // Form fields — editable by admin
  const [editId, setEditId] = useState<string|null>(null);
  const [fCalcTHB, setFCalcTHB] = useState('');
  const [fCalcUSD, setFCalcUSD] = useState('');
  const [fPaidTHB, setFPaidTHB] = useState('');
  const [fPaidUSD, setFPaidUSD] = useState('');
  const [fRate, setFRate] = useState('');
  const [fStatus, setFStatus] = useState('pending');
  const [fNote, setFNote] = useState('');
  const [fProof, setFProof] = useState('');
  const [fPaidAt, setFPaidAt] = useState('');
  const [proofUploading, setProofUploading] = useState(false);

  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const years = Array.from({ length: 4 }, (_,i) => now.getFullYear() - i);

  useEffect(() => { api.getArtists().then((a: any) => setArtists(Array.isArray(a) ? a : [])); }, []);

  // When artist changes: load their orders + products for calculation
  useEffect(() => {
    if (!selArtist) { setOrders([]); setProducts([]); setPayouts([]); setPayAcct(null); return; }
    api.getPayoutAccount(selArtist).then((d:any) => setPayAcct(d && !d.error ? d : null)).catch(() => setPayAcct(null));
    setCalcLoading(true);
    Promise.all([
      (api as any).getArtistOrdersForAdmin(selArtist),
      api.getMyProducts ? fetch(`/api/products?mine=1`, { headers: { Authorization: `Bearer ${localStorage.getItem('fluffy_token')}` } }).then(r => r.json()) : Promise.resolve([]),
      api.getArtistPayouts(selArtist),
    ]).then(([ords, prods, pays]: any[]) => {
      setOrders(Array.isArray(ords) ? ords : []);
      // fetch products by artist_id via admin endpoint
      fetch(`/api/products?admin=1`, { headers: { Authorization: `Bearer ${localStorage.getItem('fluffy_token')}` } })
        .then(r => r.json()).then((allProds: any[]) => {
          setProducts(Array.isArray(allProds) ? allProds.filter((p: any) => p.artist_id === selArtist) : []);
        });
      setPayouts(Array.isArray(pays) ? pays : []);
      setCalcLoading(false);
    }).catch(() => setCalcLoading(false));
  }, [selArtist]);

  const productMap = new Map((products as any[]).map((p: any) => [p.id, p]));
  const breakdown = selArtist && orders.length >= 0
    ? calcPayoutBreakdown(orders, productMap, selMonth, selYear)
    : null;

  const thisPayout = payouts.find(p => p.month === selMonth && p.year === selYear);

  // Auto-fill form when month/year changes or breakdown recalculates
  useEffect(() => {
    if (thisPayout) {
      setEditId(thisPayout.id);
      setFCalcTHB(thisPayout.calculated_earning_thb != null ? String(thisPayout.calculated_earning_thb) : breakdown ? String(Math.round(breakdown.totalEarningTHB * 100) / 100) : '');
      setFCalcUSD(thisPayout.calculated_earning_usd != null ? String(thisPayout.calculated_earning_usd) : breakdown ? String(Math.round(breakdown.totalEarningUSD * 10000) / 10000) : '');
      setFPaidTHB(thisPayout.paid_amount_thb != null ? String(thisPayout.paid_amount_thb) : '');
      setFPaidUSD(thisPayout.paid_amount_usd != null ? String(thisPayout.paid_amount_usd) : '');
      setFRate(thisPayout.usd_to_thb_rate != null ? String(thisPayout.usd_to_thb_rate) : '');
      setFStatus(thisPayout.status || 'pending');
      setFNote(thisPayout.payout_note || '');
      setFProof(thisPayout.payout_proof_url || '');
      setFPaidAt(thisPayout.paid_at ? thisPayout.paid_at.slice(0, 10) : '');
    } else {
      setEditId(null);
      setFCalcTHB(breakdown ? String(Math.round(breakdown.totalEarningTHB * 100) / 100) : '');
      setFCalcUSD(breakdown ? String(Math.round(breakdown.totalEarningUSD * 10000) / 10000) : '');
      setFPaidTHB(''); setFPaidUSD(''); setFRate('');
      setFStatus('pending'); setFNote(''); setFProof(''); setFPaidAt('');
    }
  }, [selMonth, selYear, selArtist, payouts.length, orders.length]);

  const uploadProof = async (file: File) => {
    setProofUploading(true);
    const result = await api.uploadFile(file, 'payouts');
    if (result.error) setMsg('⚠️ ' + result.error);
    else { setFProof(result.publicUrl); setMsg('✓ Proof uploaded'); }
    setProofUploading(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const save = async () => {
    if (!selArtist) { setMsg('⚠️ Select an artist first'); return; }
    setSaving(true); setMsg('');
    const payload: any = {
      artist_id: selArtist, month: selMonth, year: selYear,
      calculated_earning_thb: parseFloat(fCalcTHB) || 0,
      calculated_earning_usd: parseFloat(fCalcUSD) || 0,
      paid_amount_thb: parseFloat(fPaidTHB) || 0,
      paid_amount_usd: parseFloat(fPaidUSD) || 0,
      usd_to_thb_rate: fRate ? parseFloat(fRate) : null,
      // legacy field = sum of THB + USD equivalent
      calculated_earning: parseFloat(fCalcTHB) || 0,
      paid_amount: parseFloat(fPaidTHB) || 0,
      currency: 'THB',
      status: fStatus,
      payout_note: fNote || null,
      payout_proof_url: fProof || null,
      paid_at: fStatus === 'paid' ? (fPaidAt ? new Date(fPaidAt).toISOString() : new Date().toISOString()) : null,
      // Breakdown snapshot
      ...(breakdown ? {
        physical_qty: breakdown.physicalQty,
        physical_earning_thb: breakdown.physicalEarningTHB,
        digital_qty_thb: breakdown.digitalQtyTHB,
        digital_gross_thb: breakdown.digitalGrossTHB,
        digital_earning_thb: breakdown.digitalEarningTHB,
        digital_qty_usd: breakdown.digitalQtyUSD,
        digital_gross_usd: breakdown.digitalGrossUSD,
        digital_earning_usd: breakdown.digitalEarningUSD,
      } : {}),
    };
    if (editId) payload.id = editId;
    const result = await api.saveArtistPayout(payload);
    if (result.error) setMsg('⚠️ ' + result.error);
    else {
      setMsg('✓ Saved!');
      api.getArtistPayouts(selArtist).then((d: any) => setPayouts(Array.isArray(d) ? d : []));
    }
    setSaving(false);
    setTimeout(() => setMsg(''), 4000);
  };

  const deletePayout = async (id: string) => {
    const res = await (api as any).deleteArtistPayout(id);
    if (res?.error) { setMsg('⚠️ ' + res.error); setDelConfirm(null); return; }
    setDelConfirm(null);
    if (editId === id) { setEditId(null); }
    setMsg('✓ Payout record deleted.');
    api.getArtistPayouts(selArtist).then((d: any) => setPayouts(Array.isArray(d) ? d : []));
    setTimeout(() => setMsg(''), 4000);
  };

  const artistName = artists.find(a => a.id === selArtist)?.name || '';
  const thbFmt = (n: number) => `฿${Number(n||0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const usdFmt = (n: number) => `$${Number(n||0).toFixed(2)}`;

  const usdEquiv = fCalcUSD && fRate ? parseFloat(fCalcUSD) * parseFloat(fRate) : null;

  return (
    <div style={{ padding:24 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:'#111827', marginBottom:4 }}>💸 Artist Payouts</h1>
      <p style={{ fontSize:13, color:'#6b7280', marginBottom:20 }}>Select an artist and month to auto-calculate earnings from paid orders. Adjust amounts before marking as paid.</p>

      {/* Selector row */}
      <div style={{ ...card, padding:20, marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:12 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Artist *</label>
            <select value={selArtist} onChange={e=>setSelArtist(e.target.value)} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
              <option value="">Select artist…</option>
              {artists.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Month</label>
            <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
              {months.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Year</label>
            <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))} style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selArtist && calcLoading && <div style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>⏳ Loading orders…</div>}

      {/* Payout account details (for transferring money) */}
      {selArtist && (
        <div style={{ ...card, padding:16, marginBottom:20, background:'#f8fafc' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#374151', marginBottom:6 }}>💳 Payout Account</div>
          {payAcct && (payAcct.payout_account_name || payAcct.payout_account_number || payAcct.payout_payment_method) ? (
            <div style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>
              <div><b>Name:</b> {payAcct.payout_account_name||'—'}</div>
              <div><b>Method:</b> {payAcct.payout_payment_method||'—'}{payAcct.payout_bank_name?` · ${payAcct.payout_bank_name}`:''}</div>
              <div><b>Account / PayPal:</b> {payAcct.payout_account_number||'—'}</div>
              {payAcct.payout_note&&<div><b>Note:</b> {payAcct.payout_note}</div>}
            </div>
          ) : <div style={{ fontSize:13, color:'#9ca3af' }}>This artist hasn't added payout account details yet.</div>}
        </div>
      )}

      {/* Auto-calculated breakdown */}
      {selArtist && !calcLoading && breakdown && (
        <div style={{ ...card, padding:20, marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ fontSize:15, fontWeight:800, color:'#111827', margin:0 }}>
              📊 Auto-Calculated — {artistName} · {months[selMonth]} {selYear}
            </h3>
            <span style={{ fontSize:11, color:'#9ca3af' }}>From paid orders only</span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:10, marginBottom:16 }}>
            {/* Physical */}
            <div style={{ background:'#fef9c3', borderRadius:12, padding:'12px 14px', border:'1px solid #fde68a' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#92400e', marginBottom:6 }}>📦 PHYSICAL</div>
              <div style={{ fontSize:12, color:'#374151' }}>Qty: <b>{breakdown.physicalQty}</b></div>
              <div style={{ fontSize:15, fontWeight:900, color:'#78350f', marginTop:4 }}>{thbFmt(breakdown.physicalEarningTHB)}</div>
            </div>
            {/* Digital THB */}
            <div style={{ background:'#f0fdf4', borderRadius:12, padding:'12px 14px', border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#065f46', marginBottom:6 }}>⬇️ DIGITAL (THB)</div>
              <div style={{ fontSize:12, color:'#374151' }}>Qty: <b>{breakdown.digitalQtyTHB}</b> · Gross: <b>{thbFmt(breakdown.digitalGrossTHB)}</b></div>
              <div style={{ fontSize:15, fontWeight:900, color:'#065f46', marginTop:4 }}>{thbFmt(breakdown.digitalEarningTHB)}</div>
            </div>
            {/* Digital USD */}
            <div style={{ background:'#eff6ff', borderRadius:12, padding:'12px 14px', border:'1px solid #bfdbfe' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#1e40af', marginBottom:6 }}>⬇️ DIGITAL (USD)</div>
              <div style={{ fontSize:12, color:'#374151' }}>Qty: <b>{breakdown.digitalQtyUSD}</b> · Gross: <b>{usdFmt(breakdown.digitalGrossUSD)}</b></div>
              <div style={{ fontSize:15, fontWeight:900, color:'#1e3a8a', marginTop:4 }}>{usdFmt(breakdown.digitalEarningUSD)}</div>
            </div>
            {/* Totals */}
            <div style={{ background:'#fdf4ff', borderRadius:12, padding:'12px 14px', border:'1px solid #e9d5ff' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#6b21a8', marginBottom:6 }}>💰 TOTAL</div>
              <div style={{ fontSize:15, fontWeight:900, color:'#4c1d95' }}>{thbFmt(breakdown.totalEarningTHB)}</div>
              {breakdown.totalEarningUSD > 0 && <div style={{ fontSize:13, fontWeight:800, color:'#1e3a8a', marginTop:2 }}>{usdFmt(breakdown.totalEarningUSD)}</div>}
            </div>
          </div>
          {breakdown.physicalQty === 0 && breakdown.digitalQtyTHB === 0 && breakdown.digitalQtyUSD === 0 && (
            <div style={{ textAlign:'center', color:'#9ca3af', fontSize:13, padding:'8px 0' }}>No paid orders found for this period.</div>
          )}
        </div>
      )}

      {/* Edit / Create form */}
      {selArtist && !calcLoading && (
        <div style={{ ...card, padding:20, marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#111827', marginBottom:16 }}>
            {editId ? '✏️ Edit' : '+ New'} Payout — {artistName} · {months[selMonth]} {selYear}
          </h3>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Calculated Earning THB (฿)</label>
              <input type="number" value={fCalcTHB} onChange={e=>setFCalcTHB(e.target.value)} placeholder="Auto-filled from orders"
                style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Calculated Earning USD ($)</label>
              <input type="number" value={fCalcUSD} onChange={e=>setFCalcUSD(e.target.value)} placeholder="Auto-filled from orders"
                style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Paid Amount THB (฿)</label>
              <input type="number" value={fPaidTHB} onChange={e=>setFPaidTHB(e.target.value)} placeholder="0"
                style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Paid Amount USD ($)</label>
              <input type="number" value={fPaidUSD} onChange={e=>setFPaidUSD(e.target.value)} placeholder="0"
                style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>USD → THB Rate <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></label>
              <input type="number" value={fRate} onChange={e=>setFRate(e.target.value)} placeholder="e.g. 35.5"
                style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
                onFocus={e=>e.target.style.borderColor=P} onBlur={e=>e.target.style.borderColor='#e5e7eb'} />
              {usdEquiv !== null && <div style={{ fontSize:11, color:'#1d4ed8', marginTop:4 }}>= ฿{usdEquiv.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} equivalent</div>}
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Status</label>
              <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
                <option value="pending">⏳ Pending</option>
                <option value="paid">✅ Paid</option>
              </select>
            </div>
            {fStatus === 'paid' && (
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Paid Date</label>
                <input type="date" value={fPaidAt} onChange={e=>setFPaidAt(e.target.value)}
                  style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box' as const }} />
              </div>
            )}
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Note for artist</label>
            <textarea value={fNote} onChange={e=>setFNote(e.target.value)} rows={2} placeholder="e.g. Bank transfer ref #1234…"
              style={{ width:'100%', padding:'9px 13px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', resize:'vertical' as const, boxSizing:'border-box' as const }} />
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }}>Payout Proof (image / PDF)</label>
            {fProof ? (
              <div style={{ display:'flex', gap:10, alignItems:'center', background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:10, padding:'10px 14px' }}>
                <a href={fProof} target="_blank" rel="noreferrer" style={{ flex:1, color:'#059669', fontWeight:700, fontSize:13 }}>📎 View proof</a>
                <label style={{ cursor:'pointer' }}>
                  <span style={{ fontSize:12, fontWeight:700, color:'#2563eb', background:'#dbeafe', borderRadius:8, padding:'4px 10px' }}>Replace</span>
                  <input type="file" accept="image/*,.pdf" style={{ display:'none' }} onChange={e=>{ const f=e.target.files?.[0]; if(f)uploadProof(f); e.target.value=''; }} />
                </label>
              </div>
            ) : (
              <label style={{ cursor:proofUploading?'not-allowed':'pointer', display:'block' }}>
                <div style={{ background:'#f9fafb', border:'2px dashed #d1d5db', borderRadius:10, padding:'12px', textAlign:'center' as const, fontSize:13, color:proofUploading?'#9ca3af':'#374151', fontWeight:600 }}>
                  {proofUploading ? '⏳ Uploading…' : '📎 Upload Proof (image / PDF)'}
                </div>
                <input type="file" accept="image/*,.pdf" style={{ display:'none' }} disabled={proofUploading} onChange={e=>{ const f=e.target.files?.[0]; if(f)uploadProof(f); e.target.value=''; }} />
              </label>
            )}
          </div>

          {msg && <div style={{ marginBottom:12, padding:'9px 13px', borderRadius:10, background:msg.startsWith('✓')?'#d1fae5':'#fee2e2', color:msg.startsWith('✓')?'#065f46':'#dc2626', fontSize:13, fontWeight:600 }}>{msg}</div>}
          <button onClick={save} disabled={saving} style={{ background:saving?P+'88':P, color:'white', border:'none', cursor:'pointer', padding:'10px 28px', borderRadius:12, fontSize:14, fontWeight:700, fontFamily:'inherit' }}>
            {saving ? 'Saving…' : (editId ? 'Update Payout' : 'Create Payout Record')}
          </button>
        </div>
      )}

      {/* Payout history */}
      {selArtist && (
        <div style={{ ...card, overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid #f3f4f6', fontWeight:800, fontSize:14, color:'#111827' }}>
            Payout History{artistName && ` — ${artistName}`}
          </div>
          {calcLoading ? <div style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>Loading…</div>
            : !payouts.length ? <div style={{ textAlign:'center', padding:32, color:'#9ca3af' }}>No payout records yet.</div>
            : (
            <div style={{ overflowX:'auto' as const }}>
              <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
                <thead><tr style={{ background:'#f9fafb', borderBottom:'2px solid #f3f4f6' }}>
                  {['Period','Calc THB','Calc USD','Paid THB','Paid USD','Rate','Status','Proof',''].map(h=><th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:11, color:'#9ca3af', fontWeight:700, whiteSpace:'nowrap' as const }}>{h}</th>)}
                </tr></thead>
                <tbody>{payouts.map(py=>(
                  <tr key={py.id} style={{ borderBottom:'1px solid #f9fafb' }}>
                    <td style={{ padding:'10px 12px', fontWeight:700, color:'#111827', fontSize:13, whiteSpace:'nowrap' as const }}>{months[py.month]} {py.year}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, fontWeight:700 }}>{thbFmt(py.calculated_earning_thb || py.calculated_earning || 0)}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, fontWeight:700, color:'#1e40af' }}>{usdFmt(py.calculated_earning_usd || 0)}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, fontWeight:700, color:'#059669' }}>{thbFmt(py.paid_amount_thb || py.paid_amount || 0)}</td>
                    <td style={{ padding:'10px 12px', fontSize:12, fontWeight:700, color:'#0070ba' }}>{usdFmt(py.paid_amount_usd || 0)}</td>
                    <td style={{ padding:'10px 12px', fontSize:11, color:'#6b7280' }}>{py.usd_to_thb_rate ? `×${py.usd_to_thb_rate}` : '—'}</td>
                    <td style={{ padding:'10px 12px' }}><span style={{ background:py.status==='paid'?'#d1fae5':'#fef3c7', color:py.status==='paid'?'#059669':'#d97706', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{py.status==='paid'?'✅ Paid':'⏳ Pending'}</span></td>
                    <td style={{ padding:'10px 12px' }}>{py.payout_proof_url ? <a href={py.payout_proof_url} target="_blank" rel="noreferrer" style={{ color:P, fontWeight:700, fontSize:12 }}>View</a> : <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={()=>{ setSelMonth(py.month); setSelYear(py.year); }}
                          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', fontSize:12, fontWeight:600, color:'#374151' }}>Edit</button>
                        <button onClick={()=>setDelConfirm(py.id)}
                          style={{ padding:'5px 10px', borderRadius:8, border:'1px solid #fca5a5', background:'#fef2f2', cursor:'pointer', fontSize:12, fontWeight:700, color:'#dc2626' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Delete modal */}
      {delConfirm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:20, padding:32, maxWidth:400, width:'90%', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize:36, textAlign:'center', marginBottom:12 }}>🗑️</div>
            <h3 style={{ fontSize:17, fontWeight:800, color:'#111827', textAlign:'center', marginBottom:10 }}>Delete Payout Record?</h3>
            <p style={{ fontSize:13, color:'#6b7280', textAlign:'center', lineHeight:1.6, marginBottom:24 }}>
              This permanently removes the payout record. Orders, products, and sales history are not affected.
            </p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={()=>setDelConfirm(null)} style={{ flex:1, padding:'10px', borderRadius:12, border:'1.5px solid #e5e7eb', background:'white', cursor:'pointer', fontSize:14, fontWeight:700, color:'#374151' }}>Cancel</button>
              <button onClick={()=>deletePayout(delConfirm)} style={{ flex:1, padding:'10px', borderRadius:12, border:'none', background:'#dc2626', cursor:'pointer', fontSize:14, fontWeight:700, color:'white' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}