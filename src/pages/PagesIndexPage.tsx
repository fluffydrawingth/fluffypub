import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

export default function PagesIndexPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const p = theme.primaryColor;

  useEffect(() => {
    fetch('/api/pages')
      .then(r => r.json())
      .then(d => { setPages(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight:'60vh', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>⏳</div>
  );

  return (
    <div style={{ fontFamily:theme.fontFamily, background:theme.bgColor, minHeight:'70vh' }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 20px' }}>
        <h1 style={{ fontSize:32, fontWeight:900, color:theme.textColor, margin:'0 0 8px' }}>Blog & Pages</h1>
        <p style={{ color:theme.textColor+'88', marginBottom:40, fontSize:16 }}>Articles, updates, and more from Fluffy Pub.</p>

        {pages.length === 0 ? (
          <div style={{ textAlign:'center' as const, padding:'80px 24px', color:theme.textColor+'66' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📄</div>
            <h3 style={{ fontWeight:800, color:theme.textColor }}>No posts yet</h3>
            <p>Check back soon for updates!</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:28 }}>
            {pages.map(pg => (
              <div key={pg.id}
                onClick={() => navigate(`/pages/${pg.slug}`)}
                style={{ background:'white', borderRadius:20, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', border:`1px solid ${p}12`, transition:'all 0.18s', display:'flex', flexDirection:'column' as const }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${p}22`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)'; }}
              >
                {pg.image_url
                  ? <img src={pg.image_url} alt={pg.title} style={{ width:'100%', height:200, objectFit:'cover', display:'block' }} />
                  : <div style={{ width:'100%', height:200, background:`linear-gradient(135deg,${p}18,${p}08)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:56 }}>📄</div>
                }
                <div style={{ padding:'20px 22px', flex:1, display:'flex', flexDirection:'column' as const }}>
                  <div style={{ fontSize:12, color:theme.textColor+'55', marginBottom:8 }}>
                    {new Date(pg.updated_at || pg.created_at).toLocaleDateString('th-TH', { year:'numeric', month:'long', day:'numeric' })}
                  </div>
                  <h2 style={{ fontSize:18, fontWeight:800, color:theme.textColor, margin:'0 0 8px', lineHeight:1.3 }}>{pg.title}</h2>
                  {pg.excerpt && <p style={{ fontSize:14, color:theme.textColor+'99', margin:'0 0 14px', lineHeight:1.65, flex:1 }}>{pg.excerpt}</p>}
                  <div style={{ marginTop:'auto' }}>
                    <span style={{ display:'inline-block', fontSize:13, color:p, fontWeight:700, background:p+'12', padding:'7px 16px', borderRadius:20 }}>Read More →</span>
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
