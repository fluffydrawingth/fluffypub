import React from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

export default function Footer() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const p = theme.primaryColor;
  const footer = theme.footer;

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
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:`2fr ${footer.columns.map(()=>'1fr').join(' ')}`, gap:40, marginBottom:32 }}>
          {/* Brand column */}
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <span style={{ fontSize:26 }}>{theme.logoEmoji}</span>
              <span style={{ fontSize:20, fontWeight:800, color:p }}>{theme.logoText}</span>
            </div>
            <p style={{ color:theme.textColor+'88', fontSize:13, lineHeight:1.7, maxWidth:260, margin:0 }}>
              {footer.description}
            </p>
          </div>

          {/* Dynamic columns */}
          {footer.columns.map(col => (
            <div key={col.id}>
              <h4 style={{ fontSize:12, fontWeight:800, color:theme.textColor, marginBottom:14, textTransform:'uppercase' as const, letterSpacing:0.5, margin:'0 0 14px' }}>
                {col.title}
              </h4>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column' as const, gap:9 }}>
                {col.links.filter(l => l.enabled).map(link => (
                  <li key={link.id}>
                    <button
                      onClick={() => handleLink(link.url, link.newTab)}
                      style={{ background:'none', border:'none', cursor:'pointer', color:theme.textColor+'88', fontSize:13, fontFamily:theme.fontFamily, padding:0, textAlign:'left' as const }}
                      onMouseEnter={e => (e.currentTarget.style.color = p)}
                      onMouseLeave={e => (e.currentTarget.style.color = theme.textColor+'88')}
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div style={{ borderTop:`1px solid ${p}15`, paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap' as const, gap:8 }}>
          <span style={{ fontSize:12, color:theme.textColor+'66' }}>
            {footer.copyright.replace('{year}', new Date().getFullYear().toString()).replace('{logoText}', theme.logoText)}
          </span>
          <span style={{ fontSize:12, color:theme.textColor+'66' }}>{footer.trustBadges}</span>
        </div>
      </div>
    </footer>
  );
}
