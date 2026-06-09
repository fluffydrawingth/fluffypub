import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';

export default function Navbar() {
  const { theme } = useTheme();
  const { count } = useCart();
  const { navigate, route } = useRouter();
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isActive = (p: string) => route.path === p || route.path.startsWith(p + '/');
  const p = theme.primaryColor;
  const handleLogout = async () => { await logout(); navigate('/'); };
  const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';
  const isAdmin = user?.role === 'admin' && user?.email === ADMIN_EMAIL;
  const dashPath = isAdmin ? '/admin' : user?.role === 'artist' ? '/artist-dashboard' : '/account';

  return (
    <nav style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(16px)', borderBottom:`2px solid ${p}22`, position:'sticky', top:0, zIndex:100, fontFamily:theme.fontFamily }}>
      <div style={{ background:theme.bannerBg, color:'white', textAlign:'center', padding:'6px 16px', fontSize:'12px', fontWeight:600 }}>
        {theme.bannerText}
      </div>
      <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:60 }}>
        {/* Logo */}
        <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {theme.logoImageCrop?.croppedDataUrl
            ? <img src={theme.logoImageCrop.croppedDataUrl} style={{ width:32,height:32,borderRadius:'50%',objectFit:'cover' }} alt="logo" />
            : <span style={{ fontSize:24 }}>{theme.logoEmoji}</span>}
          <span style={{ fontSize:20, fontWeight:900, color:p, fontFamily:theme.fontFamily }}>{theme.logoText}</span>
        </button>

        <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'nowrap' }}>
          {/* Nav links */}
          {[
            [theme.labels?.nav_shop || t('shop'), '/products'],
            [theme.labels?.nav_artists || t('artists'), '/artists'],
            [theme.labels?.nav_blog || t('blog'), '/pages'],
          ].map(([label,path])=>(
            <button key={path} onClick={()=>navigate(path)} style={{ background:'none', border:'none', cursor:'pointer', padding:'7px 12px', borderRadius:18, fontSize:13, fontWeight:600, color:isActive(path)?p:theme.textColor, backgroundColor:isActive(path)?p+'15':'transparent', fontFamily:theme.fontFamily, whiteSpace:'nowrap' }}>
              {label}
            </button>
          ))}

          {/* Language switcher */}
          <button
            onClick={()=>setLang(lang==='th'?'en':'th')}
            style={{ background:p+'12', border:`1.5px solid ${p}30`, cursor:'pointer', padding:'5px 10px', borderRadius:14, fontSize:11, fontWeight:700, color:p, fontFamily:theme.fontFamily, flexShrink:0 }}
          >
            {lang==='th'?'EN':'TH'}
          </button>

          {/* Auth */}
          {user ? (
            <div style={{ position:'relative' }}>
              <button onClick={()=>setMenuOpen(x=>!x)} style={{ background:p+'15', border:`1.5px solid ${p}30`, cursor:'pointer', padding:'6px 12px', borderRadius:18, fontSize:13, fontWeight:700, color:p, fontFamily:theme.fontFamily, display:'flex', alignItems:'center', gap:5 }}>
                👤 {(user.first_name || user.name || '').split(' ')[0]} ▾
              </button>
              {menuOpen && (
                <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'white', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', border:`1.5px solid ${p}15`, minWidth:180, zIndex:200, overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', borderBottom:`1px solid ${p}10`, fontSize:11, color:'#888' }}>{user.email}</div>
                  <button onClick={()=>{navigate(dashPath);setMenuOpen(false);}} style={{ width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                    {isAdmin ? '⚙️ Admin Panel' : user.role==='artist' ? '🎨 Artist Dashboard' : `👤 ${t('profile')}`}
                  </button>
                  <button onClick={()=>{navigate('/account/orders');setMenuOpen(false);}} style={{ width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                    📦 {t('orders')}
                  </button>
                  <button onClick={()=>{handleLogout();setMenuOpen(false);}} style={{ width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:'#ef4444', fontFamily:theme.fontFamily }}>
                    🚪 {t('logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={()=>navigate('/login')} style={{ background:'none', border:`1.5px solid ${p}40`, cursor:'pointer', padding:'6px 14px', borderRadius:18, fontSize:13, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
              {t('login')}
            </button>
          )}

          {/* Cart */}
          <button onClick={()=>navigate('/cart')} style={{ background:p, border:'none', cursor:'pointer', padding:'7px 14px', borderRadius:20, display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'white', fontFamily:theme.fontFamily, boxShadow:`0 4px 12px ${p}44`, flexShrink:0 }}>
            🛒{count>0&&<span style={{ background:'white', color:p, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800 }}>{count}</span>}
          </button>
        </div>
      </div>
      {menuOpen && <div style={{ position:'fixed', inset:0, zIndex:150 }} onClick={()=>setMenuOpen(false)} />}
    </nav>
  );
}
