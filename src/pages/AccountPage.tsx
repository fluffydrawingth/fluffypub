import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useLang } from '../lib/lang';

type Tab = 'orders' | 'favorites' | 'profile';

export default function AccountPage() {
  const { theme } = useTheme();
  const { route, navigate } = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [tab, setTab] = useState<Tab>(() => { const t = route.params?.tab; return (t === 'orders' || t === 'profile' || t === 'favorites') ? t as Tab : 'orders'; });
  const { t, tRaw, lang } = useLang();
  const p = theme.primaryColor;

  if (!user) {
    React.useEffect(() => { navigate('/login'); }, []);
    return null;
  }

  const tabs: [string,string,string][] = [['orders','📦',tRaw('คำสั่งซื้อ','Orders')],['profile','👤',tRaw('โปรไฟล์','Profile')],['favorites','❤️',tRaw('รายการโปรด','Favorites')]];

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:theme.fontFamily }}>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:p+'20', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>👤</div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, color:'#1e293b', margin:0 }}>{user.name}</h1>
            <div style={{ fontSize:13, color:'#64748b' }}>{user.email}</div>
          </div>
          <button onClick={async()=>{await logout();navigate('/');}} style={{ marginLeft:'auto', background:'#fef2f2', border:'1.5px solid #fca5a5', color:'#ef4444', cursor:'pointer', padding:'8px 16px', borderRadius:12, fontSize:13, fontWeight:700, fontFamily:theme.fontFamily }}>Sign Out</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          {tabs.map(([id,icon,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{ padding:'9px 18px', borderRadius:20, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background:tab===id?p:p+'12', color:tab===id?'white':p, fontFamily:theme.fontFamily }}>
              {icon} {label}
            </button>
          ))}
        </div>

        {tab==='orders' && <OrdersTab p={p} theme={theme} />}
        {tab==='favorites' && <FavoritesTab p={p} theme={theme} navigate={navigate} />}
        {tab==='profile' && <ProfileTab user={user} p={p} theme={theme} refreshUser={refreshUser} />}
      </div>
    </div>
  );
}

