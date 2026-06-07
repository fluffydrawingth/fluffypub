import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { useAuth } from './auth';

interface FavCtx {
  favIds: string[];
  toggle: (productId: string) => Promise<void>;
  isFav: (productId: string) => boolean;
}

const FavContext = createContext<FavCtx>({
  favIds: [], toggle: async () => {}, isFav: () => false,
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favIds, setFavIds] = useState<string[]>([]);

  // Load favorites when user logs in
  useEffect(() => {
    if (!user) { setFavIds([]); return; }
    api.getFavorites().then(favs => {
      setFavIds(Array.isArray(favs) ? favs : []);
    }).catch(() => {});
  }, [user?.id]);

  const toggle = async (productId: string) => {
    if (!user) return; // require login — handled by caller
    const isCurrent = favIds.includes(productId);
    // Optimistic update
    setFavIds(prev => isCurrent ? prev.filter(id => id !== productId) : [...prev, productId]);
    try {
      if (isCurrent) await api.removeFavorite(productId);
      else await api.addFavorite(productId);
    } catch {
      // Revert on error
      setFavIds(prev => isCurrent ? [...prev, productId] : prev.filter(id => id !== productId));
    }
  };

  const isFav = (productId: string) => favIds.includes(productId);

  return (
    <FavContext.Provider value={{ favIds, toggle, isFav }}>
      {children}
    </FavContext.Provider>
  );
}

export const useFavorites = () => useContext(FavContext);
