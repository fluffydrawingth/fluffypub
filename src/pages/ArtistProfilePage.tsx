import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import ProductCard from '../components/ProductCard';

export default function ArtistProfilePage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();

  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const p = theme.primaryColor;

  useEffect(() => {
    // Find artist by slug
    api.getArtists().then((artists: any[]) => {
      const found = artists.find(a => a.artist_slug === slug);
      if (found) {
        api.getArtist(found.id).then(a => { setArtist(a); setLoading(false); });
      } else {
        setLoading(false);
      }
    });
  }, [slug]);

  if (loading) return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>⏳</div>
  );

  if (!artist) return (
    <div style={{ textAlign:'center', padding:'80px 24px', fontFamily:theme.fontFamily }}>
      <div style={{ fontSize:56 }}>🔍</div>
      <h2 style={{ color:theme.textColor }}>Artist not found</h2>
      <button onClick={()=>navigate('/artists')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'12px 28px', borderRadius:20, marginTop:16, fontSize:15, fontWeight:700, fontFamily:theme.fontFamily }}>← All Artists</button>
    </div>
  );

  const social = artist.social_links || {};

  return (
    <div style={{ fontFamily:theme.fontFamily }}>
      {/* Cover */}
      <div style={{ height:280, position:'relative', background:`linear-gradient(135deg,${p}30,${theme.secondaryColor||'#c084fc'}30)`, overflow:'hidden' }}>
        {artist.cover_image_url && <img src={artist.cover_image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="cover" />}
        <button onClick={()=>navigate('/artists')} style={{ position:'absolute', top:20, left:24, background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>← Artists</button>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px 60px', position:'relative' }}>
        {/* Avatar */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:20, marginBottom:24, marginTop:-50, position:'relative', zIndex:1 }}>
          <div style={{ width:100, height:100, borderRadius:'50%', border:'4px solid white', boxShadow:`0 4px 20px ${p}30`, background:'white', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:50 }}>
            {artist.avatar_url ? <img src={artist.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={artist.name} /> : '🎨'}
          </div>
          <div style={{ paddingBottom:8 }}>
            <h1 style={{ fontSize:28, fontWeight:900, color:theme.textColor, margin:'0 0 4px' }}>{artist.name}</h1>
            <div style={{ fontSize:13, color:'#9ca3af' }}>@{artist.artist_slug} · {(artist.products||[]).length} products</div>
          </div>
          <div style={{ marginLeft:'auto', paddingBottom:8, display:'flex', gap:8, flexWrap:'wrap' as const }}>
            {artist.website && <a href={artist.website} target="_blank" rel="noreferrer" style={{ padding:'8px 16px', borderRadius:20, background:p+'15', color:p, textDecoration:'none', fontSize:13, fontWeight:700 }}>🌐 Website</a>}
            {social.instagram && <a href={`https://instagram.com/${social.instagram}`} target="_blank" rel="noreferrer" style={{ padding:'8px 16px', borderRadius:20, background:'#fce7f3', color:'#be185d', textDecoration:'none', fontSize:13, fontWeight:700 }}>📷 Instagram</a>}
            {social.twitter && <a href={`https://twitter.com/${social.twitter}`} target="_blank" rel="noreferrer" style={{ padding:'8px 16px', borderRadius:20, background:'#dbeafe', color:'#1d4ed8', textDecoration:'none', fontSize:13, fontWeight:700 }}>🐦 Twitter</a>}
          </div>
        </div>

        {/* Bio */}
        {artist.bio && (
          <div style={{ background:'white', borderRadius:16, padding:'20px 24px', marginBottom:32, boxShadow:'0 2px 8px rgba(0,0,0,0.05)', border:`1px solid ${p}15` }}>
            <p style={{ fontSize:15, color:theme.textColor, lineHeight:1.7, margin:0 }}>{artist.bio}</p>
          </div>
        )}

        {/* Products */}
        <h2 style={{ fontSize:22, fontWeight:900, color:theme.textColor, marginBottom:20 }}>
          {artist.name}'s Collection ({(artist.products||[]).length})
        </h2>
        {(artist.products||[]).length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#9ca3af', background:'white', borderRadius:16 }}>No products yet</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20 }}>
            {(artist.products||[]).map((pr:any) => (
              <ProductCard key={pr.id} product={{ ...pr, artistName: artist.name }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
