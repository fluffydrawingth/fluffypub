import React from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function Footer() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang } = useLang();
  const tl = (en: string, th?: string) => (lang === 'th' && th) ? th : en;
  const p = theme.primaryColor;
  const footer = theme.footer;
  const [openCols, setOpenCols] = React.useState<Set<string>>(new Set());

  const toggleCol = (id: string) => setOpenCols(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleLink = (url: string, newTab: boolean) => {
    if (!url) return;
    if (newTab || url.startsWith('http')) {
      window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener');
    } else {
      navigate(url);
    }
  };

  return (
    <footer style={{ background:'white', borderTop:`2px solid ${p}15`, padding:'40px 24px 20px', fontFamily:theme.fontFamily, marginTop:'auto' }}>
      <style>{`
        @media(max-width:640px){
          .ft-grid{grid-template-columns:1fr!important;gap:0!important;}
          .ft-brand{margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid ${p}12;}
          .ft-col{border-bottom:1px solid ${p}12;}
          .ft-col-header{cursor:pointer;display:flex!important;justify-content:space-between;align-items:center;padding:14px 0;}
          .ft-col-header h4{margin:0!important;}
          .ft-col-arrow{display:inline-block!important;font-size:16px;color:${p};transition:transform 0.2s;}
          .ft-col-arrow.open{transform:rotate(180deg);}
          .ft-col-links{display:none!important;padding-bottom:12px;}
          .ft-col-links.open{display:flex!important;}
        }
        @media(min-width:641px){
          .ft-col-header{cursor:default;}
          .ft-col-arrow{display:none!important;}
          .ft-col-links{display:flex!important;}
        }
      `}</style>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div className="ft-grid" style={{ display:'grid', gridTemplateColumns:`2fr ${footer.columns.map(()=>'1fr').join(' ')}`, gap:40, marginBottom:32 }}>
          {/* Brand column */}
          <div className="ft-brand">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              {theme.logoImageCrop?.croppedDataUrl
                ? <img src={theme.logoImageCrop.croppedDataUrl} style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }} alt="logo" />
                : <span style={{ fontSize:26 }}>{theme.logoEmoji}</span>}
              <span style={{ fontSize:20, fontWeight:800, color:p }}>{theme.logoText}</span>
            </div>
            <p style={{ color:theme.textColor+'88', fontSize:13, lineHeight:1.7, maxWidth:260, margin:0 }}>
              {tl(footer.description, footer.description_th)}
            </p>
          </div>

          {/* Dynamic columns with mobile accordion */}
          {footer.columns.map(col => {
            const isOpen = openCols.has(col.id);
            return (
              <div key={col.id} className="ft-col">
                <div className="ft-col-header" onClick={() => toggleCol(col.id)}>
                  <h4 style={{ fontSize:12, fontWeight:800, color:theme.textColor, textTransform:'uppercase' as const, letterSpacing:0.5, margin:'0 0 14px' }}>
                    {tl(col.title, col.title_th)}
                  </h4>
                  <span className={`ft-col-arrow${isOpen ? ' open' : ''}`}>▾</span>
                </div>
                <ul className={`ft-col-links${isOpen ? ' open' : ''}`} style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column' as const, gap:9 }}>
                  {col.links.filter(l => l.enabled).map(link => (
                    <li key={link.id}>
                      <button
                        onClick={() => handleLink(link.url, link.newTab)}
                        style={{ background:'none', border:'none', cursor:'pointer', color:theme.textColor+'88', fontSize:13, fontFamily:theme.fontFamily, padding:0, textAlign:'left' as const }}
                        onMouseEnter={e => (e.currentTarget.style.color = p)}
                        onMouseLeave={e => (e.currentTarget.style.color = theme.textColor+'88')}
                      >
                        {tl(link.label, link.label_th)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop:`1px solid ${p}15`, paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap' as const, gap:8 }}>
          <span style={{ fontSize:12, color:theme.textColor+'66' }}>
            {tl(footer.copyright, footer.copyright_th).replace('{year}', new Date().getFullYear().toString()).replace('{logoText}', theme.logoText)}
          </span>
          <span style={{ fontSize:12, color:theme.textColor+'66' }}>{tl(footer.trustBadges, footer.trustBadges_th)}</span>
        </div>
      </div>
    </footer>
  );
}
