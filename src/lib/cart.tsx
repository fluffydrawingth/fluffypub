import React, { createContext, useContext, useState } from 'react';

export interface CartVariant {
  id: string;
  name: string;
  price_thb?: number;
}

export interface CartItem {
  id: string;
  title: string;
  price_thb: number;   // THB — the only price used everywhere
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
  subtotalTHB: number;
  shippingTHB: number;
  totalTHB: number;
  count: number;
}

const CartContext = createContext<CartCtx>({
  items: [], add: ()=>{}, remove: ()=>{}, clear: ()=>{},
  subtotalTHB: 0, shippingTHB: 0, totalTHB: 0, count: 0,
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

  // THB subtotal — sum variant price if selected, else item price
  const subtotalTHB = items.reduce((s, i) => {
    const p = (i.variant?.price_thb != null && i.variant.price_thb > 0)
      ? i.variant.price_thb
      : i.price_thb;
    return s + Math.round(Number(p) || 0);
  }, 0);

  // Shipping: 1 physical = 25 THB, 2+ = free, digital = 0
  const physicalCount = items.filter(i => i.type === 'physical').length;
  const shippingTHB = physicalCount === 1 ? 25 : 0;
  const totalTHB = subtotalTHB + shippingTHB;
  const count = items.length;

  return (
    <CartContext.Provider value={{ items, add, remove, clear, subtotalTHB, shippingTHB, totalTHB, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
