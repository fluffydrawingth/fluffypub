import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FooterLink {
  id: string;
  label: string;
  url: string;
  newTab: boolean;
  enabled: boolean;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface FooterConfig {
  description: string;
  copyright: string;
  trustBadges: string;
  columns: FooterColumn[];
}

export interface ThemeConfig {
  primaryColor: string; secondaryColor: string; accentColor: string;
  bgColor: string; bgColor2: string; textColor: string; fontFamily: string;
  logoText: string; logoEmoji: string; logoImageCrop: any | null;
  heroBgColor: string; heroTitle: string; heroSubtitle: string;
  heroCrop: any | null; mobileHeroCrop: any | null;
  bannerText: string; bannerBg: string; bannerImageCrop: any | null;
  bgImageCrop: any | null; sections: string[];
  heroStats: { value: string; label: string }[];
  featuredProductIds: string[];
  showNewsletter: boolean;
  labels: {
    featured_eyebrow: string; featured_title: string; featured_btn: string;
    blog_eyebrow: string; blog_title: string; blog_btn: string;
    nav_shop: string; nav_artists: string; nav_blog: string;
  };
  footer: FooterConfig;
}

const DEFAULT_FOOTER: FooterConfig = {
  description: 'Beautiful digital coloring books for every dreamer. Download, print, and color your way to happiness! 🌸',
  copyright: '© 2026 Fluffy Pub. Made with 💕',
  trustBadges: '🔒 Secure · ⚡ Instant Downloads · 💯 Satisfaction Guaranteed',
  columns: [
    { id: 'shop', title: 'Shop', links: [
      { id: 's1', label: 'All Books', url: '/products', newTab: false, enabled: true },
      { id: 's2', label: 'Animals', url: '/products', newTab: false, enabled: true },
      { id: 's3', label: 'Fantasy', url: '/products', newTab: false, enabled: true },
      { id: 's4', label: 'Kawaii', url: '/products', newTab: false, enabled: true },
    ]},
    { id: 'company', title: 'Company', links: [
      { id: 'c1', label: 'About Us', url: '/', newTab: false, enabled: true },
      { id: 'c2', label: 'Artists', url: '/artists', newTab: false, enabled: true },
      { id: 'c3', label: 'Blog', url: '/', newTab: false, enabled: true },
    ]},
    { id: 'support', title: 'Support', links: [
      { id: 'p1', label: 'Help Center', url: '/', newTab: false, enabled: true },
      { id: 'p2', label: 'Contact Us', url: '/', newTab: false, enabled: true },
      { id: 'p3', label: 'FAQ', url: '/', newTab: false, enabled: true },
    ]},
  ],
};

const DEFAULT: ThemeConfig = {
  primaryColor:'#f472b6', secondaryColor:'#c084fc', accentColor:'#fb923c',
  bgColor:'#fdf2f8', bgColor2:'#faf5ff', textColor:'#4a1942',
  fontFamily:"'Nunito', sans-serif", logoText:'Fluffy Pub', logoEmoji:'🐰', logoImageCrop:null,
  heroBgColor:'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%)',
  heroTitle:'Color Your World ✨', heroSubtitle:'Adorable coloring books for every dreamer 🌸',
  heroCrop:null, mobileHeroCrop:null, bannerText:'🌟 Free shipping on orders over $30! Use FLUFFY15 for 15% off 🌸',
  bannerBg:'#f472b6', bannerImageCrop:null, bgImageCrop:null,
  sections:['hero','featured','categories','artists','newsletter'],
  heroStats:[
    { value:'500+', label:'Books' },
    { value:'12K+', label:'Happy Colorists' },
    { value:'50+',  label:'Artists' },
    { value:'4.9★', label:'Rating' },
  ],
  featuredProductIds:[],
  showNewsletter: false,
  labels: {
    featured_eyebrow: '✨ Handpicked for You',
    featured_title: 'Featured Collections',
    featured_btn: 'View All Books →',
    blog_eyebrow: '📄 From the Blog',
    blog_title: 'Latest Updates',
    blog_btn: 'View All Posts →',
    nav_shop: 'Shop',
    nav_artists: 'Artists',
    nav_blog: 'Blog',
  },
  footer: DEFAULT_FOOTER,
};

const ThemeContext = createContext<{ theme: ThemeConfig; setTheme:(t:ThemeConfig)=>void; saveTheme:(t:ThemeConfig)=>Promise<void>; }>
  ({ theme:DEFAULT, setTheme:()=>{}, saveTheme:async()=>{} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/theme').then(r=>r.json()).then(t => {
      if (t && typeof t === 'object' && !Array.isArray(t)) {
        const parsed = JSON.parse(JSON.stringify(t));
        delete parsed.heroImage; delete parsed.bgImage;
        // Merge footer with defaults to ensure structure
        if (!parsed.footer) parsed.footer = DEFAULT_FOOTER;
        else parsed.footer = { ...DEFAULT_FOOTER, ...parsed.footer };
        setThemeState({ ...DEFAULT, ...parsed });
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setTheme = (t: ThemeConfig) => setThemeState(t);

  const saveTheme = async (t: ThemeConfig) => {
    const token = localStorage.getItem('fluffy_token');
    setThemeState(t);
    await fetch('/api/theme', { method:'PUT', headers:{'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})}, body: JSON.stringify(t) });
  };

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--primary', theme.primaryColor);
    r.style.setProperty('--secondary', theme.secondaryColor);
    r.style.setProperty('--accent', theme.accentColor);
    r.style.setProperty('--bg', theme.bgColor);
    r.style.setProperty('--bg2', theme.bgColor2);
    r.style.setProperty('--text', theme.textColor);
  }, [theme]);

  if (!loaded) return null;
  return <ThemeContext.Provider value={{ theme, setTheme, saveTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
