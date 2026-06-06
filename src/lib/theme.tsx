import React, { createContext, useContext, useState, useEffect } from 'react';

export interface ThemeConfig {
  primaryColor: string; secondaryColor: string; accentColor: string;
  bgColor: string; bgColor2: string; textColor: string; fontFamily: string;
  logoText: string; logoEmoji: string; logoImageCrop: any | null;
  heroBgColor: string; heroTitle: string; heroSubtitle: string;
  heroCrop: any | null; mobileHeroCrop: any | null;
  bannerText: string; bannerBg: string; bannerImageCrop: any | null;
  bgImageCrop: any | null; sections: string[];
}

const DEFAULT: ThemeConfig = {
  primaryColor:'#f472b6', secondaryColor:'#c084fc', accentColor:'#fb923c',
  bgColor:'#fdf2f8', bgColor2:'#faf5ff', textColor:'#4a1942',
  fontFamily:"'Nunito', sans-serif", logoText:'Fluffy Pub', logoEmoji:'🐰', logoImageCrop:null,
  heroBgColor:'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #fef3c7 100%)',
  heroTitle:'Color Your World ✨', heroSubtitle:'Adorable coloring books for every dreamer 🌸',
  heroCrop:null, mobileHeroCrop:null, bannerText:'🌟 Free shipping on orders over $30! Use FLUFFY15 for 15% off 🌸',
  bannerBg:'#f472b6', bannerImageCrop:null, bgImageCrop:null,
  sections:['hero','featured','categories','artists','newsletter'],
};

const ThemeContext = createContext<{ theme: ThemeConfig; setTheme:(t:ThemeConfig)=>void; saveTheme:(t:ThemeConfig)=>Promise<void>; }>
  ({ theme:DEFAULT, setTheme:()=>{}, saveTheme:async()=>{} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeConfig>(DEFAULT);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load from server
    fetch('/api/theme').then(r=>r.json()).then(t => {
      if (t && typeof t === 'object' && !Array.isArray(t)) {
        const parsed = JSON.parse(JSON.stringify(t));
        delete parsed.heroImage; delete parsed.bgImage; // strip legacy
        setThemeState({ ...DEFAULT, ...parsed });
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setTheme = (t: ThemeConfig) => setThemeState(t);

  const saveTheme = async (t: ThemeConfig) => {
    const token = sessionStorage.getItem('fluffy_token');
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

  if (!loaded) return null; // wait for server theme
  return <ThemeContext.Provider value={{ theme, setTheme, saveTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
