import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import ProductCard from '../components/ProductCard';
import { useLang } from '../lib/lang';

export default function ProductsPage() {
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
    api.getCategories().then((d: any) => {
      if (Array.isArray(d)) setCategories(d);
    });
  }, []);

  // Build category tabs from DB + "All"
  const catCounts = allProducts.reduce((acc: Record<string, number>, prod: any) => {
    // Count from categories array if available, else fall back to category string
    const cats: string[] = prod.categories && prod.categories.length ? prod.categories : (prod.category ? [prod.category] : []);
    cats.forEach((cat: string) => { acc[cat] = (acc[cat] || 0) + 1; });
    return acc;
  }, {});

  const searchTerm = search.trim().toLowerCase();

  let filtered = allProducts.filter(prod => {
    if (category !== 'All') {
      const prodCats: string[] = prod.categories && prod.categories.length ? prod.categories : (prod.category ? [prod.category] : []);
      if (!prodCats.includes(category)) return false;
    }
    if (searchTerm) {
      const tags: string = Array.isArray(prod.tags) ? prod.tags.join(' ') : (prod.tags || '');
      const haystack = [
        prod.title,
        prod.title_th,
        prod.title_en,
        prod.description,
        prod.description_th,
        prod.description_en,
        prod.category,
        (prod.categories || []).join(' '),
        tags,
        prod.search_keywords || '',
        prod.artistName || prod.artist_name,
      ].map(v => (v || '').toLowerCase()).join(' ');
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });

  if (sort === 'price_asc') filtered = [...filtered].sort((a, b) => (a.price_thb||0) - (b.price_thb||0));
  else if (sort === 'price_desc') filtered = [...filtered].sort((a, b) => (b.price_thb||0) - (a.price_thb||0));
  else if (sort === 'newest') filtered = [...filtered].sort((a, b) => new Date(b.created_at||0).getTime() - new Date(a.created_at||0).getTime());
  else filtered = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const selStyle = (active: boolean) => ({
    padding: '8px 18px', borderRadius: 20, border: `1.5px solid ${active ? p : p + '30'}`,
    background: active ? p : 'transparent', color: active ? 'white' : theme.textColor,
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: theme.fontFamily,
    display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' as const,
  });

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`@media(max-width:640px){.prod-grid{grid-template-columns:repeat(2,1fr)!important;gap:10px!important;}}`}</style>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: theme.textColor, margin: '0 0 6px', fontFamily: theme.fontFamily }}>
            {tRaw('สินค้าทั้งหมด','All Books')} 📚
          </h1>
          <p style={{ color: theme.textColor + '88', margin: 0 }}>
            {tRaw('ค้นพบสมุดระบายสีที่คุณชอบ','Discover your perfect coloring book')}
          </p>
        </div>

        {/* Search + Sort */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tRaw('ค้นหาสินค้า...','Search books...')}
            style={{ flex: 1, minWidth: 200, padding: '10px 16px', borderRadius: 20, border: `1.5px solid ${p}30`, outline: 'none', fontSize: 14, fontFamily: theme.fontFamily, background: 'white' }}
            onFocus={e => e.target.style.borderColor = p} onBlur={e => e.target.style.borderColor = p + '30'} />
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '10px 16px', borderRadius: 20, border: `1.5px solid ${p}30`, outline: 'none', fontSize: 13, fontFamily: theme.fontFamily, background: 'white', cursor: 'pointer', color: theme.textColor }}>
            <option value="featured">{tRaw('แนะนำ','Featured')}</option>
            <option value="newest">{tRaw('ใหม่ล่าสุด','Newest')}</option>
            <option value="price_asc">{tRaw('ราคา ต่ำ-สูง','Price: Low–High')}</option>
            <option value="price_desc">{tRaw('ราคา สูง-ต่ำ','Price: High–Low')}</option>
          </select>
        </div>

        {/* Category filters from DB */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' as const }}>
          <button style={selStyle(category === 'All')} onClick={() => setCategory('All')}>
            🎨 {tRaw('ทั้งหมด','All')} ({allProducts.length})
          </button>
          {categories.map(cat => {
            const count = catCounts[cat.name] || 0;
            const icon = cat.icon_type === 'image' && cat.icon
              ? <img src={cat.icon} alt={cat.name} style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'cover' }} />
              : <span>{cat.icon}</span>;
            return (
              <button key={cat.name} style={selStyle(category === cat.name)} onClick={() => setCategory(cat.name)}>
                {icon} {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Results count */}
        <p style={{ color: theme.textColor + '88', fontSize: 13, marginBottom: 16 }}>
          {tRaw(`แสดง ${filtered.length} รายการ`, `Showing ${filtered.length} book${filtered.length !== 1 ? 's' : ''}`)}
          {category !== 'All' ? ` ${tRaw('ใน','in')} "${category}"` : ''}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center' as const, padding: '60px 24px', color: theme.textColor + '66' }}>
            <div style={{ fontSize: 56, marginBottom: 14 }}>🔍</div>
            <h3 style={{ fontWeight: 800, color: theme.textColor }}>{tRaw('ไม่พบสินค้า','No books found')}</h3>
            <p>{tRaw('ลองค้นหาหรือเลือกหมวดหมู่อื่น','Try a different search or category')}</p>
          </div>
        ) : (
          <div className="prod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 20 }}>
            {filtered.map((prod: any) => <ProductCard key={prod.id} product={prod} />)}
          </div>
        )}
      </div>
    </div>
  );
}
