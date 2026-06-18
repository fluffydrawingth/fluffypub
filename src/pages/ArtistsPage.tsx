import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function ArtistsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const p = theme.primaryColor;

  useEffect(() => {
    api.getArtists().then(a => {
      setArtists(Array.isArray(a) ? a : []);
      setLoading(false);
    });
  }, []);

  const goToArtist = (slug: string) => navigate(`/artists/${slug}`);

  const term = search.trim().toLowerCase();
  const filteredArtists = term
    ? artists.filter(a => `${a.name||''} ${a.username||''} ${a.artist_slug||''} ${a.bio||''}`.toLowerCase().includes(term))
    : artists;

  return (
    <div style={{ fontFamily: theme.fontFamily }}>
      <div style={{ background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, padding:'48px 24px 40px', textAlign:'center' }}>
        <h1 style={{ fontSize:42, fontWeight:900, color:theme.textColor, margin:'0 0 12px' }}>Our Artists 🎨</h1>
        <p style={{ color:theme.textColor+'88', fontSize:16 }}>Talented creators bringing joy through coloring</p>
      </div>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'40px 24px' }}>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:28 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tRaw('ค้นหาศิลปิน...', 'Search artists...')}
            style={{ width:'100%', maxWidth:360, padding:'10px 16px', borderRadius:24, border:`1.5px solid ${p}30`, fontSize:14, outline:'none', fontFamily:theme.fontFamily, boxSizing:'border-box' }}
            onFocus={e => e.target.style.borderColor = p}
            onBlur={e => e.target.style.borderColor = p + '30'}
          />
        </div>
        {loading ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
            {[1,2,3].map(i=>(
              <div key={i} style={{ height:300, borderRadius:24, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, animation:'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filteredArtists.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 24px', color:theme.textColor+'88' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>🎨</div>
            <h3 style={{ fontWeight:800, color:theme.textColor }}>{term ? tRaw('ไม่พบศิลปิน','No artists found') : tRaw('ยังไม่มีศิลปิน','No artists yet')}</h3>
            <p>{term ? tRaw('ลองค้นหาด้วยคำอื่น','Try a different search.') : 'Artists will appear here after they are added in the admin panel.'}</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:24 }}>
            {filteredArtists.map(a => (
              <div
                key={a.id}
                onClick={() => goToArtist(a.artist_slug)}
                style={{ background:'white', borderRadius:24, overflow:'hidden', boxShadow:'0 4px 20px rgba(0,0,0,0.06)', border:`1.5px solid ${p}15`, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${p}25`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; }}
              >
                {/* Cover image */}
                <div style={{ height:120, background:`linear-gradient(135deg,${p}20,${theme.secondaryColor||'#c084fc'}20)`, overflow:'hidden', position:'relative' }}>
                  {a.cover_image_url
                    ? <img src={a.cover_image_url} alt={`${a.name} cover`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ width:'100%', height:'100%', background:`linear-gradient(135deg,${p}25,${theme.secondaryColor||'#c084fc'}25)` }} />
                  }
                </div>

                <div style={{ padding:'0 24px 24px' }}>
                  {/* Avatar */}
                  <div style={{ width:72, height:72, borderRadius:'50%', background:'white', border:`3px solid white`, boxShadow:`0 4px 16px ${p}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, marginTop:-36, marginBottom:14, overflow:'hidden', flexShrink:0 }}>
                    {a.avatar_url
                      ? <img src={a.avatar_url} alt={a.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                      : '🎨'
                    }
                  </div>

                  <h3 style={{ fontSize:20, fontWeight:900, color:theme.textColor, margin:'0 0 6px' }}>{a.name}</h3>
                  {a.artist_slug && <div style={{ fontSize:12, color:'#9ca3af', marginBottom:10 }}>@{a.artist_slug}</div>}
                  <p style={{ fontSize:13, color:theme.textColor+'88', lineHeight:1.6, marginBottom:16, margin:'0 0 16px' }}>
                    {a.bio || 'Coloring book artist passionate about bringing joy through art.'}
                  </p>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <span style={{ fontWeight:800, color:p, fontSize:18 }}>{a.productCount || 0}</span>
                      <span style={{ fontSize:13, color:'#888', marginLeft:4 }}>books</span>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button
                        onClick={e => { e.stopPropagation(); goToArtist(a.artist_slug); }}
                        style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'8px 16px', borderRadius:20, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); goToArtist(a.artist_slug); }}
                        style={{ background:'transparent', color:p, border:`1.5px solid ${p}`, cursor:'pointer', padding:'8px 14px', borderRadius:20, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}
                      >
                        Products
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
