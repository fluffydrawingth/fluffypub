import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import ProductCard from '../components/ProductCard';

export default function ArtistProfilePage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw, lang } = useLang();

  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [freeDownloads, setFreeDownloads] = useState<any[]>([]);
  const p = theme.primaryColor;

  useEffect(() => {
    // Try by slug directly, then fall back to searching the list
    api.getArtistBySlug(slug).then((a: any) => {
      if (a && !a.error) {
        setArtist(a);
        setLoading(false);
        loadFreeDownloads(a.id);
      } else {
        // fallback: search list
        api.getArtists().then((artists: any[]) => {
          const found = Array.isArray(artists) ? artists.find(x => x.artist_slug === slug || x.slug === slug) : null;
          if (found) {
            api.getArtist(found.id).then((full: any) => {
              setArtist(full && !full.error ? full : null);
              if (full && !full.error) loadFreeDownloads(full.id);
              setLoading(false);
            });
          } else {
            setLoading(false);
          }
        });
      }
    });
  }, [slug]);

  const loadFreeDownloads = (artistId: string) => {
    api.getFreeDownloads().then((all: any[]) => {
      if (Array.isArray(all)) setFreeDownloads(all.filter(x => x.artist_id === artistId));
    }).catch(() => {});
  };

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
  const allProducts: any[] = artist.products || [];

  // Products with type==='physical' OR is_physical===true go in Physical section
  // Products with type==='digital' OR is_digital===true go in Digital section
  // A "both" product (is_digital=true AND type=physical) appears in both sections
  const showPhysical = allProducts.filter(pr => pr.type === 'physical' || pr.is_physical === true);
  const showDigital  = allProducts.filter(pr => pr.type === 'digital'  || pr.is_digital  === true);
  // Unclassified products (old data with no flags) — show under Physical as fallback
  const unclassified = allProducts.filter(pr => pr.type !== 'physical' && pr.type !== 'digital' && !pr.is_physical && !pr.is_digital);
  const physicalSection = [...showPhysical, ...unclassified];
  const totalCount = allProducts.length + freeDownloads.length;

  const fileIcon = (t: string) => t === 'pdf' ? '📄' : t === 'zip' ? '🗜️' : t === 'png' ? '🖼️' : '📁';
  const fileBg   = (t: string) => t === 'pdf' ? '#fee2e2' : t === 'png' ? '#f3e8ff' : '#dbeafe';
  const fileColor= (t: string) => t === 'pdf' ? '#dc2626' : t === 'png' ? '#7c3aed' : '#1d4ed8';

  return (
    <div style={{ fontFamily:theme.fontFamily }}>
      {/* Cover */}
      <div style={{ height:280, position:'relative', background:`linear-gradient(135deg,${p}30,${theme.secondaryColor||'#c084fc'}30)`, overflow:'hidden' }}>
        {artist.cover_image_url && <img src={artist.cover_image_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="cover" />}
        <button onClick={()=>navigate('/artists')} style={{ position:'absolute', top:20, left:24, background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>← Artists</button>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 24px 60px', position:'relative' }}>
        {/* Avatar + name */}
        <div style={{ display:'flex', alignItems:'flex-end', gap:20, marginBottom:24, marginTop:-50, position:'relative', zIndex:1, flexWrap:'wrap' as const }}>
          <div style={{ width:100, height:100, borderRadius:'50%', border:'4px solid white', boxShadow:`0 4px 20px ${p}30`, background:'white', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:50 }}>
            {artist.avatar_url ? <img src={artist.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt={artist.name} /> : '🎨'}
          </div>
          <div style={{ paddingBottom:8 }}>
            <h1 style={{ fontSize:28, fontWeight:900, color:theme.textColor, margin:'0 0 4px' }}>{artist.name}</h1>
            <div style={{ fontSize:13, color:'#9ca3af' }}>@{artist.artist_slug} · {totalCount} {tRaw('ผลงาน', 'items')}</div>
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

        {/* ── Physical Products ── */}
        {physicalSection.length > 0 && (
          <div style={{ marginBottom:48 }}>
            <h2 style={{ fontSize:20, fontWeight:900, color:theme.textColor, marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:10, padding:'3px 12px', fontSize:13 }}>📦 {tRaw('สินค้า', 'Physical')}</span>
              <span style={{ fontSize:14, color:'#9ca3af', fontWeight:600 }}>{physicalSection.length}</span>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20 }}>
              {physicalSection.map((pr:any) => (
                <ProductCard key={pr.id} product={{ ...pr, artistName: artist.name }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Digital Products ── */}
        {showDigital.length > 0 && (
          <div style={{ marginBottom:48 }}>
            <h2 style={{ fontSize:20, fontWeight:900, color:theme.textColor, marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ background:'#dbeafe', color:'#1d4ed8', borderRadius:10, padding:'3px 12px', fontSize:13 }}>⬇️ {tRaw('ดิจิทัล', 'Digital')}</span>
              <span style={{ fontSize:14, color:'#9ca3af', fontWeight:600 }}>{showDigital.length}</span>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20 }}>
              {showDigital.map((pr:any) => (
                <ProductCard key={pr.id} product={{ ...pr, artistName: artist.name }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Free Downloads ── */}
        {freeDownloads.length > 0 && (
          <div style={{ marginBottom:48 }}>
            <h2 style={{ fontSize:20, fontWeight:900, color:theme.textColor, marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ background:'#d1fae5', color:'#065f46', borderRadius:10, padding:'3px 12px', fontSize:13 }}>🎁 {tRaw('ฟรี', 'Free Downloads')}</span>
              <span style={{ fontSize:14, color:'#9ca3af', fontWeight:600 }}>{freeDownloads.length}</span>
            </h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:20 }}>
              {freeDownloads.map((fd:any) => {
                const fdTitle = (lang === 'th' && fd.title_th) ? fd.title_th : fd.title_en;
                const ft = fd.file_type || '';
                return (
                  <div key={fd.id} onClick={() => navigate(`/free-downloads/${fd.slug}`)}
                    style={{ background:'white', borderRadius:16, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 8px rgba(0,0,0,0.06)', border:`1.5px solid ${p}15` }}>
                    {fd.cover_image_url
                      ? <img src={fd.cover_image_url} alt={fdTitle} style={{ width:'100%', aspectRatio:'1/1', objectFit:'cover', display:'block' }} />
                      : <div style={{ width:'100%', aspectRatio:'1/1', background:`${p}10`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40 }}>{fileIcon(ft)}</div>
                    }
                    <div style={{ padding:'10px 12px 14px' }}>
                      {ft && <span style={{ fontSize:10, fontWeight:700, background:fileBg(ft), color:fileColor(ft), borderRadius:5, padding:'2px 7px', marginBottom:6, display:'inline-block' }}>{ft.toUpperCase()}</span>}
                      <div style={{ fontSize:13, fontWeight:700, color:'#1e293b', lineHeight:1.35, marginBottom:4 }}>{fdTitle}</div>
                      <div style={{ fontSize:11, color:'#065f46', fontWeight:700, background:'#d1fae5', borderRadius:20, padding:'2px 8px', display:'inline-block' }}>🎁 {tRaw('ฟรี', 'Free')}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {physicalSection.length === 0 && showDigital.length === 0 && freeDownloads.length === 0 && (
          <div style={{ textAlign:'center', padding:'40px', color:'#9ca3af', background:'white', borderRadius:16 }}>
            {tRaw('ยังไม่มีผลงาน', 'No items yet')}
          </div>
        )}
      </div>
    </div>
  );
}
