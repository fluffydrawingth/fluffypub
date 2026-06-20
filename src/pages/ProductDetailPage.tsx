import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import ProductCard from '../components/ProductCard';
import { RichDescRenderer } from '../components/RichDescEditor';
import { useLang } from '../lib/lang';
import { useFavorites } from '../lib/favorites';
import { useAuth } from '../lib/auth';

export default function ProductDetailPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { add, items, increment } = useCart();
  const { navigate } = useRouter();
  const { lang, t, tRaw, price: fmtPrice, currency } = useLang();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<any>(null);
  const [optionError, setOptionError] = useState('');
  const [related, setRelated] = useState<any[]>([]);
  const [artistProducts, setArtistProducts] = useState<any[]>([]);
  const [artistProfile, setArtistProfile] = useState<any>(null);
  const [communityPosts, setCommunityPosts] = useState<any[]>([]);
  const [communityTotal, setCommunityTotal] = useState(0);
  const { isFav, toggle } = useFavorites();
  const { user } = useAuth();

  // "Colored by Community" — finished pages other people shared of this book
  useEffect(() => {
    if (!product?.id) return;
    api.getCommunityByProduct(product.id, 6).then((d: any) => {
      setCommunityPosts(d?.posts || []);
      setCommunityTotal(d?.total || 0);
    }).catch(() => {});
  }, [product?.id]);

  useEffect(() => {
    api.getProduct(slug).then(p => {
      if (p?.error) {
        console.error('[ProductDetailPage] API error:', p.error, 'slug:', slug);
        setLoading(false);
        return;
      }
      setProduct(p);
      setLoading(false);
    }).catch(e => {
      console.error('[ProductDetailPage] fetch error:', e.message, 'slug:', slug);
      setLoading(false);
    });
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const artistSlug = product.artist_slug || product.artistSlug;
    api.getProducts().then((all: any[]) => {
      if (!Array.isArray(all)) return;
      const fromArtist = artistSlug
        ? all.filter(x => (x.artist_slug || x.artistSlug) === artistSlug && x.id !== product.id).slice(0, 4)
        : [];
      setArtistProducts(fromArtist);
      const shownIds = new Set([product.id, ...fromArtist.map((x: any) => x.id)]);
      const recommendations = all
        .filter(x => !shownIds.has(x.id))
        .sort((a, b) => (b.category === product.category ? 1 : 0) - (a.category === product.category ? 1 : 0))
        .slice(0, 4);
      setRelated(recommendations);
    }).catch(() => {});
    if (artistSlug) {
      api.getArtistBySlug(artistSlug).then(a => { if (a && !a.error) setArtistProfile(a); }).catch(() => {});
    } else if (product.artist_id) {
      api.getArtist(product.artist_id).then(a => { if (a && !a.error) setArtistProfile(a); }).catch(() => {});
    }
  }, [product]);

  if (loading) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>;
  if (!product) return (
    <div style={{textAlign:'center',padding:'80px 24px',fontFamily:theme.fontFamily}}>
      <div style={{fontSize:64}}>😢</div>
      <h2 style={{color:theme.textColor}}>{tRaw('ไม่พบสินค้า','Product not found')}</h2>
      <button onClick={()=>navigate('/products')} style={{background:theme.primaryColor,color:'white',border:'none',cursor:'pointer',padding:'12px 28px',borderRadius:24,marginTop:16,fontSize:15,fontWeight:700,fontFamily:theme.fontFamily}}>
        {tRaw('กลับไปช้อป','Back to Shop')}
      </button>
    </div>
  );

  const p = theme.primaryColor;
  const title = (lang === 'th' && product.title_th) ? product.title_th : product.title;
  const description = (lang === 'th' && product.description_th) ? product.description_th : product.description;
  const priceTHB = Number(product.price_thb) || 0;
  const priceUSD = Number(product.price_usd) || null;

  // Build options from product config
  const options: { id: string; name: string; type: 'physical'|'digital'; priceTHB: number; priceUSD: number|null; stock?: number|null; inStock: boolean }[] = [];
  const physicalVariants = (product.variants || []).filter((v: any) => v.enabled !== false);
  physicalVariants.forEach((v: any) => {
    const vTHB = Number(v.price_thb) > 0 ? Number(v.price_thb) : priceTHB;
    const vUSD = Number(v.price_usd) > 0 ? Number(v.price_usd) : priceUSD;
    const stock = v.stock_quantity !== undefined ? Number(v.stock_quantity) : (v.stock !== undefined ? Number(v.stock) : null);
    const inStock = stock === null || stock > 0;
    options.push({ id: v.id, name: v.name, type: 'physical', priceTHB: vTHB, priceUSD: vUSD, stock, inStock });
  });
  if (product.is_digital === true || (product.is_digital == null && (product.type === 'digital' || product.type === 'both'))) {
    const dTHB = Number(product.digital_price_thb || product.price_thb) || priceTHB;
    const dUSD = Number(product.digital_price_usd || product.price_usd) || priceUSD;
    options.push({ id: 'digital', name: tRaw('ไฟล์ดิจิทัล','Digital file'), type: 'digital', priceTHB: dTHB, priceUSD: dUSD, inStock: true });
  }

  const isUSD = currency === 'USD';
  const isPhysicalOnly = options.length > 0 && options.every(o => o.type === 'physical');
  const hasDigital = options.some(o => o.type === 'digital');

  // Display price: selected option or base
  const displayTHB = selectedOption ? selectedOption.priceTHB : priceTHB;
  const displayUSD = selectedOption ? selectedOption.priceUSD : priceUSD;
  const cartKey = `${product.id}::${selectedOption?.id || ''}`;
  const alreadyInCart = selectedOption && items.some(i => `${i.id}::${i.optionId}` === cartKey);

  const handleAddToCart = () => {
    if (isUSD && isPhysicalOnly) {
      setOptionError('Physical products are available in THB only. Please switch to THB to purchase this item.');
      return;
    }
    if (options.length > 1 && !selectedOption) {
      setOptionError(tRaw('กรุณาเลือกรูปแบบก่อน','Please select an option.'));
      return;
    }
    const opt = selectedOption || options[0];
    if (!opt) return;
    if (isUSD && opt.type === 'physical') {
      setOptionError('Physical option is available in THB only. Please select the digital option or switch to THB.');
      return;
    }
    if (opt.priceTHB <= 0) { setOptionError(tRaw('ราคาไม่ถูกต้อง','Price not configured.')); return; }
    if (!opt.inStock) { setOptionError(tRaw('สินค้าหมด','This option is out of stock.')); return; }
    setOptionError('');
    const k = `${product.id}::${opt.id}`;
    if (items.some(i => `${i.id}::${i.optionId}` === k)) {
      increment(product.id, opt.id);
    } else {
      add({ id: product.id, title, image: product.image, coverImageUrl: product.cover_image_url || undefined, artist: product.artistName || product.artist_name || product.artist || '', slug: product.slug, optionId: opt.id, optionName: opt.name, optionType: opt.type, unitPriceTHB: opt.priceTHB, unitPriceUSD: opt.priceUSD });
    }
  };

  const btnInCart = selectedOption ? alreadyInCart : (options.length === 1 && items.some(i => i.id === product.id));

  return (
    <div style={{fontFamily:theme.fontFamily,background:theme.bgColor,maxWidth:'100vw',overflowX:'hidden'}}>
      <style>{`
        .pd-grid{display:flex;}
        .pd-img{width:50%;flex-shrink:0;min-height:400px;}
        .pd-info{flex:1;padding:36px 40px;overflow:hidden;}
        .pd-price{font-size:34px;}
        @media(max-width:768px){
          .pd-grid{flex-direction:column!important;}
          .pd-img{width:100%!important;min-height:280px!important;max-height:320px!important;}
          .pd-info{padding:18px 16px 28px!important;}
          .pd-price{font-size:26px!important;}
        }
      `}</style>

      {/* Breadcrumb */}
      <div style={{maxWidth:1200,margin:'0 auto',padding:'12px 16px',fontSize:13,color:theme.textColor+'66'}}>
        <button onClick={()=>navigate('/')} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontFamily:theme.fontFamily,fontSize:13}}>Home</button>
        {' > '}
        <button onClick={()=>navigate('/products')} style={{background:'none',border:'none',cursor:'pointer',color:'inherit',fontFamily:theme.fontFamily,fontSize:13}}>{t('shop')}</button>
        {' > '}<strong style={{color:theme.textColor}}>{title}</strong>
      </div>

      <div style={{maxWidth:1200,margin:'0 auto',padding:'0 16px 48px'}}>
        {/* Main card */}
        <div className="pd-grid" style={{background:'white',borderRadius:20,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.07)'}}>
          {/* Image */}
          <div className="pd-img" style={{background:`linear-gradient(135deg,${theme.bgColor},white)`,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',fontSize:90,padding:8}}>
            {product.cover_image_url
              ? <img src={product.cover_image_url} alt={title} style={{width:'100%',height:'100%',objectFit:'contain',position:'absolute',inset:0}} />
              : <span>{product.image}</span>}
          </div>

          {/* Info */}
          <div className="pd-info">
            <div style={{fontSize:12,color:p,fontWeight:700,marginBottom:8}}>
              {(product.artistName||product.artist_name||product.artist) ? (
                <button onClick={()=>navigate(`/artists/${product.artist_slug||product.artistSlug||''}`)}
                  style={{background:'none',border:'none',cursor:'pointer',color:p,fontWeight:700,fontSize:12,padding:0,fontFamily:theme.fontFamily}}>
                  {product.artistName||product.artist_name||product.artist}
                </button>
              ) : null}
              {(product.artistName||product.artist_name) && product.category ? ' · ' : ''}
              {product.category}
            </div>
            <h1 style={{fontSize:24,fontWeight:900,color:theme.textColor,margin:'0 0 12px',lineHeight:1.25}}>{title}</h1>

            {/* Type badges */}
            <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' as const}}>
              {(product.is_digital||product.type==='digital'||product.type==='both') && <span style={{background:'#dbeafe',color:'#1d4ed8',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>⬇️ {t('digital')}</span>}
              {(product.is_physical||product.type==='physical'||product.type==='both') && <span style={{background:'#d1fae5',color:'#065f46',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>📦 {t('physical')}</span>}
              {product.pages>0 && <span style={{background:p+'12',color:p,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700}}>📄 {product.pages} {tRaw('หน้า','pages')}</span>}
            </div>

            {/* Price */}
            <div style={{marginBottom:16}}>
              <span className="pd-price" style={{fontWeight:900,color:theme.textColor}}>
                {fmtPrice(displayTHB, displayUSD)}
              </span>
            </div>

            {description && <p style={{color:theme.textColor+'cc',fontSize:14,lineHeight:1.7,marginBottom:16,margin:'0 0 16px'}}>{description}</p>}

            {/* USD + physical-only product warning */}
            {isUSD && isPhysicalOnly && (
              <div style={{background:'#fef3c7',border:'1.5px solid #fcd34d',borderRadius:12,padding:'10px 14px',marginBottom:14,fontSize:13,color:'#92400e',fontWeight:600}}>
                ⚠️ Physical products are available in THB only. Please switch to ฿ THB to purchase this item.
              </div>
            )}

            {/* Option selector — only if more than one option */}
            {options.length > 1 && (
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:13,fontWeight:700,color:theme.textColor,marginBottom:8}}>{tRaw('เลือกรูปแบบ','Select option')}:</label>
                <div style={{display:'flex',flexDirection:'column' as const,gap:7}}>
                  {options.map(o => {
                    const optBlockedUSD = isUSD && o.type === 'physical';
                    const isClickable = o.inStock && !optBlockedUSD;
                    return (
                      <button key={o.id}
                        onClick={()=>{ if(!isClickable) return; setSelectedOption(o); setOptionError(''); }}
                        disabled={!isClickable}
                        style={{padding:'11px 14px',borderRadius:12,cursor:isClickable?'pointer':'not-allowed',textAlign:'left' as const,border:`2px solid ${!isClickable?'#e5e7eb':selectedOption?.id===o.id?p:'#e5e7eb'}`,background:!isClickable?'#f9fafb':selectedOption?.id===o.id?p+'10':'white',fontFamily:theme.fontFamily,display:'flex',justifyContent:'space-between',alignItems:'center',transition:'all 0.12s',opacity:isClickable?1:0.6}}>
                        <span style={{display:'flex',flexDirection:'column' as const,alignItems:'flex-start',gap:2}}>
                          <span style={{fontSize:14,fontWeight:selectedOption?.id===o.id?700:500,color:isClickable?theme.textColor:'#9ca3af'}}>
                            {selectedOption?.id===o.id && '✓ '}{o.name}
                            {!o.inStock && <span style={{fontSize:11,color:'#ef4444',marginLeft:8,fontWeight:600}}>Out of stock</span>}
                          </span>
                          {optBlockedUSD && <span style={{fontSize:11,color:'#f59e0b',fontWeight:700}}>฿ THB only</span>}
                        </span>
                        <span style={{fontSize:14,fontWeight:800,color:isClickable?p:'#9ca3af'}}>{fmtPrice(o.priceTHB, o.priceUSD)}</span>
                      </button>
                    );
                  })}
                </div>
                {optionError && <div style={{marginTop:6,fontSize:12,color:'#ef4444',fontWeight:600}}>⚠️ {optionError}</div>}
              </div>
            )}

            {/* If only 1 option, show it as info not as a selector */}
            {options.length === 1 && (
              <div style={{marginBottom:14,fontSize:13,color:'#6b7280'}}>
                {options[0].type === 'physical' ? '📦 ' : '⬇️ '}{options[0].name}
              </div>
            )}

            {/* Tags */}
            {product.tags?.length>0 && (
              <div style={{display:'flex',gap:6,marginBottom:14,flexWrap:'wrap' as const}}>
                {product.tags.map((tg:string)=><span key={tg} style={{background:p+'12',color:p,borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600}}>#{tg}</span>)}
              </div>
            )}

            {/* Add to cart */}
            <div style={{display:'flex',gap:10,flexWrap:'wrap' as const}}>
              {/* Heart / favorite button */}
              <button
                onClick={()=>{ if(!user){navigate('/login');return;} toggle(product.id); }}
                style={{ width:48, height:48, borderRadius:14, border:`2px solid ${isFav(product.id)?'#ef4444':p+'30'}`, background:isFav(product.id)?'#fef2f2':'white', cursor:'pointer', fontSize:20, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}
                title={isFav(product.id)?tRaw('ลบออกจากรายการโปรด','Remove from favorites'):tRaw('เพิ่มในรายการโปรด','Add to favorites')}
              >
                {isFav(product.id) ? '❤️' : '🤍'}
              </button>
              <button onClick={handleAddToCart} disabled={options.length===0 || (isUSD && isPhysicalOnly)}
                style={{flex:1,minWidth:140,padding:'14px',borderRadius:20,background:options.length===0||(isUSD&&isPhysicalOnly)?'#e5e7eb':btnInCart?'#10b981':p,color:options.length===0||(isUSD&&isPhysicalOnly)?'#9ca3af':'white',border:'none',cursor:options.length===0||(isUSD&&isPhysicalOnly)?'not-allowed':'pointer',fontSize:15,fontWeight:800,fontFamily:theme.fontFamily,boxShadow:btnInCart||options.length===0||(isUSD&&isPhysicalOnly)?'none':`0 6px 20px ${p}40`,transition:'all 0.2s'}}>
                {options.length===0 ? tRaw('ไม่มีสินค้า','Not available') : (isUSD&&isPhysicalOnly) ? '฿ THB only' : btnInCart ? `✓ ${tRaw('อยู่ในตะกร้า','In cart')} +` : t('add_to_cart')}
              </button>
              {items.some(i=>i.id===product.id) && (
                <button onClick={()=>navigate('/cart')} style={{padding:'14px 18px',borderRadius:20,background:'transparent',border:`2px solid ${p}`,color:p,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:theme.fontFamily}}>
                  {t('cart')} →
                </button>
              )}
            </div>

            {/* Shipping note */}
            {(product.is_physical||product.type==='physical') && (
              <div style={{marginTop:10,fontSize:12,color:'#6b7280',background:'#f9fafb',borderRadius:10,padding:'7px 11px'}}>
                📦 {tRaw('ซื้อ 1 เล่ม +฿25 / 2 เล่มขึ้นไป ส่งฟรี','1 book +฿25 shipping · 2+ books free shipping')}
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div style={{background:'white',borderRadius:20,marginTop:16,overflow:'hidden',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
          <div style={{padding:'14px 24px',borderBottom:`2px solid ${p}15`}}>
            <span style={{fontWeight:800,fontSize:13,color:p}}>📋 {tRaw('รายละเอียด','Details')}</span>
          </div>
          <div style={{padding:'20px 18px'}}>
            {product.rich_description && Array.isArray(product.rich_description) && product.rich_description.length > 0
              ? <RichDescRenderer blocks={product.rich_description} />
              : description
                ? <p style={{fontSize:14,lineHeight:1.8,color:theme.textColor+'cc',margin:0}}>{description}</p>
                : <p style={{color:'#9ca3af',fontStyle:'italic'}}>{tRaw('ไม่มีรายละเอียดเพิ่มเติม','No additional details.')}</p>
            }
            {product.pages > 0 && (
              <div style={{marginTop:16,padding:'12px 14px',background:'#f9fafb',borderRadius:12,fontSize:13,display:'flex',justifyContent:'space-between'}}>
                <span style={{color:'#6b7280',fontWeight:600}}>{tRaw('จำนวนหน้า','Pages')}</span>
                <span style={{fontWeight:700,color:theme.textColor}}>{product.pages}</span>
              </div>
            )}
          </div>
        </div>

        {/* Artist section */}
        {(artistProfile || (product.artistName || product.artist_name)) && (
          <div style={{marginTop:36,background:'white',borderRadius:20,padding:'24px',boxShadow:'0 4px 24px rgba(0,0,0,0.06)'}}>
            <h2 style={{fontSize:18,fontWeight:900,color:theme.textColor,margin:'0 0 18px'}}>{tRaw('ผลงานจากศิลปินคนนี้','More from this artist')}</h2>
            {/* Artist card */}
            <div style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:artistProducts.length>0?24:0}}>
              <button onClick={()=>navigate(`/artists/${product.artist_slug||product.artistSlug||''}`)}
                style={{background:'none',border:'none',cursor:'pointer',padding:0,flexShrink:0}}>
                {(artistProfile?.cover_image_url||artistProfile?.avatar_url)
                  ? <img src={artistProfile.cover_image_url||artistProfile.avatar_url} alt={artistProfile.name} style={{width:64,height:64,borderRadius:'50%',objectFit:'cover',border:`2px solid ${p}30`}} />
                  : <div style={{width:64,height:64,borderRadius:'50%',background:`linear-gradient(135deg,${p}30,${p}60)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,border:`2px solid ${p}30`}}>🎨</div>}
              </button>
              <div style={{flex:1}}>
                <button onClick={()=>navigate(`/artists/${product.artist_slug||product.artistSlug||''}`)}
                  style={{background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left' as const}}>
                  <div style={{fontSize:16,fontWeight:800,color:theme.textColor,marginBottom:4}}>{artistProfile?.name||product.artistName||product.artist_name}</div>
                </button>
                {artistProfile?.bio && <p style={{fontSize:13,color:theme.textColor+'99',margin:'0 0 10px',lineHeight:1.6}}>{artistProfile.bio}</p>}
                <button onClick={()=>navigate(`/artists/${product.artist_slug||product.artistSlug||''}`)}
                  style={{background:'none',border:`1.5px solid ${p}`,color:p,cursor:'pointer',padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,fontFamily:theme.fontFamily}}>
                  {tRaw('ดูหน้าศิลปิน','View artist page')} →
                </button>
              </div>
            </div>
            {/* Other products from same artist */}
            {artistProducts.length>0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:14}}>
                {artistProducts.map((x:any)=><ProductCard key={x.id} product={x}/>)}
              </div>
            )}
          </div>
        )}

        {/* 🌈 Colored by Community */}
        {communityPosts.length > 0 && (
          <div style={{marginTop:36}}>
            <h2 style={{fontSize:22,fontWeight:900,color:theme.textColor,marginBottom:18}}>🌈 {tRaw('ระบายโดยชุมชน','Colored by Community')}</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:12}}>
              {communityPosts.map((post:any)=>(
                <button key={post.id} onClick={()=>navigate(`/community?book=${product.id}`)}
                  style={{padding:0,border:'none',borderRadius:14,overflow:'hidden',cursor:'pointer',aspectRatio:'1',background:theme.primaryColor+'10'}}>
                  <img src={post.thumb_url||post.artwork_url} alt="community art" loading="lazy" style={{width:'100%',height:'100%',objectFit:'cover',display:'block'}} />
                </button>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:18}}>
              <button onClick={()=>navigate(`/community?book=${product.id}`)} style={{background:'transparent',border:`2px solid ${theme.primaryColor}`,color:theme.primaryColor,cursor:'pointer',padding:'10px 26px',borderRadius:24,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
                {tRaw(`ดูผลงานทั้งหมด ${communityTotal} ชิ้น`,`View all ${communityTotal} creation${communityTotal!==1?'s':''}`)}
              </button>
            </div>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div style={{marginTop:36}}>
            <h2 style={{fontSize:22,fontWeight:900,color:theme.textColor,marginBottom:18}}>{tRaw('สินค้าที่คุณอาจสนใจ 💕','You may also like 💕')}</h2>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:16}}>
              {related.map((x:any)=><ProductCard key={x.id} product={x}/>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
