import React, { createContext, useContext, useState } from 'react';

export type Lang = 'th' | 'en';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (th: string, en: string) => string;
  price: (thb?: number|null, usd?: number|null, base?: number) => string;
}

const LangContext = createContext<LangCtx>({ lang:'en', setLang:()=>{}, t:(_,e)=>e, price:(t,u,b)=>`$${u||b||0}` });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('fluffy_lang') as Lang) || 'en';
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
      const amount = thb ?? (base ? base * 35 : 0);
      return `฿${Number(amount).toFixed(0)}`;
    }
    const amount = usd ?? base ?? 0;
    return `$${Number(amount).toFixed(2)}`;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t, price }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
