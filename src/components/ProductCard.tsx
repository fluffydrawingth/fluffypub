import React, { useState } from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function ProductCard({ product }: { product: any }) {
  const { theme } = useTheme();
  const { add, items } = useCart();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const p = theme.primaryColor;

  const title = (lang === 'th' && product.title_th) ? product.title_th : product.title;
  const artistDisplay = product.artistName || product.artist_name || product.artist || '';
  const isNew = product.isNew || product.is_new;
  const priceTHB = Number(product.price_thb) || 0;

  const enabledVariants = (product.variants || []).filter((v: any) => v.enabled !== false);
  const hasVariants = enabledVariants.length > 0;

  // Check if any item with this product id is in cart
  const inCart = items.some(i => i.id === product.id);

  const handleCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) { navigate('/cart'); return; }

    if (!hasVariants) {
      // No variants — add directly with product type from DB
      const itemType = product.is_physical && !product.is_digital ? 'physical'
        : product.is_digital && !product.is_physical ? 'digital'
        : product.type || 'physical';
      add({
        id: product.id,
        title,
        price_thb: priceTHB,
        image: product.image,
        artist: artistDisplay,
        slug: product.slug,
        type: itemType,
      });
      return;
    }

    if (enabledVariants.length === 1) {
      // Only one variant — add it directly
      const v = enabledVariants[0];
      const varTHB = Number(v.price_thb) > 0 ? Number(v.price_thb) : priceTHB;
      add({
        id: product.id, title, price_thb: varTHB, image: product.image,
        artist: artistDisplay, slug: product.slug, type: product.type || 'physical',
        variant: { id: v.id, name: v.name, price_thb: varTHB },
      });
      return;
    }

    // Multiple variants — show selector
    setShowVariants(true);
  };

  const addVariant = (v: any) => {
    const varTHB = Number(v.price_thb) > 0 ? Number(v.price_thb) : priceTHB;
    add({
      id: product.id, title, price_thb: varTHB, image: product.image,
      artist: artistDisplay, slug: product.slug, type: product.type || 'physical',
      variant: { id: v.id, name: v.name, price_thb: varTHB },
    });
    setShowVariants(false);
  };

  return (
    <>
      <div
        style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1.5px solid ${p}15`, transition:'all 0.2s', cursor:'pointer', fontFamily:theme.fontFamily, position:'relative' as const }}
        onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 24px ${p}20`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)';}}
      >
        {/* Square image 1:1 */}
        <div onClick={()=>navigate(`/products/${product.slug}`)} style={{ position:'relative', width:'100%', paddingBottom:'100%', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, overflow:'hidden' }}>
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:60 }}>
            {product.cover_image_url
              ? <img src={product.cover_image_url} alt={title} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
              : <span>{product.image}</span>
            }
          </div>
          {product.bestseller && <span style={{ position:'absolute', top:8, left:8, background:theme.accentColor||'#fb923c', color:'white', borderRadius:12, padding:'3px 8px', fontSize:10, fontWeight:700, zIndex:1 }}>⭐ Bestseller</span>}
          {isNew && <span style={{ position:'absolute', top:8, right:8, background:theme.secondaryColor||'#c084fc', color:'white', borderRadius:12, padding:'3px 8px', fontSize:10, fontWeight:700, zIndex:1 }}>✨ New</span>}
        </div>

        <div style={{ padding:'12px 14px 14px' }}>
          <div style={{ fontSize:11, color:p, fontWeight:700, marginBottom:3 }}>
            {artistDisplay}{artistDisplay && product.category ? ' · ' : ''}{product.category}
          </div>
          <div onClick={()=>navigate(`/products/${product.slug}`)} style={{ fontSize:14, fontWeight:800, color:theme.textColor, marginBottom:6, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
            {title}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:8 }}>
            <span style={{ color:'#f59e0b', fontSize:11 }}>{'★'.repeat(Math.min(5,Math.round(product.rating||0)))}</span>
            <span style={{ fontSize:10, color:'#888' }}>({product.reviews||0})</span>
            {product.pages > 0 && <span style={{ fontSize:10, color:'#aaa', marginLeft:'auto' }}>{product.pages} หน้า</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
            <span style={{ fontSize:16, fontWeight:900, color:theme.textColor }}>
              {priceTHB > 0 ? `฿${priceTHB.toLocaleString('th-TH')}` : '฿—'}
            </span>
            <button
              onClick={handleCartClick}
              style={{ background:inCart?'#10b981':p, color:'white', border:'none', cursor:'pointer', padding:'6px 12px', borderRadius:12, fontSize:11, fontWeight:700, fontFamily:theme.fontFamily, flexShrink:0 }}
            >
              {inCart ? '✓' : hasVariants ? '⚙️' : '+'}
            </button>
          </div>
        </div>
      </div>

      {/* Variant selector modal */}
      {showVariants && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          onClick={()=>setShowVariants(false)}>
          <div style={{ background:'white', borderRadius:20, padding:24, maxWidth:360, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e=>e.stopPropagation()}>
            <h3 style={{ fontSize:16, fontWeight:800, color:'#111827', marginBottom:4 }}>{title}</h3>
            <p style={{ fontSize:13, color:'#6b7280', marginBottom:16 }}>{tRaw('เลือกรูปแบบ','Select an option')}</p>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
              {enabledVariants.map((v: any) => {
                const varTHB = Number(v.price_thb) > 0 ? Number(v.price_thb) : priceTHB;
                return (
                  <button key={v.id} onClick={()=>addVariant(v)}
                    style={{ padding:'12px 16px', borderRadius:12, border:`1.5px solid ${p}30`, background:'white', cursor:'pointer', fontFamily:theme.fontFamily, display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14, fontWeight:600, color:'#374151' }}
                    onMouseEnter={e=>{e.currentTarget.style.background=p+'10';e.currentTarget.style.borderColor=p;}}
                    onMouseLeave={e=>{e.currentTarget.style.background='white';e.currentTarget.style.borderColor=p+'30';}}>
                    <span>{v.name}</span>
                    <span style={{ fontWeight:800, color:p }}>฿{varTHB.toLocaleString('th-TH')}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={()=>setShowVariants(false)} style={{ width:'100%', marginTop:12, padding:'10px', border:'none', background:'#f3f4f6', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600, color:'#6b7280', fontFamily:theme.fontFamily }}>
              {tRaw('ยกเลิก','Cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
