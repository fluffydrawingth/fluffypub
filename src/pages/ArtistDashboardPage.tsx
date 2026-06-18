import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import ImageUpload from '../components/ImageUpload';

type Tab = 'overview' | 'profile' | 'products' | 'sales' | 'earnings';

const thb = (n: number) => `฿${Number(n || 0).toLocaleString('th-TH')}`;
const usd = (n: number) => `$${Number(n || 0).toFixed(2)}`;
const MONTHS = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PAID_STATUSES = new Set(['paid','packing','shipped','delivered']);

// Default royalty/fee values (used when product has no override)
const DEFAULT_PHYSICAL_ROYALTY_THB = 100;
const DEFAULT_DIGITAL_ROYALTY_PERCENT = 80; // artist gets 80% of sale price by default

export default function ArtistDashboardPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>((route.params?.tab as Tab) || 'overview');
  const p = theme.primaryColor;

  // ProtectedRoute already verifies the role — no need to refreshUser() here.
  // Doing so causes a double-fetch race that briefly makes user=null → blank page.
  if (!user) return null;
  if (user.role !== 'artist') return null;

  const tabs: [Tab, string, string][] = [
    ['overview','📊','Overview'],
    ['profile','👤','Profile'],
    ['products','📚','Products'],
    ['sales','📦','Sales'],
    ['earnings','💰','Earnings'],
  ];

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <style>{`
        .artist-sidebar { display: flex; flex-direction: column; width: 220px; flex-shrink: 0; }
        .artist-mobile-nav { display: none; }
        @media(max-width:640px){
          .artist-sidebar { display: none !important; }
          .artist-mobile-nav { display: flex !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <div className="artist-sidebar" style={{ background:'white', borderRight:`1px solid ${p}15`, position:'sticky', top:0, height:'100vh', overflowY:'auto' }}>
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

      {/* Mobile top nav */}
      <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:50, background:'white', borderBottom:`1px solid ${p}15`, flexDirection:'column' }} className="artist-mobile-nav">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:p }}>🎨 Artist Studio</div>
            <div style={{ fontSize:11, color:'#888' }}>{user.name}</div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>navigate('/')} style={{ background:'none', border:`1.5px solid ${p}30`, borderRadius:10, padding:'6px 10px', fontSize:12, fontWeight:700, color:p, cursor:'pointer' }}>Store</button>
            <button onClick={async()=>{await logout();navigate('/');}} style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:10, padding:'6px 10px', fontSize:12, fontWeight:700, color:'#ef4444', cursor:'pointer' }}>Out</button>
          </div>
        </div>
        <div style={{ display:'flex', overflowX:'auto', padding:'0 12px 10px', gap:6, scrollbarWidth:'none' }}>
          {tabs.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ flexShrink:0, padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', background:tab===id?p:p+'15', color:tab===id?'white':p, fontWeight:700, fontSize:13, fontFamily:theme.fontFamily, whiteSpace:'nowrap' as const }}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'auto', paddingTop:0 }}>
        {/* Mobile spacer for fixed top nav */}
        <div className="artist-mobile-nav" style={{ height:110 }} />

        {tab==='overview'  && <ArtistOverview user={user} p={p} />}
        {tab==='profile'   && <ArtistProfile user={user} p={p} theme={theme} refreshUser={refreshUser} />}
        {tab==='products'  && <ArtistProducts p={p} />}
        {tab==='sales'     && <ArtistSales p={p} />}
        {tab==='earnings'  && <ArtistEarnings user={user} p={p} />}
      </div>
    </div>
  );
}

// ── Earnings calculation helpers ──────────────────────────────────────────────

function digitalRoyaltyPercent(product: any) {
  // Use product-specific override if set, else default 80%
  const pct = product?.digital_artist_royalty_percent;
  return (pct != null && pct >= 0 && pct <= 100) ? pct : DEFAULT_DIGITAL_ROYALTY_PERCENT;
}

function calcEarningsForOrders(orders: any[], productMap: Map<string, any>) {
  let earningTHB = 0, earningUSD = 0;
  for (const o of orders) {
    if (!PAID_STATUSES.has(o.payment_status || o.paymentStatus)) continue;
    const isUSD = o.currency === 'USD';
    for (const i of (o.items || [])) {
      const product = productMap.get(i.productId || i.product_id || '');
      const qty = i.qty || 1;
      const isDigital = (i.optionType || i.type) === 'digital';
      if (isDigital) {
        const pct = digitalRoyaltyPercent(product) / 100;
        if (isUSD) {
          const unitUSD = i.unitPriceUSD ?? i.price_usd ?? 0;
          earningUSD += unitUSD * pct * qty;
        } else {
          const unitTHB = i.unitPriceTHB ?? i.price_thb ?? 0;
          earningTHB += unitTHB * pct * qty;
        }
      } else {
        const royalty = product?.artist_physical_royalty_thb ?? DEFAULT_PHYSICAL_ROYALTY_THB;
        earningTHB += royalty * qty;
      }
    }
  }
  return { earningTHB, earningUSD };
}

function useArtistData() {
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.artistOrders().catch(() => []),
      api.getMyProducts().catch(() => []),
    ]).then(([o, pr]) => {
      setOrders(Array.isArray(o) ? o : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setLoading(false);
    });
  }, []);

  const productMap = new Map((products as any[]).map(pr => [pr.id, pr]));
  const paidOrders = orders.filter(o => PAID_STATUSES.has(o.payment_status || o.paymentStatus));

  // Gross sales (all items in paid orders)
  let grossTHB = 0, grossUSD = 0, physicalSold = 0, digitalSold = 0;
  for (const o of paidOrders) {
    const isUSD = o.currency === 'USD';
    for (const i of (o.items || [])) {
      const qty = i.qty || 1;
      const isDigital = (i.optionType || i.type) === 'digital';
      if (isDigital) digitalSold += qty; else physicalSold += qty;
      if (isUSD) grossUSD += (i.unitPriceUSD ?? 0) * qty;
      else grossTHB += (i.unitPriceTHB ?? i.price_thb ?? 0) * qty;
    }
  }

  const { earningTHB: totalEarningTHB, earningUSD: totalEarningUSD } = calcEarningsForOrders(orders, productMap);

  return { orders, paidOrders, products, productMap, loading, grossTHB, grossUSD, physicalSold, digitalSold, totalEarningTHB, totalEarningUSD };
}

// ── Overview ──────────────────────────────────────────────────────────────────

function ArtistOverview({ user, p }: any) {
  const { loading, paidOrders, totalEarningTHB, totalEarningUSD, products } = useArtistData();
  const stats = [
    { label:'My Products', value: products.length, icon:'📚', color:p },
    { label:'Total Orders', value: paidOrders.length, icon:'📦', color:'#10b981' },
    { label:'Earnings (THB)', value: loading ? '…' : thb(totalEarningTHB), icon:'💰', color:'#f59e0b' },
    { label:'Earnings (USD)', value: loading ? '…' : usd(totalEarningUSD), icon:'💵', color:'#3b82f6' },
  ];
  return (
    <div style={{ padding:24 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:'#1e293b', marginBottom:20 }}>Welcome back, {user.name}! 🎨</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:'white', borderRadius:16, padding:18, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', borderLeft:`4px solid ${s.color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:4 }}>{s.label}</div>
                <div style={{ fontSize:20, fontWeight:900, color:'#1e293b' }}>{s.value}</div>
              </div>
              <span style={{ fontSize:22 }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Products ──────────────────────────────────────────────────────────────────

function ArtistProducts({ p }: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMyProducts().then(d => { setProducts(Array.isArray(d) ? d : []); setLoading(false); }); }, []);

  const statusInfo = (s: string) => {
    if (s === 'published') return { t:'Published', c:'#059669', bg:'#d1fae5' };
    if (s === 'rejected')  return { t:'Rejected',  c:'#dc2626', bg:'#fee2e2' };
    return { t:'Pending Review', c:'#d97706', bg:'#fef3c7' };
  };

  return (
    <div style={{ padding:24 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:'#1e293b', marginBottom:8 }}>My Products</h1>
      <p style={{ fontSize:13, color:'#94a3b8', marginBottom:18 }}>Products are managed by the Fluffy Pub team. Prices and publishing are set during review.</p>
      <div style={{ background:'white', borderRadius:16, overflow:'auto', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:480 }}>
          <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
            {['','Title','Category','Price','Status'].map(h=><th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase' as const }}>{h}</th>)}
          </tr></thead>
          <tbody>{products.filter((pr, idx, arr) => arr.findIndex(x => x.id === pr.id) === idx).map(pr => {
            const si = statusInfo(pr.status);
            const priceTHB = pr.price_thb || (pr.price ? Math.round(pr.price * 35) : 0);
            const priceUSD = pr.price_usd;
            const cat = (pr.categories && pr.categories[0]) || pr.category || '—';
            return (
              <tr key={pr.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                <td style={{ padding:'10px 14px', fontSize:22 }}>{pr.cover_image_url ? <img src={pr.cover_image_url} style={{ width:34, height:34, borderRadius:8, objectFit:'cover' }} /> : (pr.image || '🎨')}</td>
                <td style={{ padding:'10px 14px', fontWeight:700, color:'#1e293b', fontSize:13 }}>{pr.title}</td>
                <td style={{ padding:'10px 14px' }}><span style={{ background:p+'15', color:p, borderRadius:10, padding:'2px 9px', fontSize:11, fontWeight:700 }}>{cat}</span></td>
                <td style={{ padding:'10px 14px', fontWeight:800, color:'#1e293b', fontSize:13 }}>
                  {thb(priceTHB)}{priceUSD ? <span style={{ color:'#0070ba', fontWeight:700, fontSize:11, marginLeft:6 }}>${priceUSD}</span> : null}
                </td>
                <td style={{ padding:'10px 14px' }}><span style={{ background:si.bg, color:si.c, borderRadius:10, padding:'2px 9px', fontSize:11, fontWeight:700 }}>{si.t}</span></td>
              </tr>
            );
          })}</tbody>
        </table>
        {loading && <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>Loading...</div>}
        {!loading && !products.length && <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>No products yet. ✨</div>}
      </div>
    </div>
  );
}

// ── Sales ─────────────────────────────────────────────────────────────────────

function ArtistSales({ p }: any) {
  const { orders, productMap, loading, grossTHB, grossUSD, physicalSold, digitalSold, totalEarningTHB, totalEarningUSD } = useArtistData();
  const [filterMonth, setFilterMonth] = useState(0);
  const [filterYear, setFilterYear] = useState(0);
  const now = new Date();
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const filteredOrders = orders.filter(o => {
    if (!filterMonth && !filterYear) return true;
    const d = new Date(o.created_at || o.createdAt || 0);
    if (filterYear && d.getFullYear() !== filterYear) return false;
    if (filterMonth && d.getMonth() + 1 !== filterMonth) return false;
    return true;
  });

  const paidFiltered = filteredOrders.filter(o => PAID_STATUSES.has(o.payment_status || o.paymentStatus));

  const summaryCards = [
    { label:'Physical Sold', value: physicalSold, icon:'🎁', color:'#10b981' },
    { label:'Digital Sold', value: digitalSold, icon:'⬇️', color:'#3b82f6' },
    { label:'Gross Sales THB', value: thb(grossTHB), icon:'💰', color:'#f59e0b' },
    { label:'Gross Sales USD', value: usd(grossUSD), icon:'💵', color:'#0070ba' },
    { label:'Artist Earning THB', value: thb(totalEarningTHB), icon:'🏦', color:'#8b5cf6' },
    { label:'Artist Earning USD', value: usd(totalEarningUSD), icon:'🏦', color:'#ec4899' },
  ];

  if (loading) return <div style={{ padding:24, color:'#888' }}>Loading...</div>;

  return (
    <div style={{ padding:24 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:'#1e293b', marginBottom:16 }}>My Sales</h1>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
        {summaryCards.map(s=>(
          <div key={s.label} style={{ background:'white', borderRadius:14, padding:16, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', borderLeft:`4px solid ${s.color}` }}>
            <div style={{ fontSize:10, color:'#888', fontWeight:600, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:18, fontWeight:900, color:'#1e293b' }}>{s.value}</div>
            <div style={{ fontSize:18, marginTop:4 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' as const }}>
        <select value={filterMonth} onChange={e=>setFilterMonth(Number(e.target.value))} style={{ padding:'7px 11px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
          <option value={0}>All months</option>
          {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={e=>setFilterYear(Number(e.target.value))} style={{ padding:'7px 11px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none' }}>
          <option value={0}>All years</option>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Order table — expanded per item */}
      <div style={{ background:'white', borderRadius:16, overflow:'auto', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
          <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
            {['Order / Product','Type','Qty','Sale Price','Your Earning','Date','Status'].map(h=><th key={h} style={{ textAlign:'left', padding:'11px 14px', fontSize:11, color:'#888', fontWeight:700, textTransform:'uppercase' as const, whiteSpace:'nowrap' as const }}>{h}</th>)}
          </tr></thead>
          <tbody>{filteredOrders.map(o=>{
            const isUSD = o.currency === 'USD';
            const paid = PAID_STATUSES.has(o.payment_status||o.paymentStatus);
            const items = o.items || [];
            return items.map((item:any, idx:number) => {
              const qty = item.qty || 1;
              const isDigital = (item.optionType || item.type) === 'digital';
              const product = productMap.get(item.productId || item.product_id || '');

              // Sale price in order's actual currency
              let saleDisplay = '';
              if (isUSD) {
                const unitUSD = item.unitPriceUSD ?? item.price_usd ?? 0;
                saleDisplay = `$${(unitUSD * qty).toFixed(2)}`;
              } else {
                const unitTHB = item.unitPriceTHB ?? item.price_thb ?? (item.price ? Math.round(item.price * 35) : 0);
                saleDisplay = thb(unitTHB * qty);
              }

              // Artist earning per item (only for paid orders)
              let earningDisplay = <span style={{ color:'#94a3b8', fontSize:12 }}>—</span>;
              if (paid) {
                if (isDigital) {
                  const pct = digitalRoyaltyPercent(product) / 100;
                  if (isUSD) {
                    const unitUSD = item.unitPriceUSD ?? item.price_usd ?? 0;
                    earningDisplay = <span style={{ color:'#0070ba', fontWeight:800 }}>${(unitUSD * pct * qty).toFixed(2)}</span>;
                  } else {
                    const unitTHB = item.unitPriceTHB ?? item.price_thb ?? 0;
                    earningDisplay = <span style={{ color:'#059669', fontWeight:800 }}>{thb(unitTHB * pct * qty)}</span>;
                  }
                } else {
                  const royalty = product?.artist_physical_royalty_thb ?? DEFAULT_PHYSICAL_ROYALTY_THB;
                  earningDisplay = <span style={{ color:'#059669', fontWeight:800 }}>{thb(royalty * qty)}</span>;
                }
              }

              const isFirst = idx === 0;
              return (
                <tr key={`${o.id}-${idx}`} style={{ borderBottom: idx === items.length - 1 ? '2px solid #f1f5f9' : '1px solid #f8fafc', background: isFirst ? 'white' : '#fafcff' }}>
                  <td style={{ padding:'10px 14px', fontSize:12, verticalAlign:'top' as const }}>
                    {isFirst && <div style={{ fontWeight:700, color:p, marginBottom:2, fontSize:11 }}>#{o.id.slice(-8).toUpperCase()}</div>}
                    <div style={{ fontWeight:600, color:'#1e293b' }}>{item.title || '—'}</div>
                  </td>
                  <td style={{ padding:'10px 14px', verticalAlign:'top' as const }}>
                    <span style={{ background: isDigital ? '#dbeafe' : '#fef9c3', color: isDigital ? '#1d4ed8' : '#92400e', borderRadius:20, padding:'2px 9px', fontSize:10, fontWeight:700 }}>
                      {isDigital ? '⬇️ Digital' : '📦 Physical'}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px', fontWeight:700, color:'#374151', fontSize:13, verticalAlign:'top' as const }}>{qty}</td>
                  <td style={{ padding:'10px 14px', fontWeight:800, color: isUSD ? '#0070ba' : '#1e293b', fontSize:13, verticalAlign:'top' as const }}>{saleDisplay}</td>
                  <td style={{ padding:'10px 14px', verticalAlign:'top' as const }}>{earningDisplay}</td>
                  <td style={{ padding:'10px 14px', fontSize:11, color:'#94a3b8', whiteSpace:'nowrap' as const, verticalAlign:'top' as const }}>
                    {isFirst ? new Date(o.created_at||o.createdAt).toLocaleDateString() : ''}
                  </td>
                  <td style={{ padding:'10px 14px', verticalAlign:'top' as const }}>
                    {isFirst && <span style={{ background:paid?'#d1fae5':'#fef3c7', color:paid?'#059669':'#d97706', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' as const }}>{paid?'Paid':'Pending'}</span>}
                  </td>
                </tr>
              );
            });
          })}</tbody>
        </table>
        {!filteredOrders.length && <div style={{ textAlign:'center', padding:36, color:'#94a3b8' }}>No sales yet.</div>}
      </div>
    </div>
  );
}

// ── Earnings ──────────────────────────────────────────────────────────────────

function ArtistEarnings({ user, p }: any) {
  const { orders, productMap, loading } = useArtistData();
  const now = new Date();
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(true);
  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  useEffect(() => {
    api.getArtistPayouts().then(d => { setPayouts(Array.isArray(d) ? d : []); setPayoutsLoading(false); }).catch(() => setPayoutsLoading(false));
  }, []);

  // Filter orders to selected month/year
  const monthOrders = orders.filter(o => {
    const d = new Date(o.created_at || o.createdAt || 0);
    return d.getMonth() + 1 === selMonth && d.getFullYear() === selYear;
  });

  const { earningTHB, earningUSD } = calcEarningsForOrders(monthOrders, productMap);

  // All-time totals
  const { earningTHB: allTimeTHB, earningUSD: allTimeUSD } = calcEarningsForOrders(orders, productMap);

  // Payout for selected month
  const thisPayout = payouts.find(py => py.month === selMonth && py.year === selYear);

  const earningCards = [
    { label:'Earnings (THB)', value: loading ? '…' : thb(earningTHB), icon:'💰', color:'#f59e0b', note:'Physical royalty + digital after platform fee' },
    { label:'Earnings (USD)', value: loading ? '…' : usd(earningUSD), icon:'💵', color:'#3b82f6', note:'Digital USD after platform fee' },
  ];

  if (loading) return <div style={{ padding:24, color:'#888' }}>Loading...</div>;

  return (
    <div style={{ padding:24 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:'#1e293b', marginBottom:4 }}>My Earnings</h1>
      <p style={{ fontSize:13, color:'#94a3b8', marginBottom:18 }}>Payouts are currently handled manually by Fluffy Pub.</p>

      {/* Month/Year filter */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' as const, alignItems:'center' }}>
        <select value={selMonth} onChange={e=>setSelMonth(Number(e.target.value))} style={{ padding:'8px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', background:'white' }}>
          {MONTHS.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
        </select>
        <select value={selYear} onChange={e=>setSelYear(Number(e.target.value))} style={{ padding:'8px 12px', borderRadius:10, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', background:'white' }}>
          {years.map(y=><option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>{MONTHS[selMonth]} {selYear}</span>
      </div>

      {/* Earnings cards for selected month */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:14, marginBottom:24 }}>
        {earningCards.map(s=>(
          <div key={s.label} style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', borderLeft:`4px solid ${s.color}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
              <div style={{ fontSize:12, color:'#888', fontWeight:600 }}>{s.label}</div>
              <span style={{ fontSize:22 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize:24, fontWeight:900, color:'#1e293b' }}>{s.value}</div>
            <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{s.note}</div>
          </div>
        ))}
      </div>

      {/* Payout status for selected month */}
      {thisPayout ? (
        <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:20 }}>
          <h3 style={{ fontSize:15, fontWeight:800, color:'#1e293b', marginBottom:12 }}>💸 Payout — {MONTHS[selMonth]} {selYear}</h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:10, marginBottom:14 }}>
            {[
              ['Calculated', thb(thisPayout.calculated_earning)],
              ['Paid Amount', thb(thisPayout.paid_amount)],
              ['Status', thisPayout.status === 'paid' ? '✅ Paid' : '⏳ Pending'],
              ['Paid On', thisPayout.paid_at ? new Date(thisPayout.paid_at).toLocaleDateString() : '—'],
            ].map(([k,v])=>(
              <div key={k as string} style={{ background:'#f8fafc', borderRadius:10, padding:'10px 12px' }}>
                <div style={{ fontSize:11, color:'#888', fontWeight:600, marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:14, fontWeight:800, color:'#1e293b' }}>{v}</div>
              </div>
            ))}
          </div>
          {thisPayout.payout_note && (
            <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#92400e', marginBottom:10 }}>
              📝 {thisPayout.payout_note}
            </div>
          )}
          {thisPayout.payout_proof_url && (
            <a href={thisPayout.payout_proof_url} target="_blank" rel="noreferrer"
              style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:10, padding:'8px 14px', fontSize:13, color:'#1d4ed8', fontWeight:700, textDecoration:'none' }}>
              📎 View Payout Proof
            </a>
          )}
        </div>
      ) : (
        <div style={{ background:'#f8fafc', borderRadius:16, padding:20, marginBottom:20, textAlign:'center' as const, color:'#94a3b8', fontSize:14 }}>
          No payout record for {MONTHS[selMonth]} {selYear} yet.
        </div>
      )}

      {/* All-time summary */}
      <div style={{ background:'white', borderRadius:16, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', marginBottom:20 }}>
        <h3 style={{ fontSize:15, fontWeight:800, color:'#1e293b', marginBottom:12 }}>📊 All-Time Earnings</h3>
        <div style={{ display:'flex', gap:14, flexWrap:'wrap' as const }}>
          <div style={{ flex:1, minWidth:120, background:'#fef3c7', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#92400e', fontWeight:600, marginBottom:4 }}>Total THB</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#78350f' }}>{thb(allTimeTHB)}</div>
          </div>
          <div style={{ flex:1, minWidth:120, background:'#dbeafe', borderRadius:12, padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'#1e40af', fontWeight:600, marginBottom:4 }}>Total USD</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#1e3a8a' }}>{usd(allTimeUSD)}</div>
          </div>
        </div>
      </div>

      {/* Payout history */}
      {payouts.length > 0 && (
        <div style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 10px rgba(0,0,0,0.05)' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid #f1f5f9', fontWeight:800, fontSize:15, color:'#1e293b' }}>📋 Payout History</div>
          <div style={{ overflowX:'auto' as const }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:420 }}>
              <thead><tr style={{ background:'#f8fafc', borderBottom:'2px solid #f1f5f9' }}>
                {['Period','Currency','Earning','Paid','Status','Proof'].map(h=><th key={h} style={{ textAlign:'left', padding:'10px 14px', fontSize:11, color:'#888', fontWeight:700 }}>{h}</th>)}
              </tr></thead>
              <tbody>{payouts.map(py=>(
                <tr key={py.id} style={{ borderBottom:'1px solid #f8fafc' }}>
                  <td style={{ padding:'10px 14px', fontWeight:700, fontSize:13, color:'#1e293b' }}>{MONTHS[py.month]} {py.year}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b' }}>{py.currency}</td>
                  <td style={{ padding:'10px 14px', fontWeight:700 }}>{py.currency==='USD' ? usd(py.calculated_earning) : thb(py.calculated_earning)}</td>
                  <td style={{ padding:'10px 14px', fontWeight:700 }}>{py.currency==='USD' ? usd(py.paid_amount) : thb(py.paid_amount)}</td>
                  <td style={{ padding:'10px 14px' }}><span style={{ background:py.status==='paid'?'#d1fae5':'#fef3c7', color:py.status==='paid'?'#059669':'#d97706', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{py.status==='paid'?'✅ Paid':'⏳ Pending'}</span></td>
                  <td style={{ padding:'10px 14px' }}>
                    {py.payout_proof_url
                      ? <a href={py.payout_proof_url} target="_blank" rel="noreferrer" style={{ color:'#1d4ed8', fontWeight:700, fontSize:12 }}>View</a>
                      : <span style={{ color:'#9ca3af', fontSize:12 }}>—</span>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────

function ArtistProfile({ user, p, theme, refreshUser }: any) {
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

  useEffect(() => {
    const id = user.artistId || user.id;
    api.getArtist(id).then((a: any) => {
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
    setSaving(false); setMsg('✓ Profile updated!'); setTimeout(() => setMsg(''), 3000);
  };

  const fld = (label: string, val: string, set: (v: string) => void, ph = '', type = 'text') => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#374151', marginBottom:6 }}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} placeholder={ph}
        style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' as const }}
        onFocus={e=>(e.target.style.borderColor=p)} onBlur={e=>(e.target.style.borderColor=p+'30')} />
    </div>
  );

  if (!loaded) return <div style={{ padding:24, color:'#888' }}>Loading...</div>;

  return (
    <div style={{ padding:24 }}>
      <div style={{ background:'white', borderRadius:16, padding:24, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', maxWidth:580 }}>
        <h3 style={{ fontSize:18, fontWeight:800, color:'#1e293b', marginBottom:20 }}>My Profile</h3>
        <div style={{ marginBottom:18 }}>
          <ImageUpload label="Profile Picture" value={avatar} onChange={setAvatar} folder="artists" hint="Square, 200×200px" />
        </div>
        {fld('Artist Name', name, setName, 'Mochi Arts')}
        <div style={{ marginBottom:14 }}>
          <label style={{ display:'block', fontSize:13, fontWeight:700, color:'#374151', marginBottom:6 }}>Bio</label>
          <textarea value={bio} onChange={e=>setBio(e.target.value)} rows={4}
            style={{ width:'100%', padding:'11px 14px', borderRadius:12, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, resize:'vertical', boxSizing:'border-box' as const }} />
        </div>
        <h4 style={{ fontSize:14, fontWeight:800, color:'#374151', margin:'8px 0 12px' }}>🔗 Links & Contact</h4>
        {fld('Instagram', instagram, setInstagram, '@username')}
        {fld('TikTok', tiktok, setTiktok, '@username')}
        {fld('Facebook', facebook, setFacebook, 'facebook.com/yourpage')}
        {fld('Website', website, setWebsite, 'https://yoursite.com')}
        {fld('Contact Email', contactEmail, setContactEmail, 'you@email.com', 'email')}
        {msg && <div style={{ marginBottom:14, fontSize:13, fontWeight:600, color:msg.startsWith('✓')?'#059669':'#dc2626' }}>{msg}</div>}
        <button onClick={save} disabled={saving} style={{ background:saving?p+'88':p, color:'white', border:'none', cursor:'pointer', padding:'11px 24px', borderRadius:12, fontSize:14, fontWeight:800, fontFamily:theme.fontFamily }}>{saving?'Saving...':'Save Profile'}</button>
      </div>
    </div>
  );
}
