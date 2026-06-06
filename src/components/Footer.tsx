import React from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';

export default function Footer() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const p = theme.primaryColor;
  return (
    <footer style={{ background:'white', borderTop:`2px solid ${p}15`, padding:'40px 24px 20px', fontFamily:theme.fontFamily, marginTop:'auto' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:32 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
              <span style={{ fontSize:26 }}>{theme.logoEmoji}</span>
              <span style={{ fontSize:20, fontWeight:800, color:p }}>{theme.logoText}</span>
            </div>
            <p style={{ color:theme.textColor+'88', fontSize:13, lineHeight:1.7, maxWidth:260 }}>
              Beautiful digital coloring books for every dreamer. Download, print, and color your way to happiness! 🌸
            </p>
          </div>
          {[
            {title:'Shop', links:[['All Books','/products'],['Animals','/products'],['Fantasy','/products'],['Kawaii','/products']]},
            {title:'Company', links:[['About Us','/'],['Artists','/artists'],['Blog','/'],['Careers','/']]},
            {title:'Support', links:[['Help Center','/'],['Contact Us','/'],['Refunds','/'],['FAQ','/']]},
          ].map(col=>(
            <div key={col.title}>
              <h4 style={{ fontSize:12, fontWeight:800, color:theme.textColor, marginBottom:14, textTransform:'uppercase', letterSpacing:0.5 }}>{col.title}</h4>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:9 }}>
                {col.links.map(([label,path])=>(
                  <li key={label}><button onClick={()=>navigate(path)} style={{ background:'none', border:'none', cursor:'pointer', color:theme.textColor+'88', fontSize:13, fontFamily:theme.fontFamily, padding:0 }}>{label}</button></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop:`1px solid ${p}15`, paddingTop:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:theme.textColor+'66' }}>© 2026 {theme.logoText}. Made with 💕</span>
          <span style={{ fontSize:12, color:theme.textColor+'66' }}>🔒 Secure · ⚡ Instant Downloads · 💯 Satisfaction Guaranteed</span>
        </div>
      </div>
    </footer>
  );
}
