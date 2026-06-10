import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  title: string;
  image: string;
  coverImageUrl?: string;
  artist: string;
  slug?: string;
  // Option (variant or digital)
  optionId: string;          // variant.id or 'digital'
  optionName: string;        // e.g. "สันห่วงปกติ" or "Digital file"
  optionType: 'physical' | 'digital';
  unitPriceTHB: number;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>) => void;
  increment: (id: string, optionId: string) => void;
  decrement: (id: string, optionId: string) => void;
  remove: (id: string, optionId: string) => void;
  clear: () => void;
  subtotalTHB: number;
  shippingTHB: number;
  totalTHB: number;
  totalCount: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: ()=>{}, increment: ()=>{}, decrement: ()=>{}, remove: ()=>{}, clear: ()=>{},
  subtotalTHB: 0, shippingTHB: 0, totalTHB: 0, totalCount: 0,
});

const key = (id: string, optionId: string) => `${id}::${optionId}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('fluffy_cart');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('fluffy_cart', JSON.stringify(items)); } catch {}
  }, [items]);

  const add = (item: Omit<CartItem, 'qty'>) => setItems(prev => {
    const k = key(item.id, item.optionId);
    if (prev.find(i => key(i.id, i.optionId) === k)) {
      return prev.map(i => key(i.id, i.optionId) === k ? { ...i, qty: i.qty + 1 } : i);
    }
    return [...prev, { ...item, qty: 1 }];
  });

  const increment = (id: string, optionId: string) => setItems(prev =>
    prev.map(i => key(i.id, i.optionId) === key(id, optionId) ? { ...i, qty: i.qty + 1 } : i)
  );

  const decrement = (id: string, optionId: string) => setItems(prev => {
    const k = key(id, optionId);
    return prev.flatMap(i => {
      if (key(i.id, i.optionId) !== k) return [i];
      return i.qty <= 1 ? [] : [{ ...i, qty: i.qty - 1 }];
    });
  });

  const remove = (id: string, optionId: string) => setItems(prev =>
    prev.filter(i => key(i.id, i.optionId) !== key(id, optionId))
  );

  const clear = () => setItems([]);

  const subtotalTHB = items.reduce((s, i) => s + i.unitPriceTHB * i.qty, 0);

  // Shipping: total qty of physical items
  const physicalQty = items
    .filter(i => i.optionType === 'physical')
    .reduce((s, i) => s + i.qty, 0);
  const shippingTHB = physicalQty === 0 ? 0 : physicalQty === 1 ? 25 : 0;

  const totalTHB = subtotalTHB + shippingTHB;
  const totalCount = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, increment, decrement, remove, clear, subtotalTHB, shippingTHB, totalTHB, totalCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
