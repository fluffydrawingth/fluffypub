import React from 'react';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

export default function CartPage() {
  const { theme } = useTheme();
  const { items, subtotalTHB, shippingTHB, totalTHB, remove, clear } = useCart();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;

  if (items.length === 0) {
    return (
      <div style={{ fontFamily:theme.fontFamily, minHeight:'70vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column' as const, textAlign:'center' as const, padding:24 }}>
        <div style={{ fontSize:80, marginBottom:20 }}>🛒</div>
        <h2 style={{ fontSize:28, fontWeight:900, color:theme.textColor, fontFamily:theme.fontFamily }}>{tRaw('ตะกร้าว่างเปล่า','Your cart is empty!')}</h2>
        <p style={{ color:theme.textColor+'88', marginBottom:28, fontSize:16 }}>{tRaw('เพิ่มสินค้าลงตะกร้าได้เลย 🌸','Add some beautiful coloring books to get started 🌸')}</p>
        <button onClick={()=>navigate('/products')} style={{ background:p, color:'white', border:'none', cursor:'pointer', padding:'14px 32px', borderRadius:28, fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44` }}>
          {tRaw('ไปช้อปปิ้ง 🎨','Start Shopping 🎨')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:theme.fontFamily, background:theme.bgColor, minHeight:'70vh' }}>
      <style>{`@media(max-width:640px){.cart-grid{grid-template-columns:1fr!important;}.cart-summary{position:static!important;}}`}</style>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 16px' }}>
        <h1 style={{ fontSize:28, fontWeight:900, color:theme.textColor, marginBottom:6 }}>{tRaw('ตะกร้าสินค้า 🛒','Shopping Cart 🛒')}</h1>
        <p style={{ color:theme.textColor+'88', marginBottom:24 }}>{items.length} {tRaw('รายการ','item')}{items.length > 1 ? 's' : ''}</p>

        <div className="cart-grid" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20, alignItems:'start' }}>
          {/* Items */}
          <div style={{ display:'flex', flexDirection:'column' as const, gap:14 }}>
            {items.map(item => (
              <div key={item.id + (item.variant?.id || '')} style={{ background:'white', borderRadius:18, padding:18, display:'flex', gap:14, alignItems:'center', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ width:72, height:72, borderRadius:14, background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, flexShrink:0 }}>
                  {item.image}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, color:theme.textColor, fontSize:15, marginBottom:3 }}>{item.title}</div>
                  <div style={{ fontSize:12, color:p, fontWeight:600 }}>
                    {item.artist}{item.variant ? <span style={{color:'#6b7280',fontWeight:500}}> · {item.variant.name}</span> : null}
                  </div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
                    {item.type === 'digital' ? '⬇️ ไฟล์ดิจิทัล' : item.type === 'physical' ? '📦 หนังสือ' : ''}
                  </div>
                </div>
                <div style={{ textAlign:'right' as const, flexShrink:0 }}>
                  <div style={{ fontSize:20, fontWeight:900, color:theme.textColor, marginBottom:6 }}>
                    ฿{Number(item.price_thb || 0).toLocaleString('th-TH')}
                  </div>
                  <button onClick={()=>remove(item.id, item.variant?.id)} style={{ background:'#fee2e2', color:'#ef4444', border:'none', cursor:'pointer', padding:'5px 12px', borderRadius:10, fontSize:12, fontWeight:700, fontFamily:theme.fontFamily }}>
                    {tRaw('ลบ','Remove')}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={clear} style={{ background:'transparent', border:'1.5px solid #e5e7eb', color:'#888', cursor:'pointer', padding:'9px', borderRadius:12, fontSize:13, fontWeight:600, fontFamily:theme.fontFamily, alignSelf:'flex-start' as const }}>
              {tRaw('ล้างตะกร้า','Clear Cart')}
            </button>
          </div>

          {/* Summary */}
          <div className="cart-summary" style={{ background:'white', borderRadius:20, padding:22, boxShadow:'0 2px 12px rgba(0,0,0,0.06)', position:'sticky' as const, top:80 }}>
            <h3 style={{ fontSize:18, fontWeight:900, color:theme.textColor, marginBottom:18 }}>{tRaw('สรุปคำสั่งซื้อ','Order Summary')}</h3>
            <div style={{ display:'flex', flexDirection:'column' as const, gap:10, marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', color:theme.textColor+'99', fontSize:14 }}>
                <span>{tRaw('ราคาสินค้า','Subtotal')} ({items.length})</span>
                <span>฿{subtotalTHB.toLocaleString('th-TH')}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', color:theme.textColor+'99', fontSize:14 }}>
                <span>{tRaw('ค่าจัดส่ง','Shipping')}</span>
                <span style={{ color:shippingTHB===0?'#10b981':'inherit', fontWeight:600 }}>
                  {shippingTHB === 0 ? tRaw('ฟรี','Free') : `฿${shippingTHB}`}
                </span>
              </div>
              <div style={{ height:1, background:p+'15' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:20, fontWeight:900, color:theme.textColor }}>
                <span>{tRaw('ยอดรวม','Total')}</span>
                <span style={{ color:p }}>฿{totalTHB.toLocaleString('th-TH')}</span>
              </div>
            </div>

            <button onClick={()=>navigate('/checkout')} style={{ width:'100%', padding:'15px', borderRadius:22, background:`linear-gradient(135deg,${p},${theme.secondaryColor||p})`, color:'white', border:'none', cursor:'pointer', fontSize:16, fontWeight:800, fontFamily:theme.fontFamily, boxShadow:`0 8px 24px ${p}44`, marginBottom:10 }}>
              {tRaw('ชำระเงิน','Checkout')} — ฿{totalTHB.toLocaleString('th-TH')} 💳
            </button>
            <button onClick={()=>navigate('/products')} style={{ width:'100%', padding:'11px', background:'transparent', border:`1.5px solid ${p}30`, color:p, cursor:'pointer', borderRadius:20, fontSize:14, fontWeight:700, fontFamily:theme.fontFamily }}>
              {tRaw('ช้อปต่อ','Continue Shopping')}
            </button>

            <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' as const, justifyContent:'center' as const }}>
              {[tRaw('🔒 ปลอดภัย','🔒 Secure'), tRaw('⚡ ดาวน์โหลดทันที','⚡ Instant Download'), tRaw('💯 มั่นใจ 100%','💯 Guaranteed')].map(t => (
                <span key={t} style={{ fontSize:11, color:theme.textColor+'77', fontWeight:600 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
