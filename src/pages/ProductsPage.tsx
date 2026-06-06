import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
const CATEGORIES = ['All', 'Animals', 'Fantasy', 'Botanicals', 'Mandala', 'Kawaii', 'Seasonal'];
import ProductCard from '../components/ProductCard';

export default function ProductsPage() {
  const { theme } = useTheme();
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('All');
  const [sort, setSort] = useState('featured');
  const [search, setSearch] = useState('');

  useEffect(() => { api.getProducts().then(p => setAllProducts(Array.isArray(p) ? p : [])); }, []);

  let products = allProducts.filter(p => {
    if (category !== 'All' && p.category !== category) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (sort === 'price-low') products = [...products].sort((a, b) => a.price - b.price);
  else if (sort === 'price-high') products = [...products].sort((a, b) => b.price - a.price);
  else if (sort === 'rating') products = [...products].sort((a, b) => b.rating - a.rating);
  else if (sort === 'newest') products = [...products].filter(p => p.new).concat(products.filter(p => !p.new));

  return (
    <div style={{ fontFamily: theme.fontFamily }}>
      {/* Page Header */}
      <div style={{
        background: `linear-gradient(135deg, ${theme.bgColor}, ${theme.bgColor2})`,
        padding: '48px 24px 40px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 42, fontWeight: 900, color: theme.textColor, margin: '0 0 12px', fontFamily: theme.fontFamily }}>
          All Coloring Books 🎨
        </h1>
        <p style={{ color: theme.textColor + '88', fontSize: 16 }}>
          {allProducts.length} beautiful books waiting for your colors
        </p>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* Filters Bar */}
        <div style={{
          display: 'flex', gap: 16, marginBottom: 32,
          flexWrap: 'wrap', alignItems: 'center',
          background: 'white', padding: '16px 20px', borderRadius: 16,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Search */}
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search books..."
            style={{
              padding: '10px 16px', borderRadius: 12,
              border: `1.5px solid ${theme.primaryColor}30`,
              fontSize: 14, outline: 'none', flex: 1, minWidth: 200,
              fontFamily: theme.fontFamily,
            }}
          />

          {/* Categories */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCategory(c)} style={{
                padding: '8px 16px', borderRadius: 20,
                border: `1.5px solid ${category === c ? theme.primaryColor : theme.primaryColor + '30'}`,
                background: category === c ? theme.primaryColor : 'transparent',
                color: category === c ? 'white' : theme.textColor,
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                fontFamily: theme.fontFamily, transition: 'all 0.2s',
              }}>{c}</button>
            ))}
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            padding: '10px 14px', borderRadius: 12,
            border: `1.5px solid ${theme.primaryColor}30`,
            fontSize: 14, background: 'white', cursor: 'pointer',
            fontFamily: theme.fontFamily, color: theme.textColor, outline: 'none',
          }}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
        </div>

        {/* Results count */}
        <div style={{ marginBottom: 20, color: theme.textColor + '88', fontSize: 14, fontWeight: 600 }}>
          Showing {products.length} books {category !== 'All' ? `in "${category}"` : ''}
        </div>

        {/* Grid */}
        {products.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 24 }}>
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
            <h3 style={{ color: theme.textColor, fontSize: 22, fontWeight: 800, fontFamily: theme.fontFamily }}>No books found</h3>
            <p style={{ color: theme.textColor + '88' }}>Try a different search or category</p>
            <button onClick={() => { setSearch(''); setCategory('All'); }} style={{
              background: theme.primaryColor, color: 'white', border: 'none',
              cursor: 'pointer', padding: '10px 24px', borderRadius: 20, marginTop: 16,
              fontSize: 14, fontWeight: 700, fontFamily: theme.fontFamily,
            }}>Clear Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
