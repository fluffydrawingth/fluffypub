import React, { createContext, useContext, useState } from 'react';

export interface CartVariant {
  id: string;
  name: string;
  price_thb?: number;
}

export interface CartItem {
  id: string;
  title: string;
  price_thb: number;
  image: string;
  artist: string;
  slug?: string;
  type?: string;
  variant?: CartVariant;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  add: (item: Omit<CartItem, 'qty'>) => void;
  remove: (id: string, variantId?: string) => void;
  setQty: (id: string, variantId: string | undefined, qty: number) => void;
  clear: () => void;
  subtotalTHB: number;
  shippingTHB: number;
  totalTHB: number;
  count: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: ()=>{}, remove: ()=>{}, setQty: ()=>{}, clear: ()=>{},
  subtotalTHB: 0, shippingTHB: 0, totalTHB: 0, count: 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (item: Omit<CartItem, 'qty'>) => setItems(prev => {
    const key = item.id + (item.variant?.id || '');
    const existing = prev.find(i => (i.id + (i.variant?.id || '')) === key);
    if (existing) {
      // Increment qty if already in cart
      return prev.map(i => (i.id + (i.variant?.id || '')) === key ? { ...i, qty: i.qty + 1 } : i);
    }
    return [...prev, { ...item, qty: 1 }];
  });

  const remove = (id: string, variantId?: string) => setItems(prev =>
    prev.filter(i => !(i.id === id && (i.variant?.id || '') === (variantId || '')))
  );

  const setQty = (id: string, variantId: string | undefined, qty: number) => {
    if (qty <= 0) { remove(id, variantId); return; }
    setItems(prev => prev.map(i =>
      i.id === id && (i.variant?.id || '') === (variantId || '') ? { ...i, qty } : i
    ));
  };

  const clear = () => setItems([]);

  // Subtotal: sum (effective price × qty)
  const subtotalTHB = items.reduce((s, i) => {
    const p = (i.variant?.price_thb != null && i.variant.price_thb > 0)
      ? i.variant.price_thb : i.price_thb;
    return s + Math.round(Number(p) || 0) * i.qty;
  }, 0);

  // Shipping: count total physical books across all qty
  const physicalCount = items
    .filter(i => i.type === 'physical')
    .reduce((s, i) => s + i.qty, 0);
  const shippingTHB = physicalCount === 1 ? 25 : 0;

  const totalTHB = subtotalTHB + shippingTHB;
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, subtotalTHB, shippingTHB, totalTHB, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
