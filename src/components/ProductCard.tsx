import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function ProductCard({ product }: { product: any }) {
  const { theme } = useTheme();
  const { add, items } = useCart();
  const { navigate } = useRouter();
  const { lang, price: fmtPrice, t } = useLang();

  const inCart = items.some(i => {
    const cartKey = i.id + ((i as any).variant?.id || '');
    return cartKey === product.id;
  });
  const artistDisplay = product.artistName || product.artist_name || product.artist || '';
  const isNew = product.isNew || product.is_new;
  const originalPrice = product.originalPrice || product.original_price;
  const p = theme.primaryColor;
  const title = (lang === 'th' && product.title_th) ? product.title_th : product.title;

  return (
    <div
      style={{ background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1.5px solid ${p}15`, transition:'all 0.2s', cursor:'pointer', fontFamily:theme.fontFamily }}
      onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 24px ${p}20`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)';}}
    >
      {/* Square image 1:1 */}
      <div
        onClick={()=>navigate(`/products/${product.slug}`)}
        style={{ position:'relative', width:'100%', paddingBottom:'100%', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, overflow:'hidden' }}
      >
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
          {product.pages > 0 && <span style={{ fontSize:10, color:'#aaa', marginLeft:'auto' }}>{product.pages} {t('pages','pages')}</span>}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:6 }}>
          <div>
            <span style={{ fontSize:16, fontWeight:900, color:theme.textColor }}>
              {lang === 'th'
                ? (product.price_thb > 0 ? `฿${Number(product.price_thb).toLocaleString('th-TH')}` : `฿${Math.round(product.price * 35).toLocaleString('th-TH')}`)
                : (product.price_usd > 0 ? `$${Number(product.price_usd).toFixed(2)}` : `$${Number(product.price || 0).toFixed(2)}`)}
            </span>
          </div>
          <button
            onClick={()=>add({ id:product.id, title, price:product.price, image:product.image, artist:artistDisplay, slug:product.slug, type:product.type } as any)}
            style={{ background:inCart?'#e5e7eb':p, color:inCart?'#888':'white', border:'none', cursor:inCart?'default':'pointer', padding:'6px 12px', borderRadius:12, fontSize:11, fontWeight:700, fontFamily:theme.fontFamily, flexShrink:0 }}
          >
            {inCart ? '✓' : '+'}
          </button>
        </div>
      </div>
    </div>
  );
}
