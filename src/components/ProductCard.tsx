import React, { useState } from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useFavorites } from '../lib/favorites';
import { useAuth } from '../lib/auth';

export default function ProductCard({ product }: { product: any }) {
  const { theme } = useTheme();
  const { add, items, increment } = useCart();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const [modal, setModal] = useState(false);
  const { isFav, toggle } = useFavorites();
  const { user } = useAuth();
  const fav = isFav(product.id);
  const p = theme.primaryColor;

  const title = (lang === 'th' && product.title_th) ? product.title_th : product.title;
  const artist = product.artistName || product.artist_name || product.artist || '';
  const priceTHB = Number(product.price_thb) || 0;

  // Build options list from product config
  const options: { id: string; name: string; type: 'physical'|'digital'; price: number }[] = [];
  const physicalVariants = (product.variants || []).filter((v: any) => v.enabled !== false);
  physicalVariants.forEach((v: any) => {
    const price = Number(v.price_thb) > 0 ? Number(v.price_thb) : priceTHB;
    options.push({ id: v.id, name: v.name, type: 'physical', price });
  });
  if (product.is_digital || product.type === 'digital' || product.type === 'both') {
    const dPrice = Number(product.digital_price_thb || product.price_thb) || priceTHB;
    options.push({ id: 'digital', name: tRaw('ไฟล์ดิจิทัล','Digital file'), type: 'digital', price: dPrice });
  }

  const cartKeys = items.map(i => `${i.id}::${i.optionId}`);
  const inCartAny = items.some(i => i.id === product.id);

  const handleCartBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (options.length === 0) return; // no options configured
    if (options.length === 1) {
      // Single option — add or increment
      const o = options[0];
      const k = `${product.id}::${o.id}`;
      if (cartKeys.includes(k)) { increment(product.id, o.id); return; }
      if (o.price <= 0) return; // block ฿0
      add({ id: product.id, title, image: product.image, artist, slug: product.slug, optionId: o.id, optionName: o.name, optionType: o.type, unitPriceTHB: o.price });
      return;
    }
    setModal(true);
  };

  const handleOption = (o: { id: string; name: string; type: 'physical'|'digital'; price: number }) => {
    const k = `${product.id}::${o.id}`;
    if (cartKeys.includes(k)) { increment(product.id, o.id); }
    else if (o.price > 0) { add({ id: product.id, title, image: product.image, artist, slug: product.slug, optionId: o.id, optionName: o.name, optionType: o.type, unitPriceTHB: o.price }); }
    setModal(false);
  };

  const btnLabel = options.length === 0 ? '—' : inCartAny ? '✓' : options.length > 1 ? '⚙️' : '+';

  return (
    <>
      <div style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1.5px solid ${p}15`, transition:'all 0.2s', cursor:'pointer', fontFamily:theme.fontFamily }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 24px ${p}20`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)';}}>
        {/* Square image */}
        <div onClick={()=>navigate(`/products/${product.slug}`)} style={{ position:'relative', width:'100%', paddingBottom:'100%', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:60 }}>
            {product.cover_image_url
              ? <img src={product.cover_image_url} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
              : <span>{product.image}</span>}
          </div>
          {product.is_new && <span style={{ position:'absolute', top:8, right:8, background:theme.secondaryColor||'#c084fc', color:'white', borderRadius:12, padding:'3px 8px', fontSize:10, fontWeight:700, zIndex:1 }}>✨ New</span>}
          {/* Heart / favorite button */}
          <button
            onClick={e => {
              e.stopPropagation();
              if (!user) { navigate('/login'); return; }
              toggle(product.id);
            }}
            style={{ position:'absolute', top:8, left:8, width:30, height:30, borderRadius:'50%', border:'none', background:fav ? '#ef4444' : 'rgba(255,255,255,0.85)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, zIndex:1, boxShadow:'0 2px 8px rgba(0,0,0,0.15)', transition:'all 0.15s' }}
            title={fav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {fav ? '❤️' : '🤍'}
          </button>
        </div>
        <div style={{ padding:'12px 14px 14px' }}>
          <div style={{ fontSize:11, color:p, fontWeight:700, marginBottom:3 }}>{artist}{artist&&product.category?' · ':''}{product.category}</div>
          <div onClick={()=>navigate(`/products/${product.slug}`)} style={{ fontSize:14, fontWeight:800, color:theme.textColor, marginBottom:8, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
            {title}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
            <span style={{ fontSize:16, fontWeight:900, color:theme.textColor }}>
              {priceTHB > 0 ? `฿${priceTHB.toLocaleString('th-TH')}` : '—'}
            </span>
            <button onClick={handleCartBtn} disabled={options.length===0}
              style={{ background:inCartAny?'#10b981':options.length===0?'#e5e7eb':p, color:'white', border:'none', cursor:options.length===0?'not-allowed':'pointer', padding:'6px 12px', borderRadius:12, fontSize:12, fontWeight:700, fontFamily:theme.fontFamily, flexShrink:0 }}>
              {btnLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Variant modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={()=>setModal(false)}>
          <div style={{ background:'white', borderRadius:20, padding:24, maxWidth:340, width:'100%' }} onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#111827', margin:'0 0 4px' }}>{title}</h3>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>{tRaw('เลือกรูปแบบ','Select an option')}</p>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
              {options.map(o => {
                const inCart = cartKeys.includes(`${product.id}::${o.id}`);
                return (
                  <button key={o.id} onClick={()=>handleOption(o)}
                    style={{ padding:'12px 16px', borderRadius:12, border:`1.5px solid ${inCart?'#10b981':p}30`, background:inCart?'#d1fae5':'white', cursor:'pointer', fontFamily:theme.fontFamily, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14, fontWeight:600, color:'#374151' }}
                    onMouseEnter={e=>{e.currentTarget.style.background=inCart?'#a7f3d0':p+'10';e.currentTarget.style.borderColor=inCart?'#10b981':p;}}
                    onMouseLeave={e=>{e.currentTarget.style.background=inCart?'#d1fae5':'white';e.currentTarget.style.borderColor=inCart?'#10b981':p+'30';}}>
                    <span>{inCart?'✓ ':''}{o.name}</span>
                    <span style={{ fontWeight:800, color:inCart?'#10b981':p }}>฿{o.price.toLocaleString('th-TH')}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={()=>setModal(false)} style={{ width:'100%', marginTop:10, padding:'10px', border:'none', background:'#f3f4f6', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600, color:'#6b7280', fontFamily:theme.fontFamily }}>
              {tRaw('ยกเลิก','Cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
