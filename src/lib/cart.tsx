import React, { createContext, useContext, useState } from 'react';

export interface CartVariant {
  id: string;
  name: string;
  price_thb?: number;
  price_usd?: number;
  price?: number; // legacy fallback
}

export interface CartItem {
  id: string;
  title: string;
  price: number;       // base USD price (legacy)
  price_thb?: number;  // THB price
  price_usd?: number;  // USD price
  image: string;
  artist: string;
  slug?: string;
  type?: string;       // 'physical' | 'digital' | 'both'
  variant?: CartVariant;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string, variantId?: string) => void;
  clear: () => void;
  total: number;       // USD total
  totalTHB: number;    // THB total
  count: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: ()=>{}, remove: ()=>{}, clear: ()=>{}, total: 0, totalTHB: 0, count: 0
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (item: CartItem) => setItems(prev => {
    const key = item.id + (item.variant?.id || '');
    const exists = prev.find(i => (i.id + (i.variant?.id || '')) === key);
    return exists ? prev : [...prev, item];
  });

  const remove = (id: string, variantId?: string) => setItems(prev =>
    prev.filter(i => !(i.id === id && (i.variant?.id || '') === (variantId || '')))
  );

  const clear = () => setItems([]);

  // USD total — use price_usd if set, else price
  const total = items.reduce((s, i) => {
    const varUSD = i.variant?.price_usd || i.variant?.price;
    const p = varUSD ?? i.price_usd ?? i.price;
    return s + Number(p || 0);
  }, 0);

  // THB total — use price_thb if set, else price * 35
  const totalTHB = items.reduce((s, i) => {
    const varTHB = i.variant?.price_thb;
    const p = varTHB ?? i.price_thb ?? (i.price * 35);
    return s + Math.round(Number(p || 0));
  }, 0);

  const count = items.length;

  return (
    <CartContext.Provider value={{ items, add, remove, clear, total, totalTHB, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
