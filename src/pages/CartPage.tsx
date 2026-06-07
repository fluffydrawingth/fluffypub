import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function CartPage() {
  const { theme } = useTheme();
  const { items, subtotalTHB, shippingTHB, totalTHB, remove, setQty, clear } = useCart();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  if (items.length === 0) {
    return (
      <div style={{ fontFamily:theme.fontFamily, minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' as const, textAlign:'center' as const, padding:24 }}>
        <div style={{ fontSize:80, marginBottom:20 }}>🛒</div>
        <h2 style={{ fontSize:28, fontWeight:900, color:theme.textColor }}>{tRaw('ตะกร้าว่างเปล่า','Your cart is empty!')}</h2>
        <p style={{ color:theme.textColor+'88', marginBottom:28, fontSize:16 }}>{tRaw('เพิ่มสินค้าลงตะกร้าได้เลย 🌸','Add some coloring books to get started 🌸')}</p>
        <button onClick={()=>navigate('/products')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'14px 32px', borderRadius:28, fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44` }}>
          {tRaw('ไปช้อปปิ้ง 🎨','Start Shopping 🎨')}
        </button>
      </div>
    );
  }

  const qtyBtn = (label: string, onClick: () => void, disabled = false) => (
    <button onClick={onClick} disabled={disabled} style={{
      width:30, height:30, borderRadius:8, border:`1.5px solid ${disabled ? '#e5e7eb' : p}`,
      background:disabled?'#f9fafb':'white', color:disabled?'#d1d5db':p,
      cursor:disabled?'not-allowed':'pointer', fontSize:16, fontWeight:700,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    }}>{label}</button>
  );

  return (
    <div style={{ fontFamily:theme.fontFamily, background:theme.bgColor, minHeight:'70vh' }}>
      <style>{`@media(max-width:640px){.cart-grid{grid-template-columns:1fr!important;}.cart-summary{position:static!important;}}`}</style>
      <div style={{ maxWidth:920, margin:'0 auto', padding:'32px 16px' }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:theme.textColor, marginBottom:6 }}>
          {tRaw('ตะกร้าสินค้า 🛒','Shopping Cart 🛒')}
        </h1>
        <p style={{ color:theme.textColor+'88', marginBottom:24 }}>
          {items.reduce((s,i)=>s+i.qty,0)} {tRaw('รายการ','items')}
        </p>

        <div className="cart-grid" style={{ display:'grid', gridTemplateColumns:'1fr 310px', gap:20, alignItems:'start' }}>

          {/* Items */}
          <div style={{ display:'flex', flexDirection:'column' as const, gap:12 }}>
            {items.map(item => {
              const itemPrice = (item.variant?.price_thb != null && item.variant.price_thb > 0)
                ? item.variant.price_thb : item.price_thb;
              const itemTotal = itemPrice * item.qty;
              const vid = item.variant?.id;
              return (
                <div key={item.id + (vid || '')} style={{ background:'white', borderRadius:16, padding:16, display:'flex', gap:14, alignItems:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.06)' }}>
                  {/* Thumb */}
                  <div style={{ width:68, height:68, borderRadius:12, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:30, flexShrink:0, overflow:'hidden' }}>
                    {item.image}
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:800, color:theme.textColor, fontSize:14, marginBottom:2, overflow:'hidden', whiteSpace:'nowrap' as const, textOverflow:'ellipsis' }}>{item.title}</div>
                    <div style={{ fontSize:12, color:p, fontWeight:600 }}>
                      {item.artist}
                      {item.variant && <span style={{ color:'#6b7280', fontWeight:500 }}> · {item.variant.name}</span>}
                    </div>
                    <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>
                      {item.type === 'physical' ? '📦' : item.type === 'digital' ? '⬇️' : ''} {item.type === 'physical' ? tRaw('หนังสือ','Physical') : item.type === 'digital' ? tRaw('ไฟล์ดิจิทัล','Digital') : ''}
                    </div>
                  </div>

                  {/* Qty + price + remove */}
                  <div style={{ display:'flex', flexDirection:'column' as const, alignItems:'flex-end', gap:8, flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:900, color:theme.textColor }}>
                      ฿{itemTotal.toLocaleString('th-TH')}
                    </div>
                    {/* Qty controls */}
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {qtyBtn('−', () => setQty(item.id, vid, item.qty - 1), item.qty <= 1)}
                      <span style={{ fontSize:14, fontWeight:700, color:theme.textColor, minWidth:20, textAlign:'center' as const }}>{item.qty}</span>
                      {qtyBtn('+', () => setQty(item.id, vid, item.qty + 1))}
                    </div>
                    <button onClick={()=>remove(item.id, vid)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:11, fontWeight:600, fontFamily:theme.fontFamily, padding:0 }}>
                      {tRaw('ลบ','Remove')}
                    </button>
                  </div>
                </div>
              );
            })}

            <button onClick={clear} style={{ background:'transparent', border:'1.5px solid #e5e7eb', color:'#9ca3af', cursor:'pointer', padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:600, fontFamily:theme.fontFamily, alignSelf:'flex-start' as const }}>
              {tRaw('ล้างตะกร้า','Clear Cart')}
            </button>
          </div>

          {/* Summary */}
          <div className="cart-summary" style={{ background:'white', borderRadius:18, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.06)', position:'sticky' as const, top:80 }}>
            <h3 style={{ fontSize:17, fontWeight:900, color:theme.textColor, marginBottom:16 }}>{tRaw('สรุปคำสั่งซื้อ','Order Summary')}</h3>

            <div style={{ display:'flex', flexDirection:'column' as const, gap:10, marginBottom:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between', color:theme.textColor+'99', fontSize:14 }}>
                <span>{tRaw('ราคาสินค้า','Subtotal')}</span>
                <span>฿{subtotalTHB.toLocaleString('th-TH')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', color:theme.textColor+'99', fontSize:14 }}>
                <span>{tRaw('ค่าจัดส่ง','Shipping')}</span>
                <span style={{ color:shippingTHB===0?'#10b981':'#374151', fontWeight:600 }}>
                  {shippingTHB === 0 ? tRaw('ฟรี','Free') : `฿${shippingTHB}`}
                </span>
              </div>
              {shippingTHB === 0 && items.some(i => i.type === 'physical') && (
                <div style={{ fontSize:11, color:'#10b981', textAlign:'right' as const }}>
                  {tRaw('ซื้อ 2+ เล่มขึ้นไป ส่งฟรี','2+ books = free shipping')} 🎉
                </div>
              )}
              <div style={{ height:1, background:p+'15' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:900, color:theme.textColor }}>
                <span>{tRaw('ยอดรวม','Total')}</span>
                <span style={{ color:p }}>฿{totalTHB.toLocaleString('th-TH')}</span>
              </div>
            </div>

            <button onClick={()=>navigate('/checkout')} style={{ width:'100%', padding:'14px', borderRadius:20, background:`linear-gradient(135deg,${p},${theme.secondaryColor||p})`, color:'white', border:'none', cursor:'pointer', fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44`, marginBottom:10 }}>
              {tRaw('ชำระเงิน','Checkout')} — ฿{totalTHB.toLocaleString('th-TH')} 💳
            </button>
            <button onClick={()=>navigate('/products')} style={{ width:'100%', padding:'10px', background:'transparent', border:`1.5px solid ${p}30`, color:p, cursor:'pointer', borderRadius:18, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>
              {tRaw('ช้อปต่อ','Continue Shopping')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
