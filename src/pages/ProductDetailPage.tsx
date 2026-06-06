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
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    api.getProduct(slug).then(p => {
      if (!p.error) {
        setProduct(p);
        const vs = (p.variants || []).filter((v:any) => v.enabled !== false);
        if (vs.length === 1) setSelectedVariant(vs[0]);
      }
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    api.getProducts().then(p => setAllProducts(Array.isArray(p) ? p : []));
  }, []);

  if (loading) return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>
  );
  if (!product) return (
    <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
      <div style={{fontSize:64}}>😢</div>
      <h2 style={{color:theme.textColor}}>Product not found</h2>
      <button onClick={()=>navigate('/products')} style={{background:theme.primaryColor,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:24,marginTop:16,fontSize:15,fontWeight:700,fontFamily:theme.fontFamily}}>Back to Shop</button>
    </div>
  );

  const p = theme.primaryColor;
  const related = allProducts.filter((x:any) => x.category === product.category && x.id !== product.id).slice(0,4);

  // Product type — prefer boolean fields, fallback to type string
  const isDigital = product.is_digital === true || (product.is_digital == null && (product.type === 'digital' || product.type === 'both'));
  const isPhysical = product.is_physical === true || (product.is_physical == null && (product.type === 'physical' || product.type === 'both'));

  const variants = (product.variants || []).filter((v:any) => v.enabled !== false);
  const hasVariants = variants.length > 0;
  const displayPrice = selectedVariant ? Number(selectedVariant.price) : product.price;
  const originalPrice = product.original_price || product.originalPrice;
  const discount = (originalPrice && originalPrice > displayPrice) ? Math.round((1 - displayPrice / originalPrice) * 100) : null;
  const cartKey = product.id + (selectedVariant?.id || '');
  const inCart = items.some(i => (i.id + (i.variant?.id || '')) === cartKey);

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) { setVariantError('กรุณาเลือกรูปแบบก่อน / Please select an option.'); return; }
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
    { author:'Sophie M.', rating:5, text:'Absolutely stunning! The detail in each page is incredible. 🌸', date:'2 days ago', avatar:'🌸' },
    { author:'Emma K.', rating:5, text:'My daughter and I love doing these together!', date:'1 week ago', avatar:'🎨' },
    { author:'Lily R.', rating:4, text:'Beautiful designs, great value.', date:'2 weeks ago', avatar:'✨' },
  ];

  return (
    <div style={{fontFamily:theme.fontFamily, background:theme.bgColor, maxWidth:'100vw', overflowX:'hidden'}}>
      <style>{`
        .pd-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .pd-img { min-height: 360px; }
        .pd-info { padding: 32px 36px; }
        .pd-title { font-size: 28px; }
        .pd-price { font-size: 36px; }
        .pd-tabs-row { display: flex; }
        .pd-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .pd-related { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
        @media (max-width: 700px) {
          .pd-grid { grid-template-columns: 1fr !important; }
          .pd-img { min-height: 280px !important; max-height: 340px !important; }
          .pd-info { padding: 20px 18px 28px !important; }
          .pd-title { font-size: 20px !important; }
          .pd-price { font-size: 28px !important; }
          .pd-tabs-row { overflow-x: auto !important; }
          .pd-details-grid { grid-template-columns: 1fr !important; }
          .pd-related { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .pd-cart-btn { font-size: 15px !important; padding: 13px !important; }
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'14px 16px'}}>
        <span style={{color:theme.textColor+'66',fontSize:13}}>
          <button onClick={()=>navigate('/')} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontFamily:theme.fontFamily,fontSize:13}}>Home</button>
          {' > '}
          <button onClick={()=>navigate('/products')} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontFamily:theme.fontFamily,fontSize:13}}>Shop</button>
          {' > '}<strong style={{color:theme.textColor}}>{product.title}</strong>
        </span>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 16px 48px'}}>

        {/* Main card */}
        <div className="pd-grid" style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>

          {/* Image */}
          <div className="pd-img" style={{background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:100,position:'relative',overflow:'hidden',padding:product.cover_image_url?'0':'32px'}}>
            {product.cover_image_url
              ? <img src={product.cover_image_url} alt={product.title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
              : <span>{product.image}</span>
            }
            {discount && discount > 0 && (
              <div style={{position:'absolute',top:16,right:16,background:theme.accentColor,color:'white',borderRadius:'50%',width:52,height:52,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800}}>-{discount}%</div>
            )}
          </div>

          {/* Info */}
          <div className="pd-info">
            <div style={{fontSize:12,color:p,fontWeight:700,marginBottom:8}}>
              {product.artistName||product.artist_name||product.artist} · {product.category}
            </div>

            <h1 className="pd-title" style={{fontWeight:900,color:theme.textColor,margin:'0 0 12px',lineHeight:1.25}}>
              {product.title}
            </h1>

            {/* Rating */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <span style={{color:'#f59e0b',fontSize:14}}>{'★'.repeat(Math.min(5,Math.round(product.rating||0)))}</span>
              <span style={{fontWeight:700,color:theme.textColor,fontSize:13}}>{product.rating||0}</span>
              <span style={{color:'#888',fontSize:12}}>({product.reviews||0})</span>
            </div>

            {/* Type badges — DB only, no hardcoded text */}
            <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' as const}}>
              {isDigital && <span style={{background:'#dbeafe',color:'#1d4ed8',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>⬇️ Digital file</span>}
              {isPhysical && <span style={{background:'#d1fae5',color:'#065f46',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>📦 Physical book</span>}
              {product.pages > 0 && <span style={{background:p+'12',color:p,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>📄 {product.pages} pages</span>}
            </div>

            {/* Price */}
            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:16}}>
              <span className="pd-price" style={{fontWeight:900,color:theme.textColor}}>${displayPrice}</span>
              {originalPrice && originalPrice > displayPrice && (
                <span style={{fontSize:16,color:'#aaa',textDecoration:'line-through'}}>${originalPrice}</span>
              )}
            </div>

            {/* Short description */}
            {product.description && (
              <p style={{color:theme.textColor+'cc',fontSize:14,lineHeight:1.7,marginBottom:18}}>{product.description}</p>
            )}

            {/* Variant selector */}
            {hasVariants && (
              <div style={{marginBottom:18}}>
                <div style={{fontSize:13,fontWeight:700,color:theme.textColor,marginBottom:10}}>
                  เลือกรูปแบบ / Select Option:
                </div>
                <div style={{display:'flex',flexDirection:'column' as const,gap:8}}>
                  {variants.map((v:any) => (
                    <button key={v.id} onClick={()=>{setSelectedVariant(v);setVariantError('');}}
                      style={{padding:'11px 14px',borderRadius:12,cursor:'pointer',textAlign:'left' as const,border:`2px solid ${selectedVariant?.id===v.id?p:'#e5e7eb'}`,background:selectedVariant?.id===v.id?p+'10':'white',fontFamily:theme.fontFamily,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all 0.12s'}}>
                      <span style={{fontSize:14,fontWeight:selectedVariant?.id===v.id?700:500,color:theme.textColor}}>
                        {selectedVariant?.id===v.id?'✓ ':''}{v.name}
                      </span>
                      <span style={{fontSize:15,fontWeight:800,color:p}}>${v.price}</span>
                    </button>
                  ))}
                </div>
                {variantError && <div style={{marginTop:6,fontSize:12,color:'#ef4444',fontWeight:600}}>⚠️ {variantError}</div>}
              </div>
            )}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap' as const}}>
                {product.tags.map((t:string) => (
                  <span key={t} style={{background:p+'12',color:p,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>#{t}</span>
                ))}
              </div>
            )}

            {/* Cart button */}
            <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
              <button className="pd-cart-btn" onClick={handleAddToCart}
                style={{flex:1,minWidth:140,padding:'14px',borderRadius:22,background:inCart?'#e5e7eb':p,color:inCart?'#888':'white',border:'none',cursor:inCart?'default':'pointer',fontSize:16,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:inCart?'none':`0 6px 20px ${p}40`,transition:'all 0.2s'}}>
                {inCart ? '✓ Added!' : '🛒 Add to Cart'}
              </button>
              {inCart && (
                <button onClick={()=>navigate('/cart')} style={{padding:'14px 20px',borderRadius:22,background:'transparent',border:`2px solid ${p}`,color:p,cursor:'pointer',fontSize:14,fontWeight:700,fontFamily:theme.fontFamily}}>
                  View Cart →
                </button>
              )}
            </div>

            {/* Shipping note */}
            {isPhysical && product.shipping_note && (
              <div style={{marginTop:10,fontSize:12,color:'#6b7280',background:'#f9fafb',borderRadius:10,padding:'7px 11px'}}>📦 {product.shipping_note}</div>
            )}
          </div>
        </div>

        {/* Details / Reviews */}
        <div style={{background:'white',borderRadius:20,marginTop:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <div className="pd-tabs-row" style={{borderBottom:`2px solid ${p}15`}}>
            {(['details','reviews'] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:'16px 28px',border:'none',cursor:'pointer',background:activeTab===tab?p+'10':'transparent',color:activeTab===tab?p:theme.textColor+'88',fontWeight:activeTab===tab?800:600,fontSize:14,borderBottom:activeTab===tab?`3px solid ${p}`:'3px solid transparent',fontFamily:theme.fontFamily,whiteSpace:'nowrap' as const}}>
                {tab==='details'?'📋 Details':`⭐ Reviews (${product.reviews||0})`}
              </button>
            ))}
          </div>
          <div style={{padding:'24px 20px'}}>
            {activeTab==='details' ? (
              <div>
                {product.rich_description && Array.isArray(product.rich_description) && product.rich_description.length > 0
                  ? <RichDescRenderer blocks={product.rich_description} />
                  : product.description
                    ? <p style={{fontSize:14,lineHeight:1.8,color:theme.textColor+'cc',margin:0}}>{product.description}</p>
                    : <p style={{color:'#9ca3af',fontStyle:'italic'}}>No additional details.</p>
                }
                {/* Specs from DB only */}
                <div className="pd-details-grid" style={{marginTop:20,padding:16,background:'#f9fafb',borderRadius:12}}>
                  {product.pages > 0 && (
                    <div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}>
                      <span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>Pages</span>
                      <span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>{product.pages}</span>
                    </div>
                  )}
                  {isDigital && (
                    <div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}>
                      <span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>Type</span>
                      <span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>Digital download</span>
                    </div>
                  )}
                  {isPhysical && (
                    <div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}>
                      <span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>Format</span>
                      <span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>Physical book</span>
                    </div>
                  )}
                  {product.category && (
                    <div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}>
                      <span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>Category</span>
                      <span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>{product.category}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column' as const,gap:18}}>
                {reviews.map((r,i)=>(
                  <div key={i} style={{borderBottom:`1px solid ${p}10`,paddingBottom:18}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{fontSize:28}}>{r.avatar}</span>
                      <div>
                        <div style={{fontWeight:800,color:theme.textColor,fontSize:14}}>{r.author}</div>
                        <div style={{color:'#f59e0b',fontSize:12}}>{'★'.repeat(r.rating)}</div>
                      </div>
                      <span style={{marginLeft:'auto',fontSize:11,color:'#aaa'}}>{r.date}</span>
                    </div>
                    <p style={{color:theme.textColor+'cc',fontSize:13,lineHeight:1.6,margin:0}}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{marginTop:40}}>
            <h2 style={{fontSize:24,fontWeight:900,color:theme.textColor,marginBottom:20}}>You Might Also Like 💕</h2>
            <div className="pd-related">
              {related.map((x:any) => <ProductCard key={x.id} product={x} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
