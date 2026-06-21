import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import ProductCard from '../components/ProductCard';
import BadgeIcon from '../components/BadgeIcon';

export default function HomePage() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const [featured, setFeatured] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  useEffect(() => {
    api.getProducts().then((p: any[]) => {
      if (!Array.isArray(p)) return;
      setAllProducts(p);
      const ids: string[] = theme.featuredProductIds || [];
      if (ids.length > 0) {
        const selected = ids.map(id => p.find((x: any) => x.id === id)).filter(Boolean);
        setFeatured(selected);
      } else {
        setFeatured(p.filter((x: any) => x.featured).slice(0, 4));
      }
    });
  }, [theme.featuredProductIds]);

  const digitalProducts = allProducts.filter((p: any) =>
    p.is_digital === true || p.type === 'digital' || p.type === 'both'
  );

  const sectionMap: Record<string, React.ReactNode> = {
    hero:             <HeroSection key="hero" />,
    featured:         <FeaturedSection key="featured" products={featured} />,
    digital_products: <DigitalProductsSection key="digital_products" products={digitalProducts} />,
    categories:       <CategoriesSection key="categories" allProducts={allProducts} />,
    community:        <CommunitySection key="community" />,
    artists:          <ArtistsSection key="artists" />,
    newsletter:       <NewsletterSection key="newsletter" />,
    blog:             <BlogSection key="blog" />,
  };

  const sections = [...(theme.sections || ['hero','featured','categories','artists','newsletter'])];
  // Always show "Color Your World" right below the featured collection
  if (!sections.includes('community')) {
    const fi = sections.indexOf('featured');
    if (fi >= 0) sections.splice(fi + 1, 0, 'community');
    else sections.push('community');
  }
  return (
    <div style={{ fontFamily: theme.fontFamily }}>
      {sections.map(s => sectionMap[s])}
    </div>
  );
}

