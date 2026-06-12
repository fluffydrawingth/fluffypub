import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import ProductCard from '../components/ProductCard';

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
      // Featured: use admin-selected ids first, then fall back to products marked featured
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
    artists:          <ArtistsSection key="artists" />,
    newsletter:       <NewsletterSection key="newsletter" />,
    blog:             <BlogSection key="blog" />,
  };

  return (
    <div style={{ fontFamily: theme.fontFamily }}>
      {(theme.sections || ['hero','featured','categories','artists','newsletter']).map(s => sectionMap[s])}
    </div>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const p = theme.primaryColor;
  // Use theme.heroStats if available, otherwise empty (no mock data)
  const stats = theme.heroStats || [];
  return (
    <section style={{
      background: theme.heroCrop?.croppedDataUrl
        ? `url(${theme.heroCrop.croppedDataUrl}) center/cover no-repeat`
        : theme.heroBgColor || `linear-gradient(135deg, ${theme.bgColor} 0%, ${theme.bgColor2} 50%, #fef3c7 100%)`,
      minHeight: 520, display: 'flex', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden',
    }}>
      {['🌸','✨','🌷','⭐','💫','🌺','🎀','🦋'].map((emoji, i) => (
        <span key={i} style={{ position:'absolute', top:`${10+(i*11)%70}%`, left:`${5+(i*13)%90}%`, fontSize:`${18+(i*7)%20}px`, opacity:0.4, pointerEvents:'none' }}>{emoji}</span>
      ))}
      <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ display:'inline-block', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(10px)', borderRadius:16, padding:'6px 20px', fontSize:13, fontWeight:700, color:p, marginBottom:20, letterSpacing:1, border:`1.5px solid ${p}30` }}>
          🌸 Digital Coloring Books — Download Instantly
        </div>
        <h1 style={{ fontSize:'clamp(36px,6vw,72px)', fontWeight:900, lineHeight:1.1, color:theme.textColor, margin:'0 0 16px', textShadow:'0 2px 20px rgba(255,255,255,0.8)', fontFamily:theme.fontFamily, textAlign:'center' }}>
          {tl(theme.heroTitle || 'Color Your World ✨', theme.heroTitle_th)}
        </h1>
        <p style={{ fontSize:'clamp(16px,2.5vw,22px)', color:theme.textColor+'cc', margin:'0 0 36px', maxWidth:500, fontFamily:theme.fontFamily, textAlign:'center' }}>
          {tl(theme.heroSubtitle || 'Adorable coloring books for every dreamer 🌸', theme.heroSubtitle_th)}
        </p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={()=>navigate('/products')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'14px 32px', borderRadius:30, fontSize:17, fontWeight:800, boxShadow:`0 8px 24px ${p}44`, fontFamily:theme.fontFamily }}>Shop Now 🛍️</button>
          <button onClick={()=>navigate('/artists')} style={{ background:'rgba(255,255,255,0.8)', color:theme.textColor, border:`2px solid ${p}40`, cursor:'pointer', padding:'14px 32px', borderRadius:30, fontSize:17, fontWeight:700, fontFamily:theme.fontFamily }}>Meet Artists 🎨</button>
        </div>
        {/* Hero stats — admin-editable, hidden if empty */}
        {stats.length > 0 && (
          <div style={{ display:'flex', gap:32, justifyContent:'center', marginTop:48, flexWrap:'wrap' }}>
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
  // Hide section if no products configured
  if (products.length === 0) return null;
  return (
    <section style={{ padding:'64px 24px', background:'white' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ fontSize:13, fontWeight:700, color:theme.primaryColor, letterSpacing:1, textTransform:'uppercase' as const }}>{tl(theme.labels?.featured_eyebrow || '✨ Handpicked for You', theme.labels?.featured_eyebrow_th)}</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 12px', fontFamily:theme.fontFamily }}>{tl(theme.labels?.featured_title || 'Featured Collections', theme.labels?.featured_title_th)}</h2>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center' }}>
          {products.map(p => (
            <div key={p.id} style={{ width: 'min(100%, 260px)', flexShrink: 0, flexGrow: 0 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:40 }}>
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
    <section style={{ padding:'64px 24px', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ fontSize:13, fontWeight:700, color:theme.primaryColor, letterSpacing:1, textTransform:'uppercase' as const }}>💾 Download Instantly</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 12px', fontFamily:theme.fontFamily }}>Digital Products</h2>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center' }}>
          {shown.map(p => (
            <div key={p.id} style={{ width:'min(100%, 260px)', flexShrink:0, flexGrow:0 }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div style={{ textAlign:'center', marginTop:40 }}>
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
  const [categories, setCategories] = React.useState<any[]>([]);

  useEffect(() => {
    api.getCategories().then((d: any) => { if (Array.isArray(d)) setCategories(d); });
  }, []);

  // Real counts from products — use categories array if available
  const catCounts: Record<string, number> = {};
  allProducts.forEach((p: any) => {
    const cats: string[] = p.categories && p.categories.length ? p.categories : (p.category ? [p.category] : []);
    cats.forEach((cat: string) => { catCounts[cat] = (catCounts[cat] || 0) + 1; });
  });

  const catsWithProducts = categories.filter(c => (catCounts[c.name] || 0) > 0);
  if (catsWithProducts.length === 0) return null;

  return (
    <section style={{ padding:'64px 24px', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>Browse by Category 🎨</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>Find your perfect coloring style</p>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center' }}>
          {catsWithProducts.map(cat => {
            const count = catCounts[cat.name] || 0;
            return (
              <button key={cat.name} onClick={()=>navigate('/products')}
                style={{ background:'white', border:`1.5px solid ${theme.primaryColor}20`, borderRadius:20, padding:'28px 16px', cursor:'pointer', textAlign:'center' as const, fontFamily:theme.fontFamily, width:'min(100%,160px)', flexShrink:0 }}
                onMouseEnter={e=>{(e.currentTarget as any).style.transform='translateY(-4px)';(e.currentTarget as any).style.boxShadow=`0 8px 24px ${theme.primaryColor}25`;}}
                onMouseLeave={e=>{(e.currentTarget as any).style.transform='none';(e.currentTarget as any).style.boxShadow='none';}}
              >
                <div style={{ fontSize:40, marginBottom:10, display:'flex', justifyContent:'center', alignItems:'center' }}>
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
  const [artists, setArtists] = useState<any[]>([]);
  useEffect(() => { api.getArtists().then((x: any) => setArtists(Array.isArray(x) ? x : [])); }, []);
  const AVATARS = ['🎨','🌸','✨','🐰','🌺','💕','🦊','🌈'];
  if (artists.length === 0) return null;
  return (
    <section style={{ padding:'64px 24px', background:'white' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>Meet Our Artists 🌟</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>Talented creators bringing joy through coloring</p>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:20, justifyContent:'center' }}>
          {artists.map((a: any, idx: number) => (
            <div key={a.id} style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, borderRadius:20, padding:24, textAlign:'center' as const, border:`1.5px solid ${theme.primaryColor}15`, cursor:'pointer', width:'min(100%,240px)', flexShrink:0 }}
              onMouseEnter={e=>{(e.currentTarget as any).style.transform='translateY(-4px)';}}
              onMouseLeave={e=>{(e.currentTarget as any).style.transform='none';}}
              onClick={()=>navigate(`/artists/${a.artist_slug || a.id}`)}
            >
              <div style={{ width:72, height:72, borderRadius:'50%', background:'white', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, boxShadow:`0 4px 16px ${theme.primaryColor}25`, overflow:'hidden' }}>
                {a.avatar_url
                  ? <img src={a.avatar_url} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : AVATARS[idx % AVATARS.length]}
              </div>
              {/* Use artist display name — prefer name over slug */}
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
    <section style={{ padding:'64px 24px', background:'white' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center' as const, marginBottom:40 }}>
          <span style={{ fontSize:13, fontWeight:700, color:p, letterSpacing:1, textTransform:'uppercase' as const }}>{tl(theme.labels?.blog_eyebrow || '📄 From the Blog', theme.labels?.blog_eyebrow_th)}</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 0', fontFamily:theme.fontFamily }}>{tl(theme.labels?.blog_title || 'Latest Updates', theme.labels?.blog_title_th)}</h2>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:24, justifyContent:'center' }}>
          {pages.map(pg => (
            <div key={pg.id} onClick={() => navigate(`/pages/${pg.slug}`)}
              style={{ width:'min(100%,340px)', background:theme.bgColor, borderRadius:16, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 12px rgba(0,0,0,0.06)', border:`1px solid ${p}15`, transition:'all 0.15s', flexShrink:0 }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${p}20`; }}
              onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}
            >
              {pg.image_url && (
                <img src={pg.image_url} alt={pg.title} style={{ width:'100%', height:180, objectFit:'cover', display:'block' }} />
              )}
              <div style={{ padding:20 }}>
                <h3 style={{ fontSize:16, fontWeight:800, color:theme.textColor, margin:'0 0 8px', lineHeight:1.3 }}>{pg.title}</h3>
                {pg.excerpt && <p style={{ fontSize:13, color:theme.textColor+'88', margin:'0 0 12px', lineHeight:1.6 }}>{pg.excerpt}</p>}
                <span style={{ fontSize:13, color:p, fontWeight:700 }}>Read More →</span>
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
  if (theme.showNewsletter === false) return null;
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const p = theme.primaryColor;
  return (
    <section style={{ padding:'64px 24px', background:`linear-gradient(135deg,${p}15,${theme.secondaryColor||'#c084fc'}15)`, textAlign:'center' as const }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>💌</div>
        <h2 style={{ fontSize:30, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>Join the Fluffy Family!</h2>
        <p style={{ color:theme.textColor+'88', marginBottom:28, fontSize:16 }}>Get new releases, exclusive discounts, and coloring tips delivered to your inbox 🌸</p>
        {submitted ? (
          <div style={{ fontSize:20, color:p, fontWeight:700 }}>🎉 You're in! Welcome to the family!</div>
        ) : (
          <div style={{ display:'flex', gap:12, maxWidth:440, margin:'0 auto', flexWrap:'wrap' as const }}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex:1, padding:'12px 20px', borderRadius:24, border:`2px solid ${p}30`, outline:'none', fontSize:15, fontFamily:theme.fontFamily, minWidth:200 }}
            />
            <button onClick={()=>email&&setSubmitted(true)} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'12px 24px', borderRadius:24, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily, boxShadow:`0 4px 16px ${p}44` }}>Subscribe 🌸</button>
          </div>
        )}
      </div>
    </section>
  );
}
