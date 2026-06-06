import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

const AVATARS = ['🎨','🌸','✨','🐰','🌺','💕','🦊','🌈','🦄','🍓'];

export default function ArtistsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const [artists, setArtists] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const p = theme.primaryColor;

  useEffect(() => {
    Promise.all([api.getArtists(), api.getProducts()]).then(([a, pr]) => {
      setArtists(Array.isArray(a) ? a : []);
      setProducts(Array.isArray(pr) ? pr : []);
      setLoading(false);
    });
  }, []);

  return (
    <div style={{ fontFamily: theme.fontFamily }}>
      <div style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, padding:'48px 24px 40px', textAlign:'center' }}>
        <h1 style={{ fontSize:42, fontWeight:900, color:theme.textColor, margin:'0 0 12px', fontFamily:theme.fontFamily }}>Our Artists 🎨</h1>
        <p style={{ color:theme.textColor+'88', fontSize:16 }}>Talented creators bringing joy through coloring</p>
      </div>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 24px' }}>
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
            {[1,2,3].map(i=><div key={i} style={{ height:300, borderRadius:24, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})` }} />)}
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
            {artists.map((a, idx) => {
              // Match products to artist by artistId (API) or artistSlug (legacy)
              const artistProducts = products.filter(pr =>
                pr.artistId === a.id || pr.artistSlug === a.artistSlug
              );
              return (
                <div key={a.id} style={{ background:'white', borderRadius:24, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:`1.5px solid ${p}15` }}>
                  <div style={{ height:100, background:`linear-gradient(135deg,${p}20,${theme.secondaryColor||'#c084fc'}20)` }} />
                  <div style={{ padding:'0 24px 28px' }}>
                    <div style={{ width:80, height:80, borderRadius:'50%', background:'white', border:'3px solid white', boxShadow:`0 4px 16px ${p}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, marginTop:-40, marginBottom:16 }}>
                      {AVATARS[idx % AVATARS.length]}
                    </div>
                    <h3 style={{ fontSize:20, fontWeight:900, color:theme.textColor, margin:'0 0 8px', fontFamily:theme.fontFamily }}>{a.name}</h3>
                    <p style={{ fontSize:14, color:theme.textColor+'88', lineHeight:1.6, marginBottom:16 }}>{a.bio || 'Coloring book artist passionate about bringing joy through art.'}</p>
                    <div style={{ display:'flex', gap:20, marginBottom:20 }}>
                      <div><span style={{ fontWeight:800, color:p, fontSize:18 }}>{a.productCount || artistProducts.length}</span><span style={{ fontSize:13, color:'#888', marginLeft:4 }}>books</span></div>
                    </div>
                    {artistProducts.length > 0 && (
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {artistProducts.slice(0,3).map(pr=>(
                          <button key={pr.id} onClick={()=>navigate(`/products/${pr.slug}`)} style={{ padding:'6px 12px', borderRadius:12, border:`1px solid ${p}20`, background:theme.bgColor, cursor:'pointer', fontSize:12, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily, display:'flex', gap:6, alignItems:'center' }}>
                            {pr.image} {pr.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {artists.length === 0 && (
              <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'60px 24px', color:theme.textColor+'88' }}>
                <div style={{ fontSize:56, marginBottom:16 }}>🎨</div>
                <h3 style={{ fontWeight:800, color:theme.textColor }}>No artists yet</h3>
                <p>Artists will appear here after they register and publish products.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
