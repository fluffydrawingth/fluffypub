import React, { createContext, useContext, useState } from 'react';

export interface CartVariant {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  artist: string;
  slug?: string;
  type?: string;
  variant?: CartVariant;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string, variantId?: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: () => {}, remove: () => {}, clear: () => {}, total: 0, count: 0
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (item: CartItem) => setItems(prev => {
    // If same product + same variant already in cart, skip
    const key = item.id + (item.variant?.id || '');
    const exists = prev.find(i => (i.id + (i.variant?.id || '')) === key);
    return exists ? prev : [...prev, item];
  });

  const remove = (id: string, variantId?: string) => setItems(prev =>
    prev.filter(i => !(i.id === id && (i.variant?.id || '') === (variantId || '')))
  );

  const clear = () => setItems([]);
  const total = items.reduce((s, i) => s + i.price, 0);
  const count = items.length;

  return (
    <CartContext.Provider value={{ items, add, remove, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
