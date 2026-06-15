import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  title: string;
  image: string;
  coverImageUrl?: string;
  artist: string;
  slug?: string;
  optionId: string;
  optionName: string;
  optionType: 'physical' | 'digital';
  unitPriceTHB: number;
  unitPriceUSD: number | null;
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
  subtotalUSD: number | null;
  totalUSD: number | null;
  totalCount: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: () => {}, increment: () => {}, decrement: () => {}, remove: () => {}, clear: () => {},
  subtotalTHB: 0, shippingTHB: 0, totalTHB: 0,
  subtotalUSD: null, totalUSD: null,
  totalCount: 0,
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

  const physicalQty = items.filter(i => i.optionType === 'physical').reduce((s, i) => s + i.qty, 0);
  const shippingTHB = physicalQty === 0 ? 0 : physicalQty === 1 ? 25 : 0;

  const totalTHB = subtotalTHB + shippingTHB;
  const totalCount = items.reduce((s, i) => s + i.qty, 0);

  // USD totals — null if any item is missing a USD price
  const hasAllUSD = items.length > 0 && items.every(i => i.unitPriceUSD != null && i.unitPriceUSD > 0);
  const subtotalUSD = hasAllUSD
    ? items.reduce((s, i) => s + (i.unitPriceUSD ?? 0) * i.qty, 0)
    : null;
  // Shipping is THB-only (physical books ship within Thailand); digital-only orders have no shipping
  const totalUSD = subtotalUSD != null ? subtotalUSD : null;

  return (
    <CartContext.Provider value={{ items, add, increment, decrement, remove, clear, subtotalTHB, shippingTHB, totalTHB, subtotalUSD, totalUSD, totalCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
