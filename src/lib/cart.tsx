import React, { createContext, useContext, useState } from 'react';

export interface CartItem {
  id: string;          // API products use string IDs
  title: string;
  price: number;
  image: string;
  artist: string;
}

interface CartCtx {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: () => {}, remove: () => {}, clear: () => {}, total: 0, count: 0
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const add = (item: CartItem) => setItems(prev =>
    prev.find(i => i.id === item.id) ? prev : [...prev, item]
  );
  const remove = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const clear = () => setItems([]);
  const total = items.reduce((s, i) => s + i.price, 0);
  const count = items.length;
  return <CartContext.Provider value={{ items, add, remove, clear, total, count }}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
