import React, { createContext, useContext, useState, useEffect } from 'react';

export type Route = { path: string; params?: Record<string, string> };
interface RouterCtx { route: Route; navigate: (path: string) => void; }

const RouterContext = createContext<RouterCtx>({ route: { path: '/' }, navigate: () => {} });

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash.slice(1) || '/'));
  useEffect(() => {
    const h = () => { setRoute(parse(window.location.hash.slice(1) || '/')); window.scrollTo(0,0); };
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  const navigate = (path: string) => { window.location.hash = path; };
  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

function parse(hash: string): Route {
  // Supabase auth callbacks arrive as ?access_token=...&type=recovery (no leading slash)
  if (hash.includes('type=recovery')) return { path: '/reset-password' };
  if (hash.includes('type=signup') || hash.includes('type=email_change')) return { path: '/login' };
  const p = hash.split('/').filter(Boolean);
  if (!p.length) return { path: '/' };
  if (p[0]==='products' && p[1]) return { path:'/products/:slug', params:{ slug:p[1] } };
  if (p[0]==='products') return { path:'/products' };
  if (p[0]==='digital-products') return { path:'/digital-products' };
  if (p[0]==='cart') return { path:'/cart' };
  if (p[0]==='checkout') return { path:'/checkout' };
  if (p[0]==='checkout' && p[1]==='success') return { path:'/checkout/success', params:{ orderId:p[2]||'' } };
  if (p[0]==='artists' && p[1]) return { path:'/artists/:slug', params:{ slug:p[1] } };
  if (p[0]==='artists') return { path:'/artists' };
  if (p[0]==='login') return { path:'/login' };
  if (p[0]==='reset-password') return { path:'/reset-password' };
  if (p[0]==='account') return { path:'/account', params:{ tab:p[1]||'' } };
  if (p[0]==='artist-dashboard') return { path:'/artist-dashboard', params:{ tab:p[1]||'overview' } };
  if (p[0]==='admin') return { path:'/admin', params:{ tab:p[1]||'dashboard' } };
  if (p[0]==='pages' && !p[1]) return { path:'/pages' };
  if (p[0]==='pages' && p[1]) return { path:'/pages/:slug', params:{ slug:p[1] } };
  if (p[0]==='guest-order' && p[1]) return { path:'/guest-order/:token', params:{ token:p[1] } };
  if (p[0]==='track-order') return { path:'/track-order' };
  if (p[0]==='free-downloads' && p[1]) return { path:'/free-downloads/:slug', params:{ slug:p[1] } };
  if (p[0]==='free-downloads') return { path:'/free-downloads' };
  return { path:'/' };
}

export const useRouter = () => useContext(RouterContext);
