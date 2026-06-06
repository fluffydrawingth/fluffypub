import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const { theme } = useTheme();
  const [featured, setFeatured] = useState<any[]>([]);
  useEffect(() => {
    api.getProducts().then(p => {
      if (Array.isArray(p)) setFeatured(p.filter((x: any) => x.featured).slice(0, 4));
    });
  }, []);

  const sectionMap: Record<string, React.ReactNode> = {
    hero: <HeroSection key="hero" />,
    featured: <FeaturedSection key="featured" products={featured} />,
    categories: <CategoriesSection key="categories" />,
    artists: <ArtistsSection key="artists" />,
    newsletter: <NewsletterSection key="newsletter" />,
  };

  return (
    <div style={{ fontFamily: theme.fontFamily }}>
      {(theme.sections || ['hero','featured','categories','artists','newsletter']).map(s => sectionMap[s])}
    </div>
  );
}

function HeroSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const p = theme.primaryColor;
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
      <div style={{ position:'relative', zIndex:1 }}>
        <div style={{ display:'inline-block', background:'rgba(255,255,255,0.6)', backdropFilter:'blur(10px)', borderRadius:16, padding:'6px 20px', fontSize:13, fontWeight:700, color:p, marginBottom:20, letterSpacing:1, border:`1.5px solid ${p}30` }}>
          🌸 Digital Coloring Books — Download Instantly
        </div>
        <h1 style={{ fontSize:'clamp(36px,6vw,72px)', fontWeight:900, lineHeight:1.1, color:theme.textColor, margin:'0 0 16px', textShadow:'0 2px 20px rgba(255,255,255,0.8)', fontFamily:theme.fontFamily }}>
          {theme.heroTitle || 'Color Your World ✨'}
        </h1>
        <p style={{ fontSize:'clamp(16px,2.5vw,22px)', color:theme.textColor+'cc', margin:'0 0 36px', maxWidth:500, fontFamily:theme.fontFamily }}>
          {theme.heroSubtitle || 'Adorable coloring books for every dreamer 🌸'}
        </p>
        <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          <button onClick={()=>navigate('/products')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'14px 32px', borderRadius:30, fontSize:17, fontWeight:800, boxShadow:`0 8px 24px ${p}44`, fontFamily:theme.fontFamily }}>Shop Now 🛍️</button>
          <button onClick={()=>navigate('/artists')} style={{ background:'rgba(255,255,255,0.8)', color:theme.textColor, border:`2px solid ${p}40`, cursor:'pointer', padding:'14px 32px', borderRadius:30, fontSize:17, fontWeight:700, fontFamily:theme.fontFamily }}>Meet Artists 🎨</button>
        </div>
        <div style={{ display:'flex', gap:32, justifyContent:'center', marginTop:48, flexWrap:'wrap' }}>
          {[['500+','Books'],['12K+','Happy Colorists'],['50+','Artists'],['4.9★','Rating']].map(([n,l])=>(
            <div key={l} style={{ background:'rgba(255,255,255,0.6)', backdropFilter:'blur(8px)', borderRadius:16, padding:'12px 20px', textAlign:'center', border:`1px solid ${p}20` }}>
              <div style={{ fontSize:22, fontWeight:900, color:p }}>{n}</div>
              <div style={{ fontSize:13, color:theme.textColor+'99', fontWeight:600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedSection({ products }: { products: any[] }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  return (
    <section style={{ padding:'64px 24px', background:'white' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <span style={{ fontSize:13, fontWeight:700, color:theme.primaryColor, letterSpacing:1, textTransform:'uppercase' }}>✨ Handpicked for You</span>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, margin:'8px 0 12px', fontFamily:theme.fontFamily }}>Featured Collections</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>Our most beloved coloring books, chosen by the community</p>
        </div>
        {products.length === 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:24 }}>
            {[1,2,3,4].map(i=><div key={i} style={{ height:320, borderRadius:20, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, animation:'pulse 2s infinite' }} />)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:24 }}>
            {products.map(p=><ProductCard key={p.id} product={p} />)}
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:40 }}>
          <button onClick={()=>navigate('/products')} style={{ background:'transparent', border:`2px solid ${theme.primaryColor}`, color:theme.primaryColor, cursor:'pointer', padding:'12px 32px', borderRadius:24, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>View All Books →</button>
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const cats = [
    {emoji:'🐰',name:'Animals',count:48},{emoji:'🌙',name:'Fantasy',count:35},
    {emoji:'🌿',name:'Botanicals',count:29},{emoji:'🔮',name:'Mandala',count:41},
    {emoji:'🍓',name:'Kawaii',count:55},{emoji:'❄️',name:'Seasonal',count:22},
  ];
  return (
    <section style={{ padding:'64px 24px', background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>Browse by Category 🎨</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>Find your perfect coloring style</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 }}>
          {cats.map(c=>(
            <button key={c.name} onClick={()=>navigate('/products')}
              style={{ background:'white', border:`1.5px solid ${theme.primaryColor}20`, borderRadius:20, padding:'28px 16px', cursor:'pointer', textAlign:'center', fontFamily:theme.fontFamily }}
              onMouseEnter={e=>{(e.currentTarget as any).style.transform='translateY(-4px)';(e.currentTarget as any).style.boxShadow=`0 8px 24px ${theme.primaryColor}25`;}}
              onMouseLeave={e=>{(e.currentTarget as any).style.transform='none';(e.currentTarget as any).style.boxShadow='none';}}
            >
              <div style={{ fontSize:40, marginBottom:10 }}>{c.emoji}</div>
              <div style={{ fontSize:15, fontWeight:800, color:theme.textColor }}>{c.name}</div>
              <div style={{ fontSize:12, color:theme.primaryColor, fontWeight:600, marginTop:4 }}>{c.count} books</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArtistsSection() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const [artists, setArtists] = useState<any[]>([]);
  useEffect(() => { api.getArtists().then(x => setArtists(Array.isArray(x) ? x : [])); }, []);
  const AVATARS = ['🎨','🌸','✨','🐰','🌺','💕','🦊','🌈'];
  return (
    <section style={{ padding:'64px 24px', background:'white' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>Meet Our Artists 🌟</h2>
          <p style={{ color:theme.textColor+'88', fontSize:16 }}>Talented creators bringing joy through coloring</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20 }}>
          {artists.map((a, idx)=>(
            <div key={a.id} style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, borderRadius:20, padding:24, textAlign:'center', border:`1.5px solid ${theme.primaryColor}15`, cursor:'pointer' }}
              onMouseEnter={e=>{(e.currentTarget as any).style.transform='translateY(-4px)';}}
              onMouseLeave={e=>{(e.currentTarget as any).style.transform='none';}}
              onClick={()=>navigate('/artists')}
            >
              <div style={{ width:72, height:72, borderRadius:'50%', background:'white', margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, boxShadow:`0 4px 16px ${theme.primaryColor}25` }}>
                {AVATARS[idx % AVATARS.length]}
              </div>
              <div style={{ fontSize:17, fontWeight:800, color:theme.textColor, fontFamily:theme.fontFamily }}>{a.name}</div>
              <div style={{ fontSize:13, color:theme.textColor+'77', margin:'8px 0 12px', lineHeight:1.4 }}>{a.bio || 'Coloring book artist'}</div>
              <div style={{ display:'flex', justifyContent:'center', gap:20 }}>
                <div><span style={{ fontWeight:700, color:theme.primaryColor }}>{a.productCount || 0}</span><span style={{ fontSize:12, color:'#888', marginLeft:4 }}>books</span></div>
              </div>
            </div>
          ))}
          {artists.length === 0 && [1,2,3].map(i=>(
            <div key={i} style={{ height:220, borderRadius:20, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }} />
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterSection() {
  const { theme } = useTheme();
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const p = theme.primaryColor;
  return (
    <section style={{ padding:'64px 24px', background:`linear-gradient(135deg,${p}15,${theme.secondaryColor||'#c084fc'}15)`, textAlign:'center' }}>
      <div style={{ maxWidth:560, margin:'0 auto' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>💌</div>
        <h2 style={{ fontSize:30, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>Join the Fluffy Family!</h2>
        <p style={{ color:theme.textColor+'88', marginBottom:28, fontSize:16 }}>Get new releases, exclusive discounts, and coloring tips delivered to your inbox 🌸</p>
        {submitted ? (
          <div style={{ fontSize:20, color:p, fontWeight:700 }}>🎉 You're in! Welcome to the family!</div>
        ) : (
          <div style={{ display:'flex', gap:12, maxWidth:440, margin:'0 auto', flexWrap:'wrap' }}>
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
