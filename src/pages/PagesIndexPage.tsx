import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function PagesIndexPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();

  // /pages is now Fluffy Journal
  useEffect(() => { navigate('/journal'); }, []);

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
      <style>{`@media(max-width:640px){.blog-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}}`}</style>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 16px' }}>

        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:28, fontWeight:900, color:theme.textColor, margin:'0 0 6px' }}>
            📝 {tRaw('บทความ', 'Blog & Pages')}
          </h1>
          <p style={{ color:theme.textColor+'88', margin:0 }}>
            {tRaw('บทความ อัปเดต และข่าวสาร', 'Articles, updates, and more from Fluffy Pub.')}
          </p>
        </div>

        {pages.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 24px', color:theme.textColor+'66' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>📄</div>
            <h3 style={{ fontWeight:800, color:theme.textColor }}>{tRaw('ยังไม่มีบทความ', 'No posts yet')}</h3>
            <p>{tRaw('กลับมาดูใหม่ภายหลัง', 'Check back soon for updates!')}</p>
          </div>
        ) : (
          <div className="blog-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:20 }}>
            {pages.map(pg => (
              <div key={pg.id} onClick={() => navigate(`/pages/${pg.slug}`)}
                style={{ background:'white', borderRadius:16, overflow:'hidden', cursor:'pointer', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', border:`1.5px solid ${p}15`, fontFamily:theme.fontFamily }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 8px 24px ${p}20`; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'; }}>

                {/* Square cover image */}
                <div style={{ position:'relative', width:'100%', paddingBottom:'100%', background:`linear-gradient(135deg,${p}12,${p}06)`, overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:56 }}>
                    {pg.image_url
                      ? <img src={pg.image_url} alt={pg.title} style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }} />
                      : <span>📄</span>
                    }
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding:'12px 14px 14px' }}>
                  <div style={{ fontSize:11, color:p+'99', fontWeight:600, marginBottom:3 }}>
                    {new Date(pg.updated_at || pg.created_at).toLocaleDateString('th-TH', { year:'numeric', month:'short', day:'numeric' })}
                  </div>
                  <div style={{ fontSize:14, fontWeight:800, color:theme.textColor, marginBottom:8, lineHeight:1.3, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
                    {pg.title}
                  </div>
                  {pg.excerpt && (
                    <div style={{ fontSize:12, color:theme.textColor+'88', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>
                      {pg.excerpt}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
