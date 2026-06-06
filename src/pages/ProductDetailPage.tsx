import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import ProductCard from '../components/ProductCard';
import { RichDescRenderer } from '../components/RichDescEditor';
import { useLang } from '../lib/lang';

export default function ProductDetailPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { add, items } = useCart();
  const { navigate } = useRouter();
  const { lang, t, tRaw, price: fmtPrice } = useLang();
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
        const vs = (p.variants||[]).filter((v:any)=>v.enabled!==false);
        if (vs.length===1) setSelectedVariant(vs[0]);
      }
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => { api.getProducts().then(p=>setAllProducts(Array.isArray(p)?p:[])); }, []);

  if (loading) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>;
  if (!product) return (
    <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
      <div style={{fontSize:64}}>😢</div>
      <h2 style={{color:theme.textColor}}>{tRaw('ไม่พบสินค้า','Product not found')}</h2>
      <button onClick={()=>navigate('/products')} style={{background:theme.primaryColor,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:24,marginTop:16,fontSize:15,fontWeight:700,fontFamily:theme.fontFamily}}>{t('back_to_shop','Back to Shop')}</button>
    </div>
  );

  const p = theme.primaryColor;
  const related = allProducts.filter((x:any)=>x.category===product.category&&x.id!==product.id).slice(0,4);
  const isDigital = product.is_digital===true||(product.is_digital==null&&(product.type==='digital'||product.type==='both'));
  const isPhysical = product.is_physical===true||(product.is_physical==null&&(product.type==='physical'||product.type==='both'));
  const variants = (product.variants||[]).filter((v:any)=>v.enabled!==false);
  const hasVariants = variants.length>0;
  const basePrice = selectedVariant ? (Number(selectedVariant.price_thb||selectedVariant.price||0)) : product.price;
  const baseUSD = selectedVariant ? (Number(selectedVariant.price_usd||selectedVariant.price||0)) : product.price;
  const displayPrice = fmtPrice(selectedVariant ? selectedVariant.price_thb : product.price_thb, selectedVariant ? selectedVariant.price_usd : product.price_usd, basePrice);
  const originalPrice = product.original_price||product.originalPrice;
  const cartKey = product.id+(selectedVariant?.id||'');
  const inCart = items.some(i=>(i.id+(( i as any).variant?.id||''))===cartKey);
  const title = (lang==='th'&&product.title_th)?product.title_th:product.title;
  const description = (lang==='th'&&product.description_th)?product.description_th:product.description;

  const handleAddToCart = () => {
    if (hasVariants&&!selectedVariant){setVariantError(tRaw('กรุณาเลือกรูปแบบก่อน','Please select an option.')); return;}
    setVariantError('');
    add({
      id: product.id,
      title,
      price: baseUSD || basePrice,
      price_thb: selectedVariant ? (selectedVariant.price_thb || Math.round((selectedVariant.price_usd || selectedVariant.price || 0) * 35)) : (product.price_thb || Math.round(product.price * 35)),
      price_usd: selectedVariant ? (selectedVariant.price_usd || selectedVariant.price) : (product.price_usd || product.price),
      image: product.image,
      artist: product.artistName || product.artist_name || product.artist || '',
      slug: product.slug,
      type: isPhysical && !isDigital ? 'physical' : isDigital && !isPhysical ? 'digital' : product.type || 'digital',
      variant: selectedVariant ? {
        id: selectedVariant.id,
        name: selectedVariant.name,
        price_thb: selectedVariant.price_thb || Math.round((selectedVariant.price_usd || selectedVariant.price || 0) * 35),
        price_usd: selectedVariant.price_usd || selectedVariant.price,
        price: selectedVariant.price,
      } : undefined,
    } as any);
  };

  return (
    <div style={{fontFamily:theme.fontFamily,background:theme.bgColor,maxWidth:'100vw',overflowX:'hidden'}}>
      <style>{`
        .pd-wrap{max-width:100%;overflow-x:hidden;}
        .pd-grid{display:flex;flex-direction:row;}
        .pd-img{width:50%;min-height:400px;flex-shrink:0;}
        .pd-info{flex:1;padding:36px 40px;}
        .pd-title{font-size:26px;}
        .pd-price{font-size:34px;}
        .pd-tabs-row{display:flex;overflow-x:auto;-webkit-overflow-scrolling:touch;}
        .pd-related{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:16px;}
        @media(max-width:768px){
          .pd-grid{flex-direction:column!important;}
          .pd-img{width:100%!important;min-height:0!important;height:auto!important;max-height:360px!important;aspect-ratio:1/1;}
          .pd-img img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}
          .pd-img-emoji{font-size:80px!important;padding:40px 0!important;}
          .pd-info{padding:20px 16px 28px!important;}
          .pd-title{font-size:20px!important;}
          .pd-price{font-size:26px!important;}
          .pd-related{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}
          .pd-cart-row{flex-wrap:wrap!important;}
          .pd-cart-btn{font-size:14px!important;padding:13px!important;}
          .pd-outer{padding:0 10px 32px!important;}
          .pd-breadcrumb{padding:10px 12px!important;font-size:12px!important;}
        }
      `}</style>

      <div className="pd-breadcrumb" style={{maxWidth:1200,margin:'0 auto',padding:'12px 16px'}}>
        <span style={{color:theme.textColor+'66',fontSize:13}}>
          <button onClick={()=>navigate('/')} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontFamily:theme.fontFamily,fontSize:13}}>Home</button>
          {' > '}
          <button onClick={()=>navigate('/products')} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontFamily:theme.fontFamily,fontSize:13}}>{t('shop')}</button>
          {' > '}<strong style={{color:theme.textColor}}>{title}</strong>
        </span>
      </div>

      <div className="pd-outer" style={{maxWidth:1200,margin:'0 auto',padding:'0 16px 48px'}}>
        <div className="pd-grid" style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>

          {/* Image */}
          <div className="pd-img" style={{background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
            {product.cover_image_url
              ? <img src={product.cover_image_url} alt={title} style={{width:'100%',height:'100%',objectFit:'cover',display:'block',position:'absolute',inset:0}} />
              : <span className="pd-img-emoji" style={{fontSize:100}}>{product.image}</span>
            }
            {originalPrice&&originalPrice>basePrice&&(
              <div style={{position:'absolute',top:12,right:12,background:theme.accentColor,color:'white',borderRadius:'50%',width:48,height:48,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800}}>
                -{Math.round((1-basePrice/originalPrice)*100)}%
              </div>
            )}
          </div>

          {/* Info */}
          <div className="pd-info">
            <div style={{fontSize:12,color:p,fontWeight:700,marginBottom:8}}>{product.artistName||product.artist_name||product.artist} · {product.category}</div>
            <h1 className="pd-title" style={{fontWeight:900,color:theme.textColor,margin:'0 0 10px',lineHeight:1.25}}>{title}</h1>

            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
              <span style={{color:'#f59e0b',fontSize:13}}>{'★'.repeat(Math.min(5,Math.round(product.rating||0)))}</span>
              <span style={{fontWeight:700,color:theme.textColor,fontSize:12}}>{product.rating||0}</span>
              <span style={{color:'#888',fontSize:11}}>({product.reviews||0})</span>
            </div>

            {/* Type badges from DB */}
            <div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap' as const}}>
              {isDigital&&<span style={{background:'#dbeafe',color:'#1d4ed8',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>⬇️ {t('digital')}</span>}
              {isPhysical&&<span style={{background:'#d1fae5',color:'#065f46',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>📦 {t('physical')}</span>}
              {product.pages>0&&<span style={{background:p+'12',color:p,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>📄 {product.pages} {t('pages','pages')}</span>}
            </div>

            <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:16}}>
              <span className="pd-price" style={{fontWeight:900,color:theme.textColor}}>{displayPrice}</span>
              {originalPrice&&originalPrice>basePrice&&<span style={{fontSize:15,color:'#aaa',textDecoration:'line-through'}}>{fmtPrice(null,null,originalPrice)}</span>}
            </div>

            {description&&<p style={{color:theme.textColor+'cc',fontSize:14,lineHeight:1.7,marginBottom:16}}>{description}</p>}

            {/* Variant selector */}
            {hasVariants&&(
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:13,fontWeight:700,color:theme.textColor,marginBottom:6}}>{t('select_option')}:</label>
                <select
                  value={selectedVariant?.id||''}
                  onChange={e=>{
                    const v=variants.find((v:any)=>v.id===e.target.value);
                    setSelectedVariant(v||null);
                    setVariantError('');
                  }}
                  style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`2px solid ${selectedVariant?p:'#e5e7eb'}`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,background:'white',cursor:'pointer',appearance:'auto'}}
                >
                  <option value="">{tRaw('-- เลือกรูปแบบ --','-- Select option --')}</option>
                  {variants.map((v:any)=>(
                    <option key={v.id} value={v.id}>{v.name} — {fmtPrice(v.price_thb||null,v.price_usd||null,v.price_thb||v.price_usd||v.price)}</option>
                  ))}
                </select>
                {variantError&&<div style={{marginTop:6,fontSize:12,color:'#ef4444',fontWeight:600}}>⚠️ {variantError}</div>}
              </div>
            )}

            {product.tags?.length>0&&(
              <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' as const}}>
                {product.tags.map((tg:string)=><span key={tg} style={{background:p+'12',color:p,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>#{tg}</span>)}
              </div>
            )}

            <div className="pd-cart-row" style={{display:'flex',gap:10}}>
              <button className="pd-cart-btn" onClick={handleAddToCart}
                style={{flex:1,padding:'14px',borderRadius:20,background:inCart?'#e5e7eb':p,color:inCart?'#888':'white',border:'none',cursor:inCart?'default':'pointer',fontSize:15,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:inCart?'none':`0 6px 20px ${p}40`}}>
                {inCart?t('in_cart'):t('add_to_cart')}
              </button>
              {inCart&&<button onClick={()=>navigate('/cart')} style={{padding:'14px 18px',borderRadius:20,background:'transparent',border:`2px solid ${p}`,color:p,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:theme.fontFamily}}>{t('cart')} →</button>}
            </div>

            {isPhysical&&product.shipping_note&&<div style={{marginTop:10,fontSize:12,color:'#6b7280',background:'#f9fafb',borderRadius:10,padding:'7px 11px'}}>📦 {product.shipping_note}</div>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{background:'white',borderRadius:20,marginTop:16,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <div className="pd-tabs-row" style={{borderBottom:`2px solid ${p}15`}}>
            {(['details','reviews'] as const).map(tab=>(
              <button key={tab} onClick={()=>setActiveTab(tab)} style={{padding:'14px 24px',border:'none',cursor:'pointer',background:activeTab===tab?p+'10':'transparent',color:activeTab===tab?p:theme.textColor+'88',fontWeight:activeTab===tab?800:600,fontSize:13,borderBottom:activeTab===tab?`3px solid ${p}`:'3px solid transparent',fontFamily:theme.fontFamily,whiteSpace:'nowrap' as const}}>
                {tab==='details'?tRaw('📋 รายละเอียด','📋 Details'):`⭐ ${tRaw('รีวิว','Reviews')} (${product.reviews||0})`}
              </button>
            ))}
          </div>
          <div style={{padding:'20px 18px'}}>
            {activeTab==='details'?(
              <div>
                {product.rich_description&&Array.isArray(product.rich_description)&&product.rich_description.length>0
                  ?<RichDescRenderer blocks={product.rich_description}/>
                  :description?<p style={{fontSize:14,lineHeight:1.8,color:theme.textColor+'cc',margin:0}}>{description}</p>
                  :<p style={{color:'#9ca3af',fontStyle:'italic'}}>{tRaw('ไม่มีรายละเอียดเพิ่มเติม','No additional details.')}</p>
                }
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginTop:18,padding:14,background:'#f9fafb',borderRadius:12}}>
                  {product.pages>0&&<div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}><span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>{tRaw('จำนวนหน้า','Pages')}</span><span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>{product.pages}</span></div>}
                  {isDigital&&<div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}><span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>{tRaw('รูปแบบ','Type')}</span><span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>{t('digital')}</span></div>}
                  {isPhysical&&<div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}><span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>{tRaw('รูปแบบ','Format')}</span><span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>{t('physical')}</span></div>}
                  {product.category&&<div style={{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${p}15`,paddingBottom:8}}><span style={{color:theme.textColor+'88',fontWeight:600,fontSize:13}}>{tRaw('หมวดหมู่','Category')}</span><span style={{color:theme.textColor,fontWeight:700,fontSize:13}}>{product.category}</span></div>}
                </div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column' as const,gap:16}}>
                {[{author:'Sophie M.',rating:5,text:tRaw('สวยมากเลย! ชอบมากค่ะ 🌸','Absolutely stunning! Love it! 🌸'),date:tRaw('2 วันที่แล้ว','2 days ago'),avatar:'🌸'},
                  {author:'Emma K.',rating:5,text:tRaw('ทำร่วมกับลูกสาวได้เลย ระดับดีมาก','Great with my daughter!'),date:tRaw('1 สัปดาห์','1 week ago'),avatar:'🎨'},
                  {author:'Lily R.',rating:4,text:tRaw('ดีไซน์สวย คุ้มค่ามากๆ','Beautiful designs, great value.'),date:tRaw('2 สัปดาห์','2 weeks ago'),avatar:'✨'},
                ].map((r,i)=>(
                  <div key={i} style={{borderBottom:`1px solid ${p}10`,paddingBottom:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                      <span style={{fontSize:26}}>{r.avatar}</span>
                      <div><div style={{fontWeight:800,color:theme.textColor,fontSize:14}}>{r.author}</div><div style={{color:'#f59e0b',fontSize:12}}>{'★'.repeat(r.rating)}</div></div>
                      <span style={{marginLeft:'auto',fontSize:11,color:'#aaa'}}>{r.date}</span>
                    </div>
                    <p style={{color:theme.textColor+'cc',fontSize:13,lineHeight:1.6,margin:0}}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {related.length>0&&(
          <div style={{marginTop:36}}>
            <h2 style={{fontSize:22,fontWeight:900,color:theme.textColor,marginBottom:18}}>{tRaw('สินค้าที่คุณอาจชอบ 💕','You Might Also Like 💕')}</h2>
            <div className="pd-related">{related.map((x:any)=><ProductCard key={x.id} product={x}/>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
