import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import ProductCard from '../components/ProductCard';
import { RichDescRenderer } from '../components/RichDescEditor';

export default function ProductDetailPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { add, items } = useCart();
  const { navigate } = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details'|'reviews'>('details');
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [variantError, setVariantError] = useState('');

  useEffect(() => {
    api.getProduct(slug).then(p => {
      if (!p.error) {
        setProduct(p);
        // Auto-select first enabled variant if only one
        const variants = (p.variants || []).filter((v:any) => v.enabled !== false);
        if (variants.length === 1) setSelectedVariant(variants[0]);
      }
      setLoading(false);
    });
  }, [slug]);

  const [allProducts, setAllProducts] = useState<any[]>([]);
  useEffect(() => { api.getProducts().then(p => setAllProducts(Array.isArray(p)?p:[])); }, []);

  if (loading) return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>
  );
  if (!product) return (
    <div style={{ textAlign:'center', padding:'80px 24px', fontFamily:theme.fontFamily }}>
      <div style={{ fontSize:64 }}>😢</div>
      <h2 style={{ color:theme.textColor }}>Product not found</h2>
      <button onClick={()=>navigate('/products')} style={{ background:theme.primaryColor, color:'white', border:'none', cursor:'pointer', padding:'12px 28px', borderRadius:24, marginTop:16, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>Back to Shop</button>
    </div>
  );

  const related = allProducts.filter((p:any) => product && p.category === product.category && p.id !== product.id).slice(0, 4);
  const p = theme.primaryColor;

  // Determine product type from boolean fields (prefer is_physical/is_digital, fallback to type string)
  const isDigital = product.is_digital === true || (product.is_digital === null && (product.type === 'digital' || product.type === 'both'));
  const isPhysical = product.is_physical === true || (product.is_physical === null && (product.type === 'physical' || product.type === 'both'));

  const variants = (product.variants || []).filter((v:any) => v.enabled !== false);
  const hasVariants = variants.length > 0;

  // Price: use selected variant price if variant selected, else product base price
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const originalPrice = product.original_price || product.originalPrice;
  const discount = originalPrice ? Math.round((1 - displayPrice / originalPrice) * 100) : null;

  const cartKey = product.id + (selectedVariant?.id || '');
  const inCart = items.some(i => (i.id + (i.variant?.id || '')) === cartKey);

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      setVariantError('Please select an option first.');
      return;
    }
    setVariantError('');
    add({
      id: product.id,
      title: product.title,
      price: displayPrice,
      image: product.image,
      artist: product.artistName || product.artist_name || product.artist || '',
      slug: product.slug,
      type: isPhysical && !isDigital ? 'physical' : 'digital',
      variant: selectedVariant || undefined,
    });
  };

  const reviews = [
    { author:'Sophie M.', rating:5, text:'Absolutely stunning! The detail in each page is incredible. Spent a whole weekend coloring this one! 🌸', date:'2 days ago', avatar:'🌸' },
    { author:'Emma K.', rating:5, text:'My daughter and I love doing these together. The difficulty is perfect for both of us!', date:'1 week ago', avatar:'🎨' },
    { author:'Lily R.', rating:4, text:'Beautiful designs, great value. Some pages are really intricate but so rewarding!', date:'2 weeks ago', avatar:'✨' },
  ];

  return (
    <div style={{ fontFamily:theme.fontFamily, background:theme.bgColor, maxWidth:'100vw', overflowX:'hidden' }}>
      <style>{`
        @media (max-width: 680px) {
          .product-grid { grid-template-columns: 1fr !important; }
          .product-image-col { min-height: 260px !important; }
          .product-info-col { padding: 20px !important; }
          .product-title { font-size: 22px !important; }
          .product-price { font-size: 28px !important; }
          .product-tabs { overflow-x: auto; }
          .product-tab-btn { padding: 14px 18px !important; font-size: 13px !important; }
          .product-details-grid { grid-template-columns: 1fr !important; }
          .related-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important; }
        }
      `}</style>
      {/* Breadcrumb */}
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'16px 24px' }}>
        <span style={{ color:theme.textColor+'66', fontSize:14 }}>
          <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontFamily:theme.fontFamily }}>Home</button>
          {' > '}
          <button onClick={()=>navigate('/products')} style={{ background:'none', border:'none', cursor:'pointer', color:'inherit', fontFamily:theme.fontFamily }}>Shop</button>
          {' > '}<strong style={{ color:theme.textColor }}>{product.title}</strong>
        </span>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 48px' }}>
        <div className="product-grid" style={{ background:'white', borderRadius:24, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)', display:'grid', gridTemplateColumns:'clamp(280px, 45%, 600px) 1fr', gap:0 }}>

          {/* Left: Image */}
          <div className="product-image-col" style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, display:'flex', alignItems:'center', justifyContent:'center', minHeight:280, fontSize:100, position:'relative', overflow:'hidden', padding:product.cover_image_url?0:32 }}>
            {product.cover_image_url
              ? <img src={product.cover_image_url} alt={product.title} style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:280 }} />
              : <span>{product.image}</span>
            }
            {!!discount && discount > 0 && (
              <div style={{ position:'absolute', top:24, right:24, background:theme.accentColor, color:'white', borderRadius:'50%', width:60, height:60, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800 }}>-{discount}%</div>
            )}
          </div>

          {/* Right: Info */}
          <div className="product-info-col" style={{ padding:'24px 24px 32px' }}>
            <div style={{ fontSize:13, color:p, fontWeight:700, marginBottom:8 }}>
              {product.artistName || product.artist_name || product.artist} · {product.category}
            </div>
            <h1 style={{ fontSize:'clamp(22px, 3vw, 32px)', fontWeight:900, color:theme.textColor, margin:'0 0 12px', lineHeight:1.2 }}>
              {product.title}
            </h1>

            {/* Rating */}
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ display:'flex', gap:2 }}>
                {'★★★★★'.split('').map((_,i)=>(
                  <span key={i} style={{ color:i<Math.round(product.rating||0)?'#f59e0b':'#e5e7eb', fontSize:18 }}>★</span>
                ))}
              </div>
              <span style={{ fontWeight:700, color:theme.textColor }}>{product.rating||0}</span>
              <span style={{ color:'#888', fontSize:14 }}>({product.reviews||0} reviews)</span>
            </div>

            {/* Type badges — from database, not hardcoded */}
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' as const }}>
              {isDigital && (
                <span style={{ background:'#dbeafe', color:'#1d4ed8', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700 }}>⬇️ Digital file</span>
              )}
              {isPhysical && (
                <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700 }}>📦 Physical book</span>
              )}
              {product.pages > 0 && (
                <span style={{ background:p+'12', color:p, borderRadius:20, padding:'5px 14px', fontSize:12, fontWeight:700 }}>📄 {product.pages} pages</span>
              )}
            </div>

            {/* Price */}
            <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:20 }}>
              <span style={{ fontSize:'clamp(28px, 4vw, 40px)', fontWeight:900, color:theme.textColor }}>${displayPrice}</span>
              {originalPrice && (
                <span style={{ fontSize:20, color:'#aaa', textDecoration:'line-through' }}>${originalPrice}</span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p style={{ color:theme.textColor+'cc', fontSize:15, lineHeight:1.7, marginBottom:20 }}>
                {product.description}
              </p>
            )}

            {/* Variants selector */}
            {hasVariants && (
              <div style={{ marginBottom:20 }}>
                <label style={{ display:'block', fontSize:13, fontWeight:700, color:theme.textColor, marginBottom:10 }}>
                  เลือกรูปแบบ / Select Option:
                </label>
                <div style={{ display:'flex', flexDirection:'column' as const, gap:8 }}>
                  {variants.map((v:any) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(v); setVariantError(''); }}
                      style={{
                        padding:'12px 16px', borderRadius:14, cursor:'pointer', textAlign:'left' as const,
                        border:`2px solid ${selectedVariant?.id===v.id ? p : '#e5e7eb'}`,
                        background:selectedVariant?.id===v.id ? p+'10' : 'white',
                        fontFamily:theme.fontFamily, transition:'all 0.15s',
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                      }}
                    >
                      <span style={{ fontSize:14, fontWeight:selectedVariant?.id===v.id?700:600, color:theme.textColor }}>
                        {selectedVariant?.id===v.id ? '✓ ' : ''}{v.name}
                      </span>
                      <span style={{ fontSize:15, fontWeight:800, color:p }}>${v.price}</span>
                    </button>
                  ))}
                </div>
                {variantError && (
                  <div style={{ marginTop:8, fontSize:13, color:'#ef4444', fontWeight:600 }}>⚠️ {variantError}</div>
                )}
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' as const }}>
                {product.tags.map((t:string) => (
                  <span key={t} style={{ background:p+'15', color:p, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:600 }}>#{t}</span>
                ))}
              </div>
            )}

            {/* Add to Cart */}
            <div style={{ display:'flex', gap:12 }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex:1, padding:'16px', borderRadius:24,
                  background:inCart?'#e5e7eb':p, color:inCart?'#888':'white',
                  border:'none', cursor:inCart?'default':'pointer',
                  fontSize:17, fontWeight:800, fontFamily:theme.fontFamily,
                  boxShadow:inCart?'none':`0 8px 24px ${p}44`, transition:'all 0.2s',
                }}
              >
                {inCart ? '✓ Added to Cart!' : '🛒 Add to Cart'}
              </button>
              {inCart && (
                <button onClick={()=>navigate('/cart')} style={{ padding:'16px 24px', borderRadius:24, background:'transparent', border:`2px solid ${p}`, color:p, cursor:'pointer', fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>
                  View Cart →
                </button>
              )}
            </div>

            {/* Shipping note for physical */}
            {isPhysical && product.shipping_note && (
              <div style={{ marginTop:12, fontSize:12, color:'#6b7280', background:'#f9fafb', borderRadius:10, padding:'8px 12px' }}>
                📦 {product.shipping_note}
              </div>
            )}
          </div>
        </div>

        {/* Details / Reviews tabs */}
        <div style={{ background:'white', borderRadius:24, marginTop:24, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
          <div className="product-tabs" style={{ display:'flex', borderBottom:`2px solid ${p}15` }}>
            {(['details','reviews'] as const).map(tab => (
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{
                padding:'18px 32px', border:'none', cursor:'pointer', whiteSpace:'nowrap' as const,
                background:activeTab===tab?p+'10':'transparent',
                color:activeTab===tab?p:theme.textColor+'88',
                fontWeight:activeTab===tab?800:600, fontSize:15,
                borderBottom:activeTab===tab?`3px solid ${p}`:'3px solid transparent',
                fontFamily:theme.fontFamily,
              }}>
                {tab==='details' ? '📋 Details' : `⭐ Reviews (${product.reviews||0})`}
              </button>
            ))}
          </div>
          <div style={{ padding:32 }}>
            {activeTab==='details' ? (
              <div>
                {/* Rich description blocks if present */}
                {product.rich_description && Array.isArray(product.rich_description) && product.rich_description.length > 0 ? (
                  <RichDescRenderer blocks={product.rich_description} />
                ) : product.description ? (
                  <p style={{ fontSize:15, lineHeight:1.8, color:theme.textColor+'cc', margin:0 }}>{product.description}</p>
                ) : (
                  <p style={{ color:'#9ca3af', fontStyle:'italic' }}>No additional details.</p>
                )}

                {/* Real specs from database only */}
                {(product.pages > 0 || isDigital || isPhysical) && (
                  <div className="product-details-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:24, padding:'20px', background:'#f9fafb', borderRadius:14 }}>
                    {product.pages > 0 && (
                      <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${p}15`, paddingBottom:10 }}>
                        <span style={{ color:theme.textColor+'88', fontWeight:600, fontSize:14 }}>Pages</span>
                        <span style={{ color:theme.textColor, fontWeight:700, fontSize:14 }}>{product.pages}</span>
                      </div>
                    )}
                    {isDigital && (
                      <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${p}15`, paddingBottom:10 }}>
                        <span style={{ color:theme.textColor+'88', fontWeight:600, fontSize:14 }}>Type</span>
                        <span style={{ color:theme.textColor, fontWeight:700, fontSize:14 }}>Digital download</span>
                      </div>
                    )}
                    {isPhysical && (
                      <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${p}15`, paddingBottom:10 }}>
                        <span style={{ color:theme.textColor+'88', fontWeight:600, fontSize:14 }}>Format</span>
                        <span style={{ color:theme.textColor, fontWeight:700, fontSize:14 }}>Physical book</span>
                      </div>
                    )}
                    {product.category && (
                      <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`1px solid ${p}15`, paddingBottom:10 }}>
                        <span style={{ color:theme.textColor+'88', fontWeight:600, fontSize:14 }}>Category</span>
                        <span style={{ color:theme.textColor, fontWeight:700, fontSize:14 }}>{product.category}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column' as const, gap:20 }}>
                {reviews.map((r,i) => (
                  <div key={i} style={{ borderBottom:`1px solid ${p}10`, paddingBottom:20 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                      <span style={{ fontSize:32 }}>{r.avatar}</span>
                      <div>
                        <div style={{ fontWeight:800, color:theme.textColor, fontSize:15 }}>{r.author}</div>
                        <div style={{ color:'#f59e0b', fontSize:14 }}>{'★'.repeat(r.rating)}</div>
                      </div>
                      <span style={{ marginLeft:'auto', fontSize:12, color:'#aaa' }}>{r.date}</span>
                    </div>
                    <p style={{ color:theme.textColor+'cc', fontSize:14, lineHeight:1.6, margin:0 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop:48 }}>
            <h2 style={{ fontSize:28, fontWeight:900, color:theme.textColor, marginBottom:24 }}>You Might Also Like 💕</h2>
            <div className="related-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20 }}>
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