// ── 🌈 Color Your World — Cozy Picks from Community (lightweight) ──────────────
function CommunitySection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const p = theme.primaryColor;
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    api.getCommunityCozyPicks().then((d: any) => setPosts((d?.posts || []).slice(0, 6))).catch(() => {});
  }, []);

  if (!posts.length) return null;

  return (
    <section style={{ padding: '48px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, color: theme.textColor, margin: '0 0 6px' }}>{tl(theme.labels?.community_title || '🌈 Color Your World', theme.labels?.community_title_th)}</h2>
        <p style={{ fontSize: 14, color: theme.textColor + '99', margin: 0 }}>{tl(theme.labels?.community_subtitle || 'Real coloring results from our community', theme.labels?.community_subtitle_th)}</p>
      </div>

      <div style={{ display: 'flex', gap: 14, paddingBottom: 10, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', justifyContent: 'center', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {posts.map(post => {
          const cover = (post.artwork_urls && post.artwork_urls.length ? post.artwork_urls[0] : post.thumb_url || post.artwork_url);
          const bookTitle = post.product?.title || post.external_book?.title || post.external_book_title || '';
          return (
            <button key={post.id} onClick={() => navigate(`/community/${post.id}`)}
              style={{ scrollSnapAlign: 'start', flexShrink: 0, width: 210, background: 'white', border: `1.5px solid ${p}15`, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', padding: 0, fontFamily: theme.fontFamily, textAlign: 'left', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ position: 'relative', width: '100%', paddingBottom: '125%', background: `linear-gradient(135deg,${p}10,${p}05)` }}>
                <img src={cover} alt={post.caption || 'coloring'} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                {(post.artwork_urls?.length || 0) > 1 && <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 10.5, fontWeight: 700, padding: '3px 7px', borderRadius: 12 }}>🖼️ +{post.artwork_urls.length - 1}</div>}
              </div>
              <div style={{ padding: '10px 12px 12px' }}>
                {bookTitle && <div style={{ fontSize: 11.5, fontWeight: 700, color: p, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📚 {bookTitle}</div>}
                {post.creator && <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><BadgeIcon affiliate={post.creator.affiliate_enabled} size={12} /> {post.creator.name}</div>}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', marginTop: 22 }}>
        <button onClick={() => navigate('/community')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 24, fontSize: 14.5, fontWeight: 800, fontFamily: theme.fontFamily }}>
          {tl(theme.labels?.community_btn || '✨ Explore Community →', theme.labels?.community_btn_th)}
        </button>
      </div>
    </section>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const p = theme.primaryColor;

  const heroBadge = tl(theme.heroBadge || '', theme.heroBadge_th);
  const shopBtnText = tl(theme.heroShopBtn || 'Shop Now 🛍️', theme.heroShopBtn_th);
  const artistsBtnText = tl(theme.heroArtistsBtn || 'Meet Artists 🎨', theme.heroArtistsBtn_th);

  // Named stat fields — only show if value is set
  const namedStats = [
    theme.statBooks      ? { value: theme.statBooks,      label: tl('Books', 'หนังสือ') }            : null,
    theme.statColorists  ? { value: theme.statColorists,  label: tl('Happy Colorists', 'นักระบายสี') } : null,
    theme.statArtists    ? { value: theme.statArtists,    label: tl('Artists', 'ศิลปิน') }            : null,
    theme.statRating     ? { value: theme.statRating,     label: tl('Rating', 'คะแนน') }              : null,
  ].filter(Boolean) as { value: string; label: string }[];
  // Named stat fields are the single source of truth: each shows only if it has a value,
  // and clearing a field hides it. No legacy heroStats fallback (that ignored "leave
  // empty to hide" and kept showing old defaults).
  const stats = namedStats;

  return (
    <section style={{
      background: theme.heroCrop?.croppedDataUrl
        ? `url(${theme.heroCrop.croppedDataUrl}) center/cover no-repeat`
        : theme.heroBgColor || `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgColor2} 50%, #fef3c7 100%)`,
      minHeight: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @media(max-width:640px){
          .hp-hero-inner{padding:36px 0 0!important;}
          .hp-hero-stats{display:none!important;}
          .hp-hero-btns button{padding:12px 22px!important;font-size:15px!important;}
        }
      `}</style>
      {['🌸','✨','🌷','⭐','💫','🌺','🎀','🦋'].map((emoji, i) => (
        <span key={i} style={{ position:'absolute', top:`${10+(i*11)%70}%`, left:`${5+(i*13)%90}%`, fontSize:`${18+(i*7)%20}px`, opacity:0.4, pointerEvents:'none' }}>{emoji}</span>
      ))}
      <div className="hp-hero-inner" style={{ position:'relative', zIndex:1, width:'100%', maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center' }}>
        {heroBadge && (
          <div style={{ display:'inline-block', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(10px)', borderRadius:16, padding:'6px 20px', fontSize:13, fontWeight:700, color:p, marginBottom:20, letterSpacing:1, border:`1.5px solid ${p}30` }}>
            {heroBadge}
          </div>
        )}
        <h1 style={{ fontSize:'clamp(30px,6vw,72px)', fontWeight:900, lineHeight:1.1, color:theme.textColor, margin:'0 0 16px', textShadow:'0 2px 20px rgba(255,255,255,0.8)', fontFamily:theme.fontFamily, textAlign:'center' }}>
          {tl(theme.heroTitle || 'Color Your World ✨', theme.heroTitle_th)}
        </h1>
        <p style={{ fontSize:'clamp(15px,2.5vw,22px)', color:theme.textColor+'cc', margin:'0 0 36px', maxWidth:500, fontFamily:theme.fontFamily, textAlign:'center' }}>
          {tl(theme.heroSubtitle || 'Adorable coloring books for every dreamer 🌸', theme.heroSubtitle_th)}
        </p>
        <div className="hp-hero-btns" style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={()=>navigate('/products')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'14px 32px', borderRadius:30, fontSize:17, fontWeight:800, boxShadow:`0 8px 24px ${p}44`, fontFamily:theme.fontFamily }}>{shopBtnText}</button>
          <button onClick={()=>navigate('/artists')} style={{ background:'rgba(255,255,255,0.8)', color:theme.textColor, border:`2px solid ${p}40`, cursor:'pointer', padding:'14px 32px', borderRadius:30, fontSize:17, fontWeight:700, fontFamily:theme.fontFamily }}>{artistsBtnText}</button>
        </div>
        {stats.length > 0 && (
          <div className="hp-hero-stats" style={{ display:'flex', gap:32, justifyContent:'center', marginTop:48, flexWrap:'wrap' }}>
            {stats.map((s: any, i: number) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.6)', backdropFilter:'blur(8px)', borderRadius:16, padding:'12px 20px', textAlign:'center', border:`1px solid ${p}20` }}>
                <div style={{ fontSize:22, fontWeight:900, color:p }}>{s.value}</div>
                <div style={{ fontSize:13, color:theme.textColor+'99', fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Featured Collections ──────────────────────────────────────────────────────
function FeaturedSection({ products }: { products: any[] }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  if (products.length === 0) return null;
  return (
    <section style={{ background:'white' }}>
      <style>{`
        @media(max-width:640px){
          .hp-feat-wrap{padding:32px 0!important;}
          .hp-feat-header,.hp-feat-footer{padding:0 16px!important;}
          .hp-feat-scroll{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;padding:0 16px 12px!important;scrollbar-width:none!important;gap:12px!important;justify-content:flex-start!important;}
          .hp-feat-scroll::-webkit-scrollbar{display:none!important;}
          .hp-feat-card{width:72vw!important;min-width:200px!important;max-width:260px!important;flex-shrink:0!important;flex-grow:0!important;}
        }
      `}</style>
      <div className="hp-feat-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'64px 24px' }}>
        <div className="hp-feat-header" style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ fontSize:13, fontWeight:700, color:theme.primaryColor, letterSpacing:1, textTransform:'uppercase' as const }}>{tl(theme.labels?.featured_eyebrow || '✨ Handpicked for You', theme.labels?.featured_eyebrow_th)}</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 12px', fontFamily:theme.fontFamily }}>{tl(theme.labels?.featured_title || 'Featured Collections', theme.labels?.featured_title_th)}</h2>
        </div>
        <div className="hp-feat-scroll" style={{ display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center' }}>
          {products.map(p => (
            <div key={p.id} className="hp-feat-card" style={{ width: 'min(100%, 260px)', flexShrink: 0, flexGrow: 0 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div className="hp-feat-footer" style={{ textAlign:'center', marginTop:40 }}>
          <button onClick={()=>navigate('/products')} style={{ background:'transparent', border:`2px solid ${theme.primaryColor}`, color:theme.primaryColor, cursor:'pointer', padding:'12px 32px', borderRadius:24, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>{tl(theme.labels?.featured_btn || 'View All Books →', theme.labels?.featured_btn_th)}</button>
        </div>
      </div>
    </section>
  );
}

// ── Digital Products ─────────────────────────────────────────────────────────
function DigitalProductsSection({ products }: { products: any[] }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  if (products.length === 0) return null;
  const shown = products.slice(0, 4);
  return (
    <section style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }}>
      <style>{`
        @media(max-width:640px){
          .hp-dig-wrap{padding:32px 0!important;}
          .hp-dig-scroll{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;padding:0 16px 12px!important;scrollbar-width:none!important;gap:12px!important;justify-content:flex-start!important;}
          .hp-dig-scroll::-webkit-scrollbar{display:none!important;}
          .hp-dig-card{width:72vw!important;min-width:200px!important;max-width:260px!important;flex-shrink:0!important;flex-grow:0!important;}
        }
      `}</style>
      <div className="hp-dig-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'64px 24px' }}>
        <div style={{ textAlign:'center', marginBottom:40, padding:'0 16px' }}>
          <span style={{ fontSize:13, fontWeight:700, color:theme.primaryColor, letterSpacing:1, textTransform:'uppercase' as const }}>💾 Download Instantly</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 12px', fontFamily:theme.fontFamily }}>Digital Products</h2>
        </div>
        <div className="hp-dig-scroll" style={{ display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center' }}>
          {shown.map(p => (
            <div key={p.id} className="hp-dig-card" style={{ width:'min(100%, 260px)', flexShrink:0, flexGrow:0 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:40, padding:'0 16px' }}>
          <button onClick={()=>navigate('/digital-products')} style={{ background:'transparent', border:`2px solid ${theme.primaryColor}`, color:theme.primaryColor, cursor:'pointer', padding:'12px 32px', borderRadius:24, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>View All Digital →</button>
        </div>
      </div>
    </section>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────
function CategoriesSection({ allProducts }: { allProducts: any[] }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const [categories, setCategories] = React.useState<any[]>([]);

  useEffect(() => {
    api.getCategories().then((d: any) => { if (Array.isArray(d)) setCategories(d); });
  }, []);

  const catCounts: Record<string, number> = {};
  allProducts.forEach((p: any) => {
    const cats: string[] = p.categories && p.categories.length ? p.categories : (p.category ? [p.category] : []);
    cats.forEach((cat: string) => { catCounts[cat] = (catCounts[cat] || 0) + 1; });
  });

  const catsWithProducts = categories.filter(c => (catCounts[c.name] || 0) > 0);
  if (catsWithProducts.length === 0) return null;

  return (
    <section style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }}>
      <style>{`
        @media(max-width:640px){
          .hp-cat-wrap{padding:32px 0!important;}
          .hp-cat-header{padding:0 16px!important;}
          .hp-cat-scroll{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;padding:0 16px 8px!important;scrollbar-width:none!important;gap:10px!important;justify-content:flex-start!important;}
          .hp-cat-scroll::-webkit-scrollbar{display:none!important;}
          .hp-cat-card{width:100px!important;min-width:88px!important;padding:14px 8px!important;flex-shrink:0!important;}
          .hp-cat-icon{font-size:28px!important;margin-bottom:6px!important;}
          .hp-cat-card img{width:36px!important;height:36px!important;}
        }
      `}</style>
      <div className="hp-cat-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'64px 24px' }}>
        <div className="hp-cat-header" style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>{tl(theme.labels?.categories_title||'Browse by Category 🎨',theme.labels?.categories_title_th)}</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>{tl(theme.labels?.categories_subtitle||'Find your perfect coloring style',theme.labels?.categories_subtitle_th)}</p>
        </div>
        <div className="hp-cat-scroll" style={{ display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center' }}>
          {catsWithProducts.map(cat => {
            const count = catCounts[cat.name] || 0;
            return (
              <button key={cat.name} onClick={()=>navigate(`/products?cat=${encodeURIComponent(cat.name)}`)}
                className="hp-cat-card"
                style={{ background:'white', border:`1.5px solid ${theme.primaryColor}20`, borderRadius:20, padding:'28px 16px', cursor:'pointer', textAlign:'center' as const, fontFamily:theme.fontFamily, width:'min(100%,160px)', flexShrink:0 }}
                onMouseEnter={e=>{(e.currentTarget as any).style.transform='translateY(-4px)';(e.currentTarget as any).style.boxShadow=`0 8px 24px ${theme.primaryColor}25`;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.transform='none';(e.currentTarget as any).style.boxShadow='none';}}
              >
                <div className="hp-cat-icon" style={{ fontSize:40, marginBottom:10, display:'flex', justifyContent:'center', alignItems:'center' }}>
                  {cat.icon_type === 'image' && cat.icon
                    ? <img src={cat.icon} alt={cat.name} style={{ width:48, height:48, objectFit:'cover', borderRadius:10 }} />
                    : <span>{cat.icon || '🎨'}</span>}
                </div>
                <div style={{ fontSize:15, fontWeight:800, color:theme.textColor }}>{cat.name}</div>
                <div style={{ fontSize:12, color:theme.primaryColor, fontWeight:600, marginTop:4 }}>{count} book{count !== 1 ? 's' : ''}</div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Artists ───────────────────────────────────────────────────────────────────
function ArtistsSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const [allArtists, setAllArtists] = useState<any[]>([]);
  useEffect(() => { api.getArtists().then((x: any) => setAllArtists(Array.isArray(x) ? x : [])); }, []);
  const AVATARS = ['🎨','🌸','✨','🐰','🌺','💕','🦊','🌈'];
  // Show only artists flagged "Show on homepage". Fallback to all if none flagged yet.
  const flagged = allArtists.filter(a => a.show_on_homepage);
  const artists = (flagged.length ? flagged : allArtists).slice(0, 8);
  if (artists.length === 0) return null;
  return (
    <section style={{ background:'white' }}>
      <style>{`
        @media(max-width:640px){
          .hp-art-wrap{padding:32px 0!important;}
          .hp-art-header{padding:0 16px!important;}
          .hp-art-scroll{display:flex!important;flex-wrap:nowrap!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch!important;padding:0 16px 12px!important;scrollbar-width:none!important;gap:12px!important;justify-content:flex-start!important;}
          .hp-art-scroll::-webkit-scrollbar{display:none!important;}
          .hp-art-card{width:64vw!important;min-width:175px!important;max-width:220px!important;flex-shrink:0!important;padding:18px 14px!important;}
          .hp-art-avatar{width:56px!important;height:56px!important;font-size:26px!important;margin-bottom:12px!important;}
        }
      `}</style>
      <div className="hp-art-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'64px 24px' }}>
        <div className="hp-art-header" style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>{tl(theme.labels?.artists_title||'Meet Our Artists 🌟',theme.labels?.artists_title_th)}</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>{tl(theme.labels?.artists_subtitle||'Talented creators bringing joy through coloring',theme.labels?.artists_subtitle_th)}</p>
        </div>
        <div className="hp-art-scroll" style={{ display:'flex', flexWrap:'wrap', gap:20, justifyContent:'center' }}>
          {artists.map((a: any, idx: number) => (
            <div key={a.id} className="hp-art-card"
              style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, borderRadius:20, padding:24, textAlign:'center' as const, border:`1.5px solid ${theme.primaryColor}15`, cursor:'pointer', width:'min(100%,240px)', flexShrink:0 }}
              onMouseEnter={e=>{(e.currentTarget as any).style.transform='translateY(-4px)';}}
              onMouseLeave={e=>{(e.currentTarget as any).style.transform='none';}}
              onClick={()=>navigate(`/artists/${a.artist_slug || a.id}`)}
            >
              <div className="hp-art-avatar" style={{ width:72, height:72, borderRadius:'50%', background:'white', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, boxShadow:`0 4px 16px ${theme.primaryColor}25`, overflow:'hidden' }}>
                {a.avatar_url
                  ? <img src={a.avatar_url} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : AVATARS[idx % AVATARS.length]}
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:theme.textColor, fontFamily:theme.fontFamily }}>
                {a.name || a.artist_slug}
              </div>
              <div style={{ fontSize:13, color:theme.textColor+'77', margin:'8px 0 12px', lineHeight:1.4 }}>{a.bio || 'Coloring book artist'}</div>
              <div style={{ display:'flex', justifyContent:'center', gap:20 }}>
                <div><span style={{ fontWeight:700, color:theme.primaryColor }}>{a.productCount || 0}</span><span style={{ fontSize:12, color:'#888', marginLeft:4 }}>books</span></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:36 }}>
          <button onClick={()=>navigate('/artists')} style={{ background:'transparent', border:`2px solid ${theme.primaryColor}`, color:theme.primaryColor, cursor:'pointer', padding:'12px 32px', borderRadius:24, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>
            {tl(theme.labels?.artists_btn || 'View All Artists →', theme.labels?.artists_btn_th)}
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Blog / Pages Section ─────────────────────────────────────────────────────
function BlogSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const [pages, setPages] = React.useState<any[]>([]);

  useEffect(() => {
    fetch('/api/pages?homepage=1')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setPages(d); })
      .catch(() => {});
  }, []);

  if (pages.length === 0) return null;

  const p = theme.primaryColor;
  return (
    <section style={{ background:'white' }}>
      <style>{`@media(max-width:640px){.hp-blog-wrap{padding:32px 16px!important;}}`}</style>
      <div className="hp-blog-wrap" style={{ maxWidth:1200, margin:'0 auto', padding:'64px 24px' }}>
        <div style={{ textAlign:'center' as const, marginBottom:40 }}>
          <span style={{ fontSize:13, fontWeight:700, color:p, letterSpacing:1, textTransform:'uppercase' as const }}>{tl(theme.labels?.blog_eyebrow || '📄 From the Blog', theme.labels?.blog_eyebrow_th)}</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 0', fontFamily:theme.fontFamily }}>{tl(theme.labels?.blog_title || 'Latest Updates', theme.labels?.blog_title_th)}</h2>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
          {pages.map(pg => (
            <div key={pg.id} onClick={() => navigate(`/pages/${pg.slug}`)}
              style={{ background:'white', borderRadius:20, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', border:`1px solid ${p}12`, transition:'all 0.18s', display:'flex', flexDirection:'column' as const }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 12px 32px ${p}22`; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 16px rgba(0,0,0,0.07)'; }}
            >
              {pg.image_url
                ? <img src={pg.image_url} alt={pg.title} style={{ width:'100%', height:200, objectFit:'cover', display:'block' }} />
                : <div style={{ width:'100%', height:200, background:`linear-gradient(135deg,${p}18,${p}08)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:56 }}>
                    📄
                  </div>
              }
              <div style={{ padding:'20px 22px', flex:1, display:'flex', flexDirection:'column' as const }}>
                <h3 style={{ fontSize:17, fontWeight:800, color:theme.textColor, margin:'0 0 8px', lineHeight:1.35 }}>{pg.title}</h3>
                {pg.excerpt && <p style={{ fontSize:13, color:theme.textColor+'88', margin:'0 0 14px', lineHeight:1.65, flex:1 }}>{pg.excerpt}</p>}
                <div style={{ marginTop:'auto' }}>
                  <span style={{ display:'inline-block', fontSize:13, color:p, fontWeight:700, background:p+'12', padding:'6px 14px', borderRadius:20 }}>Read More →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center' as const, marginTop:32 }}>
          <button onClick={() => navigate('/pages')} style={{ background:'transparent', border:`2px solid ${p}`, color:p, cursor:'pointer', padding:'11px 28px', borderRadius:24, fontSize:14, fontWeight:700, fontFamily:theme.fontFamily }}>
            {tl(theme.labels?.blog_btn || 'View All Posts →', theme.labels?.blog_btn_th)}
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Newsletter ────────────────────────────────────────────────────────────────
function NewsletterSection() {
  const { theme } = useTheme();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  if (theme.showNewsletter === false) return null;
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const p = theme.primaryColor;
  return (
    <section style={{ background:`linear-gradient(135deg,${p}15,${theme.secondaryColor||'#c084fc'}15)`, textAlign:'center' as const }}>
      <style>{`@media(max-width:640px){.hp-nl-wrap{padding:32px 16px!important;}}`}</style>
      <div className="hp-nl-wrap" style={{ maxWidth:560, margin:'0 auto', padding:'64px 24px' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>💌</div>
        <h2 style={{ fontSize:30, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>{tl(theme.labels?.newsletter_title||"Join the Fluffy Family!",theme.labels?.newsletter_title_th)}</h2>
        <p style={{ color:theme.textColor+'88', marginBottom:28, fontSize:16 }}>{tl(theme.labels?.newsletter_body||'Get new releases, exclusive discounts, and coloring tips delivered to your inbox 🌸',theme.labels?.newsletter_body_th)}</p>
        {submitted ? (
          <div style={{ fontSize:20, color:p, fontWeight:700 }}>{tl(theme.labels?.newsletter_success||"🎉 You're in! Welcome to the family!",theme.labels?.newsletter_success_th)}</div>
        ) : (
          <div style={{ display:'flex', gap:12, maxWidth:440, margin:'0 auto', flexWrap:'wrap' as const }}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex:1, padding:'12px 20px', borderRadius:24, border:`2px solid ${p}30`, outline:'none', fontSize:15, fontFamily:theme.fontFamily, minWidth:200 }}
            />
            <button onClick={()=>email&&setSubmitted(true)} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'12px 24px', borderRadius:24, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily, boxShadow:`0 4px 16px ${p}44` }}>{tl(theme.labels?.newsletter_btn||'Subscribe 🌸',theme.labels?.newsletter_btn_th)}</button>
          </div>
        )}
      </div>
    </section>
  );
}
