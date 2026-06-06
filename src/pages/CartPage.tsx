import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';

export default function CartPage() {
  const { theme } = useTheme();
  const { items, remove, total, clear } = useCart();
  const { navigate } = useRouter();

  if (items.length === 0) {
    return (
      <div style={{ fontFamily: theme.fontFamily, minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 80, marginBottom: 20 }}>🛒</div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.textColor, fontFamily: theme.fontFamily }}>Your cart is empty!</h2>
        <p style={{ color: theme.textColor + '88', marginBottom: 28, fontSize: 16 }}>Add some beautiful coloring books to get started 🌸</p>
        <button onClick={() => navigate('/products')} style={{
          background: theme.primaryColor, color: 'white', border: 'none',
          cursor: 'pointer', padding: '14px 32px', borderRadius: 28,
          fontSize: 16, fontWeight: 800, fontFamily: theme.fontFamily,
          boxShadow: `0 8px 24px ${theme.primaryColor}44`,
        }}>Start Shopping 🎨</button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: theme.textColor, marginBottom: 8 }}>Shopping Cart 🛒</h1>
        <p style={{ color: theme.textColor + '88', marginBottom: 32 }}>{items.length} item{items.length > 1 ? 's' : ''} in your cart</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map(item => (
              <div key={item.id} style={{
                background: 'white', borderRadius: 20, padding: 20,
                display: 'flex', gap: 16, alignItems: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}>
                {/* Thumbnail */}
                <div style={{
                  width: 80, height: 80, borderRadius: 16,
                  background: `linear-gradient(135deg, ${theme.bgColor}, ${theme.bgColor2})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, flexShrink: 0,
                }}>{item.image}</div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: theme.textColor, fontSize: 16, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: theme.primaryColor, fontWeight: 600, marginBottom: 4 }}>{item.artist}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#888' }}>⬇️ PDF Download</span>
                    <span style={{ fontSize: 12, color: '#888' }}>· 🖨️ Printable</span>
                  </div>
                </div>

                {/* Price + Remove */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: theme.textColor, marginBottom: 8 }}>${item.price}</div>
                  <button onClick={() => remove(item.id)} style={{
                    background: '#fee2e2', color: '#ef4444', border: 'none',
                    cursor: 'pointer', padding: '6px 14px', borderRadius: 12,
                    fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily,
                  }}>Remove</button>
                </div>
              </div>
            ))}

            <button onClick={clear} style={{
              background: 'transparent', border: `1.5px solid #e5e7eb`,
              color: '#888', cursor: 'pointer', padding: '10px',
              borderRadius: 12, fontSize: 13, fontWeight: 600,
              fontFamily: theme.fontFamily, alignSelf: 'flex-start',
            }}>Clear Cart</button>
          </div>

          {/* Order Summary */}
          <div style={{
            background: 'white', borderRadius: 24, padding: 28,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            position: 'sticky', top: 80,
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: theme.textColor, marginBottom: 20, fontFamily: theme.fontFamily }}>Order Summary</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textColor + '99', fontSize: 14 }}>
                <span>Subtotal ({items.length} items)</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textColor + '99', fontSize: 14 }}>
                <span>Digital Delivery</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>FREE</span>
              </div>
              <div style={{ height: 1, background: theme.primaryColor + '15' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, color: theme.textColor }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Promo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input placeholder="Promo code" style={{
                flex: 1, padding: '10px 14px', borderRadius: 12,
                border: `1.5px solid ${theme.primaryColor}30`,
                fontSize: 13, outline: 'none', fontFamily: theme.fontFamily,
              }} />
              <button style={{
                background: theme.secondaryColor, color: 'white', border: 'none',
                cursor: 'pointer', padding: '10px 16px', borderRadius: 12,
                fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily,
              }}>Apply</button>
            </div>

            <button onClick={() => navigate('/checkout')} style={{
              width: '100%', padding: '16px', borderRadius: 24,
              background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
              color: 'white', border: 'none', cursor: 'pointer',
              fontSize: 17, fontWeight: 800, fontFamily: theme.fontFamily,
              boxShadow: `0 8px 24px ${theme.primaryColor}44`,
              marginBottom: 12,
            }}>
              Checkout — ${total.toFixed(2)} 💳
            </button>
            <button onClick={() => navigate('/products')} style={{
              width: '100%', padding: '12px',
              background: 'transparent', border: `1.5px solid ${theme.primaryColor}30`,
              color: theme.primaryColor, cursor: 'pointer', borderRadius: 20,
              fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily,
            }}>Continue Shopping</button>

            <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['🔒 Secure', '⚡ Instant Download', '💯 Satisfaction Guaranteed'].map(t => (
                <span key={t} style={{ fontSize: 11, color: theme.textColor + '77', fontWeight: 600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
