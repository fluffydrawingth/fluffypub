import React, { createContext, useContext, useState, useCallback } from 'react';

export type Lang = 'th' | 'en';

// Default translations
export const DEFAULT_TRANSLATIONS: Record<string, { th: string; en: string }> = {
  shop:         { th: 'ร้านค้า',         en: 'Shop' },
  artists:      { th: 'ศิลปิน',           en: 'Artists' },
  login:        { th: 'เข้าสู่ระบบ',      en: 'Login' },
  logout:       { th: 'ออกจากระบบ',       en: 'Sign Out' },
  orders:       { th: 'คำสั่งซื้อ',       en: 'Orders' },
  dashboard:    { th: 'แดชบอร์ด',         en: 'Dashboard' },
  add_to_cart:  { th: 'เพิ่มลงตะกร้า',   en: 'Add to Cart' },
  in_cart:      { th: '✓ ในตะกร้าแล้ว',  en: '✓ Added!' },
  cart:         { th: 'ตะกร้า',           en: 'Cart' },
  checkout:     { th: 'ชำระเงิน',         en: 'Checkout' },
  physical:     { th: 'หนังสือรูปเล่ม',   en: 'Physical book' },
  digital:      { th: 'ไฟล์ดิจิทัล',      en: 'Digital file' },
  profile:      { th: 'โปรไฟล์',          en: 'Profile' },
  favorites:    { th: 'รายการโปรด',       en: 'Favorites' },
  save:         { th: 'บันทึก',           en: 'Save' },
  cancel:       { th: 'ยกเลิก',           en: 'Cancel' },
  edit:         { th: 'แก้ไข',            en: 'Edit' },
  delete:       { th: 'ลบ',              en: 'Delete' },
  search:       { th: 'ค้นหา',            en: 'Search' },
  pages:        { th: 'หน้า',             en: 'pages' },
  total:        { th: 'ยอดรวม',           en: 'Total' },
  subtotal:     { th: 'ยอดก่อนส่วนลด',    en: 'Subtotal' },
  discount:     { th: 'ส่วนลด',           en: 'Discount' },
  shipping:     { th: 'ค่าจัดส่ง',        en: 'Shipping' },
  free:         { th: 'ฟรี',             en: 'Free' },
  place_order:  { th: 'สั่งซื้อ →',       en: 'Place Order →' },
  order_placed: { th: 'สั่งซื้อแล้ว!',    en: 'Order Placed!' },
  pending_payment: { th: 'รอชำระเงิน',    en: 'Pending Payment' },
  paid:         { th: 'ชำระแล้ว',         en: 'Paid' },
  packing:      { th: 'กำลังแพ็ค',        en: 'Packing' },
  shipped:      { th: 'จัดส่งแล้ว',       en: 'Shipped' },
  delivered:    { th: 'ได้รับแล้ว',        en: 'Delivered' },
  cancelled:    { th: 'ยกเลิก',           en: 'Cancelled' },
  upload_slip:  { th: 'อัปโหลดสลิป',      en: 'Upload Slip' },
  view_orders:  { th: 'ดูคำสั่งซื้อ',     en: 'View Orders' },
  continue_shopping: { th: 'ช้อปต่อ',    en: 'Continue Shopping' },
  first_name:   { th: 'ชื่อ',             en: 'First Name' },
  last_name:    { th: 'นามสกุล',          en: 'Last Name' },
  phone:        { th: 'เบอร์โทรศัพท์',    en: 'Phone' },
  address:      { th: 'ที่อยู่',           en: 'Address' },
  province:     { th: 'จังหวัด',          en: 'Province' },
  postal_code:  { th: 'รหัสไปรษณีย์',     en: 'Postal Code' },
  country:      { th: 'ประเทศ',           en: 'Country' },
  email:        { th: 'อีเมล',            en: 'Email' },
  payment_instructions: { th: 'วิธีการชำระเงิน', en: 'Payment Instructions' },
  scan_qr:      { th: 'สแกน QR Code ด้วยแอปธนาคาร', en: 'Scan QR with banking app' },
  back_to_shop: { th: 'กลับไปช้อปปิ้ง',  en: 'Back to Shop' },
  no_orders:    { th: 'ยังไม่มีคำสั่งซื้อ', en: 'No orders yet' },
  order_number: { th: 'เลขที่คำสั่งซื้อ', en: 'Order #' },
  order_date:   { th: 'วันที่สั่งซื้อ',   en: 'Order Date' },
  status:       { th: 'สถานะ',            en: 'Status' },
  products:     { th: 'สินค้า',           en: 'Products' },
  select_option: { th: 'เลือกรูปแบบ',    en: 'Select Option' },
};

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallbackEn?: string) => string;
  tRaw: (th: string, en: string) => string;
  price: (thb?: number|null, usd?: number|null, base?: number) => string;
  currency: string;
  translations: Record<string, { th: string; en: string }>;
  setTranslations: (t: Record<string, { th: string; en: string }>) => void;
}

const LangContext = createContext<LangCtx>({
  lang: 'th', setLang: ()=>{},
  t: (k) => DEFAULT_TRANSLATIONS[k]?.th || k,
  tRaw: (th) => th,
  price: (t,u,b) => `฿${Math.round(t ?? (b ? b*35 : 0))}`,
  currency: '฿',
  translations: DEFAULT_TRANSLATIONS,
  setTranslations: ()=>{},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const stored = (typeof localStorage !== 'undefined' && localStorage.getItem('fluffy_lang') as Lang) || 'th';
  const [lang, setLangState] = useState<Lang>(stored);
  const [translations, setTranslations] = useState(DEFAULT_TRANSLATIONS);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof localStorage !== 'undefined') localStorage.setItem('fluffy_lang', l);
  }, []);

  // Translate by key
  const t = useCallback((key: string, fallbackEn?: string) => {
    const entry = translations[key];
    if (!entry) return fallbackEn || key;
    return lang === 'th' ? entry.th : entry.en;
  }, [lang, translations]);

  // Translate raw TH/EN strings directly
  const tRaw = useCallback((th: string, en: string) => lang === 'th' ? th : en, [lang]);

  // Price formatting — strict: TH=THB only, EN=USD only, never multiply
  const price = useCallback((thb?: number|null, usd?: number|null, base?: number) => {
    if (lang === 'th') {
      // Use price_thb if available; never multiply USD by 35
      if (thb != null && thb > 0) return `฿${Number(thb).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
      // base is only used if it IS already a THB amount (e.g. passed from THB context)
      if (base != null && base > 0) return `฿${Number(base).toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
      return '฿—';
    }
    if (usd != null && usd > 0) return `$${Number(usd).toFixed(2)}`;
    if (base != null && base > 0) return `$${Number(base).toFixed(2)}`;
    return '$—';
  }, [lang]);

  const currency = lang === 'th' ? '฿' : '$';

  return (
    <LangContext.Provider value={{ lang, setLang, t, tRaw, price, currency, translations, setTranslations }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