function OrdersTab({p,theme}:any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [slipUploading, setSlipUploading] = useState(false);
  const { tRaw, lang } = useLang();
  const STATUS_COLORS: Record<string,string> = {
    pending_payment:'#fef3c7', paid:'#d1fae5', packing:'#dbeafe', shipped:'#e0e7ff', delivered:'#d1fae5', cancelled:'#fee2e2',
  };
  const STATUS_TEXT: Record<string,string[]> = {
    pending_payment:['#d97706','รอชำระเงิน','Pending Payment'],
    paid:['#059669','ชำระแล้ว','Paid'],
    packing:['#2563eb','กำลังแพ็ค','Preparing'],
    shipped:['#7c3aed','จัดส่งแล้ว','Shipped'],
    delivered:['#059669','ได้รับแล้ว','Delivered'],
    cancelled:['#dc2626','ยกเลิก','Cancelled'],
  };

  useEffect(() => { api.myOrders().then(o=>{ setOrders(Array.isArray(o)?o:[]); setLoading(false); }); }, []);

  const uploadSlip = async (orderId: string, file: File) => {
    setSlipUploading(true);
    try {
      console.log('[slip upload] starting for order:', orderId, 'file:', file.name, file.type, file.size);
      const result = await api.uploadFile(file, 'slips');
      if (result.error) {
        console.error('[slip upload] error:', result.error);
        alert(tRaw(`อัปโหลดไม่สำเร็จ: ${result.error}`, `Upload failed: ${result.error}`));
        setSlipUploading(false);
        return;
      }
      console.log('[slip upload] uploaded to:', result.publicUrl);
      const token = localStorage.getItem('fluffy_token');
      const saveRes = await fetch(`/api/orders?action=slip&id=${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token||''}` },
        body: JSON.stringify({ slip_url: result.publicUrl }),
      });
      const saveData = await saveRes.json();
      if (saveData.error) {
        console.error('[slip upload] save error:', saveData.error);
        alert(tRaw(`บันทึกไม่สำเร็จ: ${saveData.error}`, `Save failed: ${saveData.error}`));
        setSlipUploading(false);
        return;
      }
      console.log('[slip upload] saved to order OK');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, slip_url: result.publicUrl } : o));
      if (selected?.id === orderId) setSelected((s: any) => ({ ...s, slip_url: result.publicUrl }));
    } catch (e: any) {
      console.error('[slip upload] exception:', e.message);
      alert(tRaw('เกิดข้อผิดพลาด', 'Error: ' + e.message));
    }
    setSlipUploading(false);
  };

  const fmtAddr = (sa:any) => {
    if (!sa) return '';
    if (typeof sa==='string') return sa;
    return [sa.address,sa.province,sa.postal_code,sa.country].filter(Boolean).join(', ');
  };

  if (loading) return <div style={{ textAlign:'center', padding:40, color:'#888' }}>Loading...</div>;
  if (!orders.length) return (
    <div style={{ textAlign:'center', padding:'60px 24px', background:'white', borderRadius:20 }}>
      <div style={{ fontSize:56, marginBottom:14 }}>📦</div>
      <h3 style={{ color:'#1e293b', fontWeight:800 }}>{tRaw('ยังไม่มีคำสั่งซื้อ','No orders yet')}</h3>
    </div>
  );

  if (selected) return (
    <div style={{background:'white',borderRadius:20,padding:24,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
      <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',cursor:'pointer',color:p,fontSize:13,fontWeight:600,marginBottom:16,padding:0}}>
        ← {tRaw('กลับ','Back to Orders')}
      </button>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
        <div>
          <div style={{fontWeight:900,color:'#1e293b',fontSize:18}}>#{selected.id.slice(-8).toUpperCase()}</div>
          <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>{new Date(selected.created_at||selected.createdAt).toLocaleString(lang==='th'?'th-TH':'en-US')}</div>
        </div>
        {STATUS_TEXT[selected.status]&&<span style={{background:STATUS_COLORS[selected.status]||'#f1f5f9',color:STATUS_TEXT[selected.status]?.[0]||'#6b7280',borderRadius:20,padding:'5px 14px',fontSize:12,fontWeight:700}}>{lang==='th'?STATUS_TEXT[selected.status]?.[1]:STATUS_TEXT[selected.status]?.[2]}</span>}
      </div>

      {/* Products */}
      <div style={{borderTop:'1px solid #f3f4f6',borderBottom:'1px solid #f3f4f6',padding:'14px 0',marginBottom:14}}>
        {(selected.items||[]).map((i:any,idx:number)=>(
          <div key={idx} style={{display:'flex',gap:10,alignItems:'center',marginBottom:8}}>
            <span style={{fontSize:26}}>{i.image}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,color:'#1e293b',fontSize:14}}>{i.title}</div>
              {i.variant&&<div style={{fontSize:11,color:p,fontWeight:600}}>{i.variant.name}</div>}
            </div>
            <span style={{fontWeight:800,color:'#1e293b'}}>฿{Number(i.price_thb||(i.price*35)).toLocaleString('th-TH')}</span>
          </div>
        ))}
        {selected.shipping_thb>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#64748b',marginTop:8}}><span>{tRaw('ค่าจัดส่ง','Shipping')}</span><span>฿{selected.shipping_thb}</span></div>}
        <div style={{display:'flex',justifyContent:'space-between',fontWeight:900,color:'#1e293b',fontSize:16,marginTop:8}}>
          <span>{tRaw('ยอดรวม','Total')}</span>
          <span>฿{Number(selected.total_thb||selected.total_amount||(parseFloat(selected.total||'0')*35)).toLocaleString('th-TH')}</span>
        </div>
      </div>

      {/* Shipping address */}
      {selected.shipping_address&&<div style={{background:'#f9fafb',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:13,color:'#374151'}}>
        <div style={{fontWeight:700,marginBottom:4}}>📍 {tRaw('ที่อยู่จัดส่ง','Shipping Address')}</div>
        <div>{selected.customer_name}</div>
        <div>{fmtAddr(selected.shipping_address)}</div>
        {selected.customer_phone&&<div>{selected.customer_phone}</div>}
      </div>}

      {/* Tracking */}
      {selected.tracking_number&&<div style={{background:'#dbeafe',borderRadius:12,padding:'12px 14px',marginBottom:14,fontSize:13,color:'#1d4ed8',fontWeight:600}}>
        🚚 {selected.shipping_provider}: {selected.tracking_number}
      </div>}

      {/* Slip upload */}
      {selected.status==='pending_payment'&&<div style={{marginBottom:14}}>
        <div style={{fontWeight:700,fontSize:13,color:'#374151',marginBottom:8}}>{tRaw('อัปโหลดสลิปการโอนเงิน','Upload Payment Slip')}</div>
        {selected.slip_url?(
          <div style={{background:'#d1fae5',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#065f46',fontWeight:600}}>✅ {tRaw('อัปโหลดสลิปแล้ว','Slip uploaded')}</div>
        ):(
          <label style={{display:'block',cursor:'pointer'}}>
            <div style={{background:p+'10',border:`2px dashed ${p}40`,borderRadius:12,padding:14,textAlign:'center' as const,fontSize:13,color:p,fontWeight:600}}>
              {slipUploading?'⏳ ...':'📷 '+tRaw('อัปโหลดสลิป','Upload slip')}
            </div>
            <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];if(f)uploadSlip(selected.id,f);}} />
          </label>
        )}
      </div>}

      {/* Download links */}
      {(selected.items||[]).filter((i:any)=>i.digital_download_url).map((i:any,idx:number)=>(
        <a key={idx} href={i.digital_download_url} target="_blank" rel="noreferrer" style={{display:'block',background:p,color:'white',textDecoration:'none',padding:'12px 16px',borderRadius:12,fontSize:14,fontWeight:700,textAlign:'center' as const,marginBottom:8}}>
          ⬇️ {tRaw('ดาวน์โหลด','Download')}: {i.title}
        </a>
      ))}
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {orders.map(o=>(
        <div key={o.id} onClick={()=>setSelected(o)} style={{ background:'white', borderRadius:18, padding:20, boxShadow:'0 2px 10px rgba(0,0,0,0.05)', cursor:'pointer', border:`1.5px solid ${p}10` }}
          onMouseEnter={e=>e.currentTarget.style.borderColor=p+'40'}
          onMouseLeave={e=>e.currentTarget.style.borderColor=p+'10'}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
            <div>
              <div style={{ fontWeight:800, color:'#1e293b', marginBottom:3 }}>#{o.id.slice(-8).toUpperCase()}</div>
              <div style={{ fontSize:12, color:'#94a3b8' }}>{new Date(o.created_at||o.createdAt).toLocaleDateString(lang==='th'?'th-TH':'en-US')}</div>
            </div>
            <span style={{ background:STATUS_COLORS[o.status]||'#f1f5f9', color:o.status==='delivered'||o.status==='paid'?'#059669':'#d97706', borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700 }}>
              {STATUS_TEXT[o.status]||o.status}
            </span>
          </div>
          {o.items.map((i:any)=>(
            <div key={i.productId} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:26 }}>{i.image}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{i.title}</div>
                <div style={{ fontSize:12, color:'#888' }}>{i.type==='digital'?'⬇️ Digital Download':'📦 Physical'}</div>
              </div>
              <span style={{ fontWeight:800, color:'#1e293b' }}>${i.price}</span>
            </div>
          ))}
          <div style={{ borderTop:'1px solid #f1f5f9', marginTop:10, paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, color:'#64748b' }}>Total: <strong style={{color:'#1e293b'}}>${o.total}</strong></div>
            {o.paymentStatus==='paid'&&o.type==='digital'&&(
              <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end'}}>
                {o.items?.some((i:any)=>i.digital_download_url||i.download_instruction) ? (
                  o.items?.filter((i:any)=>i.digital_download_url||i.download_instruction).map((i:any,idx:number)=>(
                    <div key={idx}>
                      {i.digital_download_url&&<a href={i.digital_download_url} target="_blank" rel="noreferrer" style={{background:p,color:'white',textDecoration:'none',padding:'6px 14px',borderRadius:11,fontSize:12,fontWeight:700,display:'inline-block'}}>⬇️ Download</a>}
                      {i.download_instruction&&!i.digital_download_url&&<div style={{fontSize:11,color:'#64748b',maxWidth:200}}>{i.download_instruction}</div>}
                    </div>
                  ))
                ) : (
                  <div style={{fontSize:11,color:'#94a3b8'}}>Download link will be sent to your email</div>
                )}
              </div>
            )}
            {(o.paymentStatus==='pending'||o.payment_status==='pending')&&o.type==='digital'&&(
              <div style={{fontSize:11,color:'#f59e0b',fontWeight:600}}>⏳ Awaiting payment confirmation</div>
            )}
            {o.trackingNumber&&(
              <div style={{ fontSize:12, color:'#64748b' }}>🚚 {o.shippingProvider}: <strong>{o.trackingNumber}</strong></div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FavoritesTab({p,theme,navigate}:any) {
  const [favIds, setFavIds] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    Promise.all([api.getFavorites(), api.getProducts()]).then(([favs,prods])=>{
      setFavIds(Array.isArray(favs)?favs:[]);
      setProducts(Array.isArray(prods)?prods:[]);
      setLoading(false);
    });
  },[]);
  const favProducts = products.filter(p=>favIds.includes(p.id));
  if (loading) return <div style={{textAlign:'center',padding:40,color:'#888'}}>Loading...</div>;
  if (!favProducts.length) return <div style={{textAlign:'center',padding:'60px 24px',background:'white',borderRadius:20}}><div style={{fontSize:56,marginBottom:14}}>❤️</div><h3 style={{color:'#1e293b',fontWeight:800}}>No favorites yet</h3><p style={{color:'#64748b',fontSize:14}}>Heart products you love while browsing.</p></div>;
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:16}}>
      {favProducts.map(pr=>(
        <div key={pr.id} style={{background:'white',borderRadius:16,overflow:'hidden',boxShadow:'0 2px 10px rgba(0,0,0,0.06)',cursor:'pointer'}} onClick={()=>navigate(`/products/${pr.slug}`)}>
          <div style={{height:120,background:`linear-gradient(135deg,${theme.bgColor},${theme.bgColor2})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:48}}>{pr.image}</div>
          <div style={{padding:'12px 14px'}}>
            <div style={{fontWeight:800,color:'#1e293b',fontSize:14,marginBottom:4}}>{pr.title}</div>
            <div style={{fontWeight:900,color:'#1e293b'}}>${pr.price}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileTab({user,p,theme,refreshUser}:any) {
  const { tRaw } = useLang();
  // Start empty — useEffect below fills them when user data loads/changes
  const [firstName, setFirstName]       = useState('');
  const [lastName, setLastName]         = useState('');
  const [deliveryEmail, setDeliveryEmail] = useState('');
  const [phone, setPhone]               = useState('');
  const [addr, setAddr]                 = useState('');
  const [province, setProvince]         = useState('');
  const [postalCode, setPostalCode]     = useState('');
  const [country, setCountry]           = useState('Thailand');
  const [saving, setSaving]             = useState(false);

  // Sync fields whenever user data changes (including after save + refreshUser)
  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || '');
    setLastName(user.last_name || '');
    setDeliveryEmail(user.delivery_email || user.email || '');
    setPhone(user.phone || '');
    const sa = user.shipping_address || {};
    setAddr(sa.address || '');
    setProvince(user.province || sa.province || '');
    setPostalCode(user.postal_code || sa.postal_code || sa.zip || '');
    setCountry(sa.country || 'Thailand');
  }, [user?.id, user?.first_name, user?.last_name, user?.phone, user?.province, user?.postal_code, user?.delivery_email]);
  const [msg, setMsg]                   = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      const result = await api.updateMe({
        name: fullName || user.name,
        first_name: firstName,
        last_name: lastName,
        delivery_email: deliveryEmail,
        phone,
        province,
        postal_code: postalCode,
        shipping_address: { address: addr, province, postal_code: postalCode, country },
      });
      if (result?.error) {
        setMsg(`⚠️ Error: ${result.error}`);
        setSaving(false);
        return;
      }
      await refreshUser();
      setMsg('✓ บันทึกแล้ว / Profile saved!');
    } catch (e: any) {
      setMsg(`⚠️ ${e.message}`);
    }
    setSaving(false);
    setTimeout(()=>setMsg(''),4000);
  };

  const inp = (label:string, val:string, set:(v:string)=>void, type='text', disabled=false) => (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',fontSize:13,fontWeight:700,color:'#374151',marginBottom:5}}>{label}</label>
      <input type={type} value={val} onChange={e=>set(e.target.value)} disabled={disabled}
        style={{width:'100%',padding:'11px 14px',borderRadius:12,border:`1.5px solid ${disabled?'#e5e7eb':p}30`,fontSize:14,outline:'none',fontFamily:theme.fontFamily,boxSizing:'border-box' as const,background:disabled?'#f8fafc':'white',color:disabled?'#888':'inherit'}}
        onFocus={e=>{if(!disabled)e.target.style.borderColor=p;}} onBlur={e=>{if(!disabled)e.target.style.borderColor=p+'30';}}
      />
    </div>
  );

  return (
    <div style={{background:'white',borderRadius:20,padding:28,boxShadow:'0 2px 10px rgba(0,0,0,0.05)'}}>
      <h3 style={{fontSize:18,fontWeight:800,color:'#1e293b',marginBottom:24}}>Edit Profile</h3>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:4}}>
        <div>{inp('First Name', firstName, setFirstName)}</div>
        <div>{inp('Last Name', lastName, setLastName)}</div>
      </div>
      {inp('Account Email', user.email, ()=>{}, 'email', true)}
      <div style={{fontSize:11,color:'#94a3b8',marginTop:-10,marginBottom:14}}>Account email cannot be changed.</div>
      {inp('Email for Digital Delivery', deliveryEmail, setDeliveryEmail, 'email')}
      {inp('Phone Number', phone, setPhone, 'tel')}

      <h4 style={{fontSize:14,fontWeight:800,color:'#374151',margin:'18px 0 12px'}}>📦 Shipping Address</h4>
      {inp(tRaw('บ้านเลขที่/ถนน','Street Address'), addr, setAddr)}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>{inp(tRaw('จังหวัด','Province'), province, setProvince)}</div>
        <div>{inp(tRaw('รหัสไปรษณีย์','Postal Code'), postalCode, setPostalCode)}</div>
      </div>
      {inp(tRaw('ประเทศ','Country'), country, setCountry)}

      {msg && <div style={{background:'#d1fae5',border:'1.5px solid #6ee7b7',borderRadius:11,padding:'9px 13px',marginBottom:16,fontSize:13,color:'#065f46',fontWeight:600}}>{msg}</div>}
      <button onClick={save} disabled={saving} style={{background:saving?p+'88':p,color:'white',border:'none',cursor:saving?'wait':'pointer',padding:'12px 28px',borderRadius:14,fontSize:14,fontWeight:800,fontFamily:theme.fontFamily}}>
        {saving?'Saving...':'Save Changes'}
      </button>
    </div>
  );
}
