import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import ProductCard from '../components/ProductCard';
import { useLang } from '../lib/lang';

function isDigitalProduct(prod: any) {
  return prod.is_digital === true || prod.type === 'digital' || prod.type === 'both';
}

export default function DigitalProductsPage() {
  const { theme } = useTheme();
  const { tRaw } = useLang();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string; icon: string; icon_type: string }[]>([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('featured');
  const p = theme.primaryColor;

  useEffect(() => {
    api.getProducts().then((d: any) => setAllProducts(Array.isArray(d) ? d : []));
    api.getCategories().then((d: any) => { if (Array.isArray(d)) setCategories(d); });
  }, []);

  const digitalProducts = allProducts.filter(isDigitalProduct);

  // Category counts among DIGITAL products only — show tabs that actually have items
  const catCounts: Record<string, number> = {};
  digitalProducts.forEach(prod => {
    const cats: string[] = prod.categories?.length ? prod.categories : (prod.category ? [prod.category] : []);
    cats.forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; });
  });

  let filtered = digitalProducts
    .filter(prod => {
      if (category === 'All') return true;
      const prodCats: string[] = prod.categories?.length ? prod.categories : (prod.category ? [prod.category] : []);
      return prodCats.includes(category);
    })
    .filter(prod => {
      if (!search) return true;
      return prod.title?.toLowerCase().includes(search.toLowerCase()) ||
        (prod.artistName || prod.artist_name || '').toLowerCase().includes(search.toLowerCase());
    });

  if (sort === 'price_asc') filtered = [...filtered].sort((a, b) => (a.price_thb || 0) - (b.price_thb || 0));
  else if (sort === 'price_desc') filtered = [...filtered].sort((a, b) => (b.price_thb || 0) - (a.price_thb || 0));
  else if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  else filtered = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const selStyle = (active: boolean) => ({
    padding: '10px 16px', borderRadius: 20, border: `1.5px solid ${active ? p : p + '30'}`,
    background: active ? p : 'transparent', color: active ? 'white' : theme.textColor,
    cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily,
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`@media(max-width:640px){.prod-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}}`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 6 }}>
            {theme.labels?.digital_header_img
              ? <img src={theme.labels.digital_header_img} alt="" style={{ width:52, height:52, objectFit:'cover', borderRadius:12, display:'inline-block', verticalAlign:'middle' }} />
              : (theme.labels?.digital_emoji ?? '💾')}
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 900, color: theme.textColor, margin: '0 0 6px', fontFamily: theme.fontFamily }}>
            {tRaw(theme.labels?.digital_title_th || 'สินค้าดิจิทัล', theme.labels?.digital_title || 'Digital Products')}
          </h1>
          <p style={{ color: theme.textColor + '88', margin: 0, fontSize: 17, lineHeight: 1.6 }}>
            {tRaw('ดาวน์โหลดได้ทันทีหลังชำระเงิน', 'Instant download after payment')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' as const }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tRaw('ค้นหาสินค้า...', 'Search...')}
            style={{ flex: 1, minWidth: 200, padding: '10px 16px', borderRadius: 20, border: `1.5px solid ${p}30`, outline: 'none', fontSize: 16, fontFamily: theme.fontFamily, background: 'white' }}
            onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = p + '30'} />
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 20, border: `1.5px solid ${p}30`, outline: 'none', fontSize: 16, fontFamily: theme.fontFamily, background: 'white', cursor: 'pointer', color: theme.textColor }}>
            <option value="featured">{tRaw('แนะนำ', 'Featured')}</option>
            <option value="newest">{tRaw('ใหม่ล่าสุด', 'Newest')}</option>
            <option value="price_asc">{tRaw('ราคา ต่ำ-สูง', 'Price: Low–High')}</option>
            <option value="price_desc">{tRaw('ราคา สูง-ต่ำ', 'Price: High–Low')}</option>
          </select>
        </div>

        {/* Category filter tabs (digital products only) */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <button style={selStyle(category === 'All')} onClick={() => setCategory('All')}>
            🎨 {tRaw('ทั้งหมด', 'All')} ({digitalProducts.length})
          </button>
          {categories.map(cat => {
            const count = catCounts[cat.name] || 0;
            if (count === 0) return null;
            return (
              <button key={cat.name} style={selStyle(category === cat.name)} onClick={() => setCategory(cat.name)}>
                {cat.icon_type === 'image' ? '' : (cat.icon || '')} {cat.name} ({count})
              </button>
            );
          })}
        </div>

        <p style={{ color: theme.textColor + '88', fontSize: 15, marginBottom: 16 }}>
          {tRaw(`แสดง ${filtered.length} รายการ`, `Showing ${filtered.length} item${filtered.length !== 1 ? 's' : ''}`)}
          {category !== 'All' ? ` ${tRaw('ใน', 'in')} "${category}"` : ''}
        </p>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '60px 24px', color: theme.textColor + '66' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🔍</div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: theme.textColor }}>{tRaw('ไม่พบสินค้า', 'No products found')}</h3>
            <p style={{ fontSize: 16 }}>{tRaw('ลองค้นหาด้วยคำอื่น', 'Try a different search')}</p>
          </div>
        ) : (
          <div className="prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 }}>
            {filtered.map((prod: any, idx: number) => <ProductCard key={prod.id} product={prod} priority={idx === 0} />)}
          </div>
        )}
      </div>
    </div>
  );
}
