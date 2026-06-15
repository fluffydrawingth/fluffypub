import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function CartPage() {
  const { theme } = useTheme();
  const { items, increment, decrement, remove, clear, subtotalTHB, shippingTHB, totalTHB, subtotalUSD, totalUSD, totalCount } = useCart();
  const { navigate } = useRouter();
  const { tRaw, currency } = useLang();
  const p = theme.primaryColor;

  const isUSD = currency === 'USD';

  const fmtItem = (item: typeof items[0]) => {
    if (isUSD && item.unitPriceUSD != null) return `$${(item.unitPriceUSD * item.qty).toFixed(2)}`;
    return `฿${(item.unitPriceTHB * item.qty).toLocaleString('th-TH')}`;
  };

  const fmtSubtotal = () => {
    if (isUSD && subtotalUSD != null) return `$${subtotalUSD.toFixed(2)}`;
    return `฿${subtotalTHB.toLocaleString('th-TH')}`;
  };

  const fmtTotal = () => {
    if (isUSD && totalUSD != null) return `$${totalUSD.toFixed(2)}`;
    return `฿${totalTHB.toLocaleString('th-TH')}`;
  };

  const checkoutLabel = isUSD && totalUSD != null
    ? `${tRaw('ชำระเงิน', 'Checkout')} — $${totalUSD.toFixed(2)} 💳`
    : `${tRaw('ชำระเงิน', 'Checkout')} — ฿${totalTHB.toLocaleString('th-TH')} 💳`;

  if (items.length === 0) return (
    <div style={{ fontFamily: theme.fontFamily, minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, textAlign: 'center' as const, padding: 24 }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>🛒</div>
      <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.textColor }}>{tRaw('ตะกร้าว่างเปล่า', 'Your cart is empty!')}</h2>
      <p style={{ color: theme.textColor + '88', marginBottom: 28 }}>{tRaw('เพิ่มสินค้าลงตะกร้าได้เลย 🌸', 'Add some coloring books to get started 🌸')}</p>
      <button onClick={() => navigate('/products')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '14px 32px', borderRadius: 28, fontSize: 16, fontWeight: 800, fontFamily: theme.fontFamily, boxShadow: `0 8px 24px ${p}44` }}>
        {tRaw('ไปช้อปปิ้ง 🎨', 'Start Shopping 🎨')}
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`@media(max-width:640px){.cg{grid-template-columns:1fr!important;}.cs{position:static!important;}}`}</style>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 16px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: theme.textColor, marginBottom: 6 }}>
          {tRaw('ตะกร้าสินค้า', 'Shopping Cart')} 🛒
        </h1>
        <p style={{ color: theme.textColor + '88', marginBottom: 20 }}>{totalCount} {tRaw('รายการ', 'items')}</p>

        <div className="cg" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {items.map(item => (
              <div key={`${item.id}::${item.optionId}`} style={{ background: 'white', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: `linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, overflow: 'hidden' }}>
                  {item.coverImageUrl
                    ? <img src={item.coverImageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : item.image}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: theme.textColor, fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap' as const, textOverflow: 'ellipsis' }}>{item.title}</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    <span style={{ color: p, fontWeight: 600 }}>{item.artist}</span>
                    <span style={{ color: '#6b7280' }}> · {item.optionName}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.optionType === 'digital' ? '⬇️ Digital' : '📦 Physical'}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 7, flexShrink: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: theme.textColor }}>
                    {fmtItem(item)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => decrement(item.id, item.optionId)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${p}40`, background: 'white', color: p, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 700, color: theme.textColor, minWidth: 20, textAlign: 'center' as const }}>{item.qty}</span>
                    <button onClick={() => increment(item.id, item.optionId)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${p}40`, background: 'white', color: p, cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <button onClick={() => remove(item.id, item.optionId)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11, fontWeight: 600, fontFamily: theme.fontFamily, padding: 0 }}>
                    {tRaw('ลบ', 'Remove')}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={clear} style={{ background: 'transparent', border: '1.5px solid #e5e7eb', color: '#9ca3af', cursor: 'pointer', padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600, fontFamily: theme.fontFamily, alignSelf: 'flex-start' as const }}>
              {tRaw('ล้างตะกร้า', 'Clear Cart')}
            </button>
          </div>

          {/* Summary */}
          <div className="cs" style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', position: 'sticky' as const, top: 80 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, color: theme.textColor, marginBottom: 16 }}>{tRaw('สรุปคำสั่งซื้อ', 'Order Summary')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textColor + '99', fontSize: 14 }}>
                <span>{tRaw('ราคาสินค้า', 'Subtotal')}</span>
                <span>{fmtSubtotal()}</span>
              </div>
              {!isUSD && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.textColor + '99', fontSize: 14 }}>
                  <span>{tRaw('ค่าจัดส่ง', 'Shipping')}</span>
                  <span style={{ color: shippingTHB === 0 ? '#10b981' : '#374151', fontWeight: 600 }}>
                    {shippingTHB === 0 ? tRaw('ฟรี', 'Free') : `฿${shippingTHB}`}
                  </span>
                </div>
              )}
              {!isUSD && shippingTHB === 0 && items.some(i => i.optionType === 'physical') && (
                <div style={{ fontSize: 11, color: '#10b981', textAlign: 'right' as const }}>
                  {tRaw('ซื้อ 2+ เล่ม ส่งฟรี 🎉', '2+ books = free shipping 🎉')}
                </div>
              )}
              {isUSD && items.some(i => i.unitPriceUSD == null) && (
                <div style={{ fontSize: 11, color: '#f59e0b', background: '#fef3c7', borderRadius: 8, padding: '6px 8px' }}>
                  ⚠️ Some items don't have USD pricing
                </div>
              )}
              <div style={{ height: 1, background: p + '15' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 19, fontWeight: 900, color: theme.textColor }}>
                <span>{tRaw('ยอดรวม', 'Total')}</span>
                <span style={{ color: p }}>{fmtTotal()}</span>
              </div>
            </div>
            <button onClick={() => navigate('/checkout')} style={{ width: '100%', padding: '14px', borderRadius: 20, background: `linear-gradient(135deg,${p},${theme.secondaryColor || p})`, color: 'white', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 800, fontFamily: theme.fontFamily, boxShadow: `0 8px 24px ${p}44`, marginBottom: 10 }}>
              {checkoutLabel}
            </button>
            <button onClick={() => navigate('/products')} style={{ width: '100%', padding: '10px', background: 'transparent', border: `1.5px solid ${p}30`, color: p, cursor: 'pointer', borderRadius: 18, fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily }}>
              {tRaw('ช้อปต่อ', 'Continue Shopping')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
