import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { useLang } from '../lib/lang';

export default function Navbar() {
  const { theme } = useTheme();
  const { count, items } = useCart();
  const { navigate, route } = useRouter();
  const { user, logout } = useAuth();
  const { lang, setLang, t, currency, setCurrency } = useLang();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);

  // Routes where currency must be locked (order already placed)
  const lockedRoutes = ['/checkout', '/guest-order', '/account/orders'];
  const currencyLocked = lockedRoutes.some(r => route.path === r || route.path.startsWith(r + '/'));
  // TH language always uses THB — hide currency switcher entirely
  const showCurrencySwitcher = lang === 'en' && !currencyLocked;

  const handleSwitchCurrency = (next: 'THB' | 'USD') => {
    if (next === 'USD' && items.some(i => i.optionType === 'physical')) {
      alert('Your cart contains physical products. Please remove them before switching to USD.');
      return;
    }
    setCurrency(next);
  };

  const isActive = (p: string) => route.path === p || route.path.startsWith(p + '/');
  const p = theme.primaryColor;
  const handleLogout = async () => { await logout(); navigate('/'); };
  const ADMIN_EMAIL = 'fluffydrawing.th@gmail.com';
  const isAdmin = user?.role === 'admin' && user?.email === ADMIN_EMAIL;
  // Same permission logic the route guards use, so the dropdown and the dashboards agree.
  const isArtist = user?.role === 'artist' && !!(user?.artistId || (user as any)?.artist_id);
  const isAffiliate = !!(user as any)?.affiliate_enabled;
  const dashPath = isAdmin ? '/admin' : isArtist ? '/artist-dashboard' : '/account';

  // Use theme label overrides if set, otherwise fall back to lang translations
  const lb = theme.labels || {};
  const tl = (enKey: string, thKey: string, fallbackEn: string) =>
    lang === 'th' ? (lb[thKey] || lb[enKey] || fallbackEn) : (lb[enKey] || fallbackEn);

  const navLinks = [
    [tl('nav_shop', 'nav_shop_th', t('shop')), '/products'],
    [t('digital_products'), '/digital-products'],
    [lang === 'th' ? '⬇️ ฟรี' : '⬇️ Free', '/free-downloads'],
    [tl('nav_artists', 'nav_artists_th', t('artists')), '/artists'],
    [tl('nav_blog', 'nav_blog_th', t('blog')), '/pages'],
  ];

  const handleNav = (path: string) => { navigate(path); setNavOpen(false); };

  return (
    <>
    <div style={{ height: 88 }} /> {/* spacer for fixed navbar (banner ~28px + nav 60px) */}
    <nav style={{ background:'rgba(255,255,255,0.95)', backdropFilter:'blur(16px)', borderBottom:`2px solid ${p}22`, position:'fixed', top:0, left:0, right:0, zIndex:100, fontFamily:theme.fontFamily }}>
      <style>{`
        .nb-links { display:flex; gap:4; align-items:center; }
        .nb-hamburger { display:none !important; }
        .nb-mobile-menu { display:none; }
        @media(max-width:768px){
          .nb-links { display:none !important; }
          .nb-hamburger { display:flex !important; }
          .nb-mobile-menu { display:block; }
        }
      `}</style>
      <div style={{ background:theme.bannerBg, color:'white', textAlign:'center', padding:'6px 16px', fontSize:'12px', fontWeight:600 }}>
        {(lang === 'th' && theme.bannerText_th) ? theme.bannerText_th : theme.bannerText}
      </div>
      <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:60 }}>
        {/* Logo */}
        <button onClick={()=>navigate('/')} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          {theme.logoImageCrop?.croppedDataUrl
            ? <img src={theme.logoImageCrop.croppedDataUrl} style={{ width:32,height:32,borderRadius:'50%',objectFit:'cover' }} alt="logo" />
            : <span style={{ fontSize:24 }}>{theme.logoEmoji}</span>}
          <span style={{ fontSize:20, fontWeight:900, color:p, fontFamily:theme.fontFamily }}>{theme.logoText}</span>
        </button>

        {/* Desktop nav */}
        <div className="nb-links" style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'nowrap' }}>
          {navLinks.map(([label,path])=>(
            <button key={path} onClick={()=>navigate(path)} style={{ background:'none', border:'none', cursor:'pointer', padding:'7px 12px', borderRadius:18, fontSize:13, fontWeight:600, color:isActive(path)?p:theme.textColor, backgroundColor:isActive(path)?p+'15':'transparent', fontFamily:theme.fontFamily, whiteSpace:'nowrap' }}>
              {label}
            </button>
          ))}
          <button onClick={()=>setLang(lang==='th'?'en':'th')} style={{ background:p+'12', border:`1.5px solid ${p}30`, cursor:'pointer', padding:'5px 10px', borderRadius:14, fontSize:11, fontWeight:700, color:p, fontFamily:theme.fontFamily, flexShrink:0 }}>
            {lang==='th'?'EN':'TH'}
          </button>
          {showCurrencySwitcher && (
          <button onClick={()=>handleSwitchCurrency(currency==='THB'?'USD':'THB')} style={{ background:'#f0fdf4', border:'1.5px solid #86efac', cursor:'pointer', padding:'5px 10px', borderRadius:14, fontSize:11, fontWeight:700, color:'#16a34a', fontFamily:theme.fontFamily, flexShrink:0 }}>
            {currency==='THB'?'$ USD':'฿ THB'}
          </button>
          )}
          {user ? (
            <div style={{ position:'relative' }}>
              <button onClick={()=>setMenuOpen(x=>!x)} style={{ background:p+'15', border:`1.5px solid ${p}30`, cursor:'pointer', padding:'6px 12px', borderRadius:18, fontSize:13, fontWeight:700, color:p, fontFamily:theme.fontFamily, display:'flex', alignItems:'center', gap:5 }}>
                👤 {(user.first_name || user.name || '').split(' ')[0]} ▾
              </button>
              {menuOpen && (
                <div style={{ position:'absolute', right:0, top:'calc(100% + 8px)', background:'white', borderRadius:16, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', border:`1.5px solid ${p}15`, minWidth:180, zIndex:200, overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', borderBottom:`1px solid ${p}10`, fontSize:11, color:'#888' }}>{user.email}</div>
                  <button onClick={()=>{navigate(dashPath);setMenuOpen(false);}} style={{ width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                    {isAdmin ? '⚙️ Admin Panel' : isArtist ? '🎨 Artist Dashboard' : `👤 ${t('profile')}`}
                  </button>
                  {isAffiliate && (
                    <button onClick={()=>{navigate('/affiliate-dashboard');setMenuOpen(false);}} style={{ width:'100%', padding:'10px 16px', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                      🤝 Affiliate Dashboard
                    </button>
                  )}
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
          <button onClick={()=>navigate('/cart')} style={{ background:p, border:'none', cursor:'pointer', padding:'7px 14px', borderRadius:20, display:'flex', alignItems:'center', gap:5, fontSize:13, fontWeight:700, color:'white', fontFamily:theme.fontFamily, boxShadow:`0 4px 12px ${p}44`, flexShrink:0 }}>
            🛒{count>0&&<span style={{ background:'white', color:p, borderRadius:'50%', width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800 }}>{count}</span>}
          </button>
        </div>

        {/* Mobile right side: lang + cart + hamburger */}
        <div className="nb-hamburger" style={{ display:'none', alignItems:'center', gap:8 }}>
          <button onClick={()=>setLang(lang==='th'?'en':'th')} style={{ background:p+'12', border:`1.5px solid ${p}30`, cursor:'pointer', padding:'5px 8px', borderRadius:12, fontSize:11, fontWeight:700, color:p, fontFamily:theme.fontFamily }}>
            {lang==='th'?'EN':'TH'}
          </button>
          {showCurrencySwitcher && (
          <button onClick={()=>handleSwitchCurrency(currency==='THB'?'USD':'THB')} style={{ background:'#f0fdf4', border:'1.5px solid #86efac', cursor:'pointer', padding:'5px 8px', borderRadius:12, fontSize:11, fontWeight:700, color:'#16a34a', fontFamily:theme.fontFamily }}>
            {currency==='THB'?'$':'฿'}
          </button>
          )}
          <button onClick={()=>navigate('/cart')} style={{ background:p, border:'none', cursor:'pointer', padding:'7px 12px', borderRadius:18, display:'flex', alignItems:'center', gap:4, fontSize:13, fontWeight:700, color:'white', fontFamily:theme.fontFamily }}>
            🛒{count>0&&<span style={{ background:'white', color:p, borderRadius:'50%', width:16, height:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:800 }}>{count}</span>}
          </button>
          <button onClick={()=>setNavOpen(x=>!x)} style={{ background:'none', border:`1.5px solid ${p}30`, cursor:'pointer', padding:'6px 10px', borderRadius:12, fontSize:18, fontFamily:theme.fontFamily, color:theme.textColor }}>
            {navOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen && (
        <div className="nb-mobile-menu" style={{ background:'white', borderTop:`1px solid ${p}15`, padding:'8px 16px 16px' }}>
          {navLinks.map(([label, path]) => (
            <button key={path} onClick={()=>handleNav(path)}
              style={{ display:'block', width:'100%', textAlign:'left', background:isActive(path)?p+'12':'none', border:'none', cursor:'pointer', padding:'12px 14px', borderRadius:12, fontSize:15, fontWeight:isActive(path)?700:600, color:isActive(path)?p:theme.textColor, fontFamily:theme.fontFamily, marginBottom:2 }}>
              {label}
            </button>
          ))}
          <div style={{ borderTop:`1px solid ${p}15`, marginTop:8, paddingTop:8 }}>
            {user ? (
              <>
                <button onClick={()=>handleNav(dashPath)} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'11px 14px', borderRadius:12, fontSize:14, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                  {isAdmin ? '⚙️ Admin Panel' : isArtist ? '🎨 Artist Dashboard' : `👤 ${t('profile')}`}
                </button>
                {isAffiliate && (
                  <button onClick={()=>handleNav('/affiliate-dashboard')} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'11px 14px', borderRadius:12, fontSize:14, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                    🤝 Affiliate Dashboard
                  </button>
                )}
                <button onClick={()=>handleNav('/account/orders')} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'11px 14px', borderRadius:12, fontSize:14, fontWeight:600, color:theme.textColor, fontFamily:theme.fontFamily }}>
                  📦 {t('orders')}
                </button>
                <button onClick={()=>{handleLogout();setNavOpen(false);}} style={{ display:'block', width:'100%', textAlign:'left', background:'none', border:'none', cursor:'pointer', padding:'11px 14px', borderRadius:12, fontSize:14, fontWeight:600, color:'#ef4444', fontFamily:theme.fontFamily }}>
                  🚪 {t('logout')}
                </button>
              </>
            ) : (
              <button onClick={()=>handleNav('/login')} style={{ display:'block', width:'100%', textAlign:'left', background:p+'12', border:'none', cursor:'pointer', padding:'11px 14px', borderRadius:12, fontSize:14, fontWeight:700, color:p, fontFamily:theme.fontFamily }}>
                👤 {t('login')}
              </button>
            )}
          </div>
        </div>
      )}

      {menuOpen && <div style={{ position:'fixed', inset:0, zIndex:150 }} onClick={()=>setMenuOpen(false)} />}
    </nav>
  </>
  );
}
