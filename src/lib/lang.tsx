import React, { createContext, useContext, useState } from 'react';

export type Lang = 'th' | 'en';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (th: string, en: string) => string;
  price: (thb?: number|null, usd?: number|null, base?: number) => string;
}

const LangContext = createContext<LangCtx>({ lang:'th', setLang:()=>{}, t:(th,_)=>th, price:(t,u,b)=>`฿${Math.round((t ?? (b ? b * 35 : 0))).toFixed(0)}` });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('fluffy_lang') as Lang) || 'th';
  const [lang, setLangState] = useState<Lang>(stored);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('fluffy_lang', l);
  };

  // Return Thai or English text
  const t = (th: string, en: string) => lang === 'th' ? th : en;

  // Show price in correct currency
  const price = (thb?: number|null, usd?: number|null, base?: number) => {
    if (lang === 'th') {
      // THB: use price_thb if set, else multiply base by 35, else show base with ฿
      const amount = (thb != null && thb > 0) ? thb : (base ? Math.round(base * 35) : 0);
      return `฿${Number(amount).toFixed(0)}`;
    }
    // USD: use price_usd if set, else use base price
    const amount = (usd != null && usd > 0) ? usd : (base ?? 0);
    return `$${Number(amount).toFixed(2)}`;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, price }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
