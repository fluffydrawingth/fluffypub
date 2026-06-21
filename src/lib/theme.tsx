import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FooterLink {
  id: string;
  label: string; label_th?: string;
  url: string;
  newTab: boolean;
  enabled: boolean;
}

export interface FooterColumn {
  id: string;
  title: string; title_th?: string;
  links: FooterLink[];
}

export interface FooterConfig {
  description: string; description_th?: string;
  copyright: string; copyright_th?: string;
  trustBadges: string; trustBadges_th?: string;
  columns: FooterColumn[];
}

export interface ThemeConfig {
  primaryColor: string; secondaryColor: string; accentColor: string;
  bgColor: string; bgColor2: string; textColor: string; fontFamily: string;
  logoText: string; logoEmoji: string; logoImageCrop: any | null; logoUrl?: string;
  heroBgColor: string; heroTitle: string; heroTitle_th?: string; heroSubtitle: string; heroSubtitle_th?: string;
  heroCrop: any | null; mobileHeroCrop: any | null;
  bannerText: string; bannerText_th?: string; bannerBg: string; bannerImageCrop: any | null;
  bgImageCrop: any | null; sections: string[];
  heroStats: { value: string; label: string }[];
  statBooks?: string | null; statColorists?: string | null; statArtists?: string | null; statRating?: string | null;
  featuredProductIds: string[];
  showNewsletter: boolean;
  maintenance_mode: boolean;
  paypal?: { enabled: boolean; username: string; email: string; usd_rate: number; instructions: string };
  bankTransfer?: { enabled?: boolean; bank_name?: string; account_name?: string; account_number?: string };
  community?: { featured_books?: string[]; featured_creators?: string[] }; // Community Curation
  labels: {
    featured_eyebrow: string; featured_eyebrow_th?: string;
    featured_title: string; featured_title_th?: string;
    featured_btn: string; featured_btn_th?: string;
    blog_eyebrow: string; blog_eyebrow_th?: string;
    blog_title: string; blog_title_th?: string;
    blog_btn: string; blog_btn_th?: string;
    nav_shop: string; nav_shop_th?: string;
    nav_artists: string; nav_artists_th?: string;
    nav_blog: string; nav_blog_th?: string;
    nav_digital: string;
    categories_title?: string; categories_title_th?: string;
    categories_subtitle?: string; categories_subtitle_th?: string;
    artists_title?: string; artists_title_th?: string;
    artists_subtitle?: string; artists_subtitle_th?: string;
    artists_btn?: string; artists_btn_th?: string;
    newsletter_title?: string; newsletter_title_th?: string;
    newsletter_body?: string; newsletter_body_th?: string;
    newsletter_btn?: string; newsletter_btn_th?: string;
    newsletter_success?: string; newsletter_success_th?: string;
    community_title?: string; community_title_th?: string;
    community_subtitle?: string; community_subtitle_th?: string;
    community_btn?: string; community_btn_th?: string;
    // Community badges (emoji or uploaded image URL)
    creator_badge?: string; creator_badge_img?: string;
    customer_badge?: string; customer_badge_img?: string;
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
  fontFamily:"'Itim', 'Nunito', sans-serif", logoText:'Fluffy Pub', logoEmoji:'🐰', logoImageCrop:null,
  heroBgColor:'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%)',
  heroTitle:'Color Your World ✨', heroSubtitle:'Adorable coloring books for every dreamer 🌸',
  heroCrop:null, mobileHeroCrop:null, bannerText:'🌟 Free shipping on orders over $30! Use FLUFFY15 for 15% off 🌸',
  bannerBg:'#f472b6', bannerImageCrop:null, bgImageCrop:null,
  sections:['hero','featured','digital_products','categories','artists','newsletter'],
  heroStats:[],
  statBooks: null, statColorists: null, statArtists: null, statRating: null,
  featuredProductIds:[],
  showNewsletter: false,
  maintenance_mode: false,
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
    nav_digital: 'Digital Products',
  },
  footer: DEFAULT_FOOTER,
};

const ThemeContext = createContext<{ theme: ThemeConfig; setTheme:(t:ThemeConfig)=>void; saveTheme:(t:ThemeConfig)=>Promise<void>; }>
  ({ theme:DEFAULT, setTheme:()=>{}, saveTheme:async()=>{} });

const THEME_CACHE_KEY = 'fluffy_theme_cache';

function applyParsed(parsed: any): ThemeConfig {
  delete parsed.heroImage; delete parsed.bgImage;
  if (!parsed.footer) parsed.footer = DEFAULT_FOOTER;
  else parsed.footer = { ...DEFAULT_FOOTER, ...parsed.footer };
  if (!parsed.fontFamily || parsed.fontFamily === "'Nunito', sans-serif" || parsed.fontFamily === '"Nunito", sans-serif') {
    parsed.fontFamily = "'Itim', 'Nunito', sans-serif";
  }
  return { ...DEFAULT, ...parsed };
}

function getCachedTheme(): ThemeConfig {
  try {
    const raw = localStorage.getItem(THEME_CACHE_KEY);
    if (raw) return applyParsed(JSON.parse(raw));
  } catch {}
  return DEFAULT;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(() => getCachedTheme());

  useEffect(() => {
    fetch('/api/theme').then(r=>r.json()).then(t => {
      if (t && typeof t === 'object' && !Array.isArray(t)) {
        const applied = applyParsed(JSON.parse(JSON.stringify(t)));
        try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(t)); } catch {}
        setThemeState(applied);
      }
    }).catch(() => {});
  }, []);

  const setTheme = (t: ThemeConfig) => setThemeState(t);

  const saveTheme = async (t: ThemeConfig) => {
    const token = localStorage.getItem('fluffy_token');
    setThemeState(t);
    try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(t)); } catch {}
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

  return <ThemeContext.Provider value={{ theme, setTheme, saveTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
