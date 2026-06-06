import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    slug: string;
    price: number;
    originalPrice?: number;
    original_price?: number;
    artist?: string;
    artistName?: string;
    artist_name?: string;
    category: string;
    pages: number;
    rating: number;
    reviews: number;
    image: string;
    cover_image_url?: string;
    featured?: boolean;
    bestseller?: boolean;
    isNew?: boolean;
    is_new?: boolean;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { theme } = useTheme();
  const { add, items } = useCart();
  const { navigate } = useRouter();
  const inCart = items.some(i => i.id === product.id);
  const artistDisplay = product.artistName || product.artist_name || product.artist || '';
  const isNew = product.isNew || product.is_new;
  const originalPrice = product.originalPrice || product.original_price;
  const coverImg = product.cover_image_url;
  const p = theme.primaryColor;

  return (
    <div
      style={{
        background:'white', borderRadius:20, overflow:'hidden',
        boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:`1.5px solid ${p}18`,
        transition:'all 0.25s', cursor:'pointer', fontFamily:theme.fontFamily,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 12px 32px ${p}25`; }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,0.06)'; }}
    >
      {/* Product Image */}
      <div
        onClick={() => navigate(`/products/${product.slug}`)}
        style={{
          height:180, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:72, position:'relative', overflow:'hidden',
        }}
      >
        {coverImg
          ? <img src={coverImg} alt={product.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : <span>{product.image}</span>
        }
        {product.bestseller && (
          <span style={{ position:'absolute', top:12, left:12, background:theme.accentColor||'#fb923c', color:'white', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700, zIndex:1 }}>⭐ Bestseller</span>
        )}
        {isNew && (
          <span style={{ position:'absolute', top:12, right:12, background:theme.secondaryColor||'#c084fc', color:'white', borderRadius:20, padding:'4px 10px', fontSize:11, fontWeight:700, zIndex:1 }}>✨ New</span>
        )}
      </div>

      <div style={{ padding:'16px 18px 18px' }}>
        <div style={{ fontSize:12, color:p, fontWeight:700, marginBottom:4 }}>
          {artistDisplay} · {product.category}
        </div>
        <div
          onClick={() => navigate(`/products/${product.slug}`)}
          style={{ fontSize:16, fontWeight:800, color:theme.textColor, marginBottom:8, lineHeight:1.3 }}
        >
          {product.title}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
          <span style={{ color:'#f59e0b', fontSize:13 }}>{'★'.repeat(Math.min(5, Math.round(product.rating||0)))}</span>
          <span style={{ fontSize:12, color:'#888' }}>({product.reviews||0})</span>
          <span style={{ fontSize:12, color:'#aaa', marginLeft:'auto' }}>{product.pages||0} pages</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <span style={{ fontSize:20, fontWeight:800, color:theme.textColor }}>${product.price}</span>
            {originalPrice && <span style={{ fontSize:13, color:'#aaa', textDecoration:'line-through', marginLeft:8 }}>${originalPrice}</span>}
          </div>
          <button
            onClick={() => add({ id:product.id, title:product.title, price:product.price, image:product.image, artist:artistDisplay, slug:product.slug })}
            style={{
              background:inCart?'#e5e7eb':p, color:inCart?'#888':'white',
              border:'none', cursor:inCart?'default':'pointer',
              padding:'8px 16px', borderRadius:16, fontSize:13, fontWeight:700,
              fontFamily:theme.fontFamily, transition:'all 0.2s',
            }}
          >
            {inCart ? '✓ Added' : '+ Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
