import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useTheme } from '../lib/theme';
import { useCart } from '../lib/cart';
import { useRouter } from '../lib/router';
import ProductCard from '../components/ProductCard';
import { RichDescRenderer } from '../components/RichDescEditor';

export default function ProductDetailPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { add, items } = useCart();
  const { navigate } = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');
  useEffect(() => { api.getProduct(slug).then(p => { setProduct(p.error?null:p); setLoading(false); }); }, [slug]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  useEffect(() => { api.getProducts().then(p => setAllProducts(Array.isArray(p)?p:[])); }, []);

  if (loading) return <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32}}>⏳</div>;
  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px', fontFamily: theme.fontFamily }}>
        <div style={{ fontSize: 64 }}>😢</div>
        <h2 style={{ color: theme.textColor }}>Product not found</h2>
        <button onClick={() => navigate('/products')} style={{
          background: theme.primaryColor, color: 'white', border: 'none',
          cursor: 'pointer', padding: '12px 28px', borderRadius: 24, marginTop: 16,
          fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily,
        }}>Back to Shop</button>
      </div>
    );
  }

  const related = allProducts.filter((p:any) => product && p.category === product.category && p.id !== product.id).slice(0, 4);
  const isDigital = product.is_digital !== false && (product.is_digital === true || product.type === 'digital' || product.type === 'both');
  const isPhysical = product.is_physical === true || product.type === 'physical' || product.type === 'both';
  const inCart = items.some(i => i.id === product.id);
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : null;

  const reviews = [
    { author: 'Sophie M.', rating: 5, text: 'Absolutely stunning! The detail in each page is incredible. Spent a whole weekend coloring this one! 🌸', date: '2 days ago', avatar: '🌸' },
    { author: 'Emma K.', rating: 5, text: 'My daughter and I love doing these together. The difficulty is perfect for both of us!', date: '1 week ago', avatar: '🎨' },
    { author: 'Lily R.', rating: 4, text: 'Beautiful designs, great value. Some pages are really intricate but so rewarding!', date: '2 weeks ago', avatar: '✨' },
  ];

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor }}>
      {/* Breadcrumb */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px' }}>
        <span style={{ color: theme.textColor + '66', fontSize: 14 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: theme.fontFamily }}>Home</button>
          {' > '}
          <button onClick={() => navigate('/products')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontFamily: theme.fontFamily }}>Shop</button>
          {' > '} <strong style={{ color: theme.textColor }}>{product.title}</strong>
        </span>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{
          background: 'white', borderRadius: 24,
          overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
        }}>
          {/* Left: Image */}
          <div style={{
            background: `linear-gradient(135deg, ${theme.bgColor}, ${theme.bgColor2})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 400, fontSize: 120, position: 'relative', padding: 40,
          }}>
            {product.image}
            {discount && (
              <div style={{
                position: 'absolute', top: 24, right: 24,
                background: theme.accentColor, color: 'white',
                borderRadius: '50%', width: 60, height: 60,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 800,
              }}>-{discount}%</div>
            )}
          </div>

          {/* Right: Info */}
          <div style={{ padding: '40px 40px 48px' }}>
            <div style={{ fontSize: 13, color: theme.primaryColor, fontWeight: 700, marginBottom: 8 }}>
              {product.artistName || product.artist} · {product.category}
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.textColor, margin: '0 0 12px', lineHeight: 1.2 }}>
              {product.title}
            </h1>

            {/* Rating */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {'★★★★★'.split('').map((_, i) => (
                  <span key={i} style={{ color: i < Math.round(product.rating) ? '#f59e0b' : '#e5e7eb', fontSize: 18 }}>★</span>
                ))}
              </div>
              <span style={{ fontWeight: 700, color: theme.textColor }}>{product.rating}</span>
              <span style={{ color: '#888', fontSize: 14 }}>({product.reviews} reviews)</span>
            </div>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 24 }}>
              <span style={{ fontSize: 40, fontWeight: 900, color: theme.textColor }}>${product.price}</span>
              {product.originalPrice && (
                <span style={{ fontSize: 20, color: '#aaa', textDecoration: 'line-through' }}>${product.originalPrice}</span>
              )}
            </div>

            {/* Description */}
            <p style={{ color: theme.textColor + 'cc', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              {product.description}
            </p>

            {/* Meta */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              {[['📄', `${product.pages} pages`], ['⬇️', 'Instant download'], ['🖨️', 'Print at home'], ['📱', 'All devices']].map(([icon, text]) => (
                <div key={text} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: theme.bgColor, borderRadius: 12, padding: '8px 14px',
                  fontSize: 13, fontWeight: 600, color: theme.textColor,
                }}>
                  {icon} {text}
                </div>
              ))}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
              {product.tags.map(t => (
                <span key={t} style={{
                  background: theme.primaryColor + '15',
                  color: theme.primaryColor, borderRadius: 20,
                  padding: '4px 12px', fontSize: 12, fontWeight: 600,
                }}>#{t}</span>
              ))}
            </div>

            {/* Add to Cart */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => add({ id: product.id, title: product.title, price: product.price, image: product.image, artist: product.artistName || product.artist || '' })}
                style={{
                  flex: 1, padding: '16px', borderRadius: 24,
                  background: inCart ? '#e5e7eb' : theme.primaryColor,
                  color: inCart ? '#888' : 'white',
                  border: 'none', cursor: inCart ? 'default' : 'pointer',
                  fontSize: 17, fontWeight: 800, fontFamily: theme.fontFamily,
                  boxShadow: inCart ? 'none' : `0 8px 24px ${theme.primaryColor}44`,
                  transition: 'all 0.2s',
                }}
              >
                {inCart ? '✓ Added to Cart!' : '🛒 Add to Cart'}
              </button>
              {inCart && (
                <button onClick={() => navigate('/cart')} style={{
                  padding: '16px 24px', borderRadius: 24,
                  background: 'transparent', border: `2px solid ${theme.primaryColor}`,
                  color: theme.primaryColor, cursor: 'pointer',
                  fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily,
                }}>View Cart →</button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs: Details / Reviews */}
        <div style={{ background: 'white', borderRadius: 24, marginTop: 24, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', borderBottom: `2px solid ${theme.primaryColor}15` }}>
            {(['details', 'reviews'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding: '18px 32px', border: 'none', cursor: 'pointer',
                background: activeTab === tab ? theme.primaryColor + '10' : 'transparent',
                color: activeTab === tab ? theme.primaryColor : theme.textColor + '88',
                fontWeight: activeTab === tab ? 800 : 600, fontSize: 15,
                borderBottom: activeTab === tab ? `3px solid ${theme.primaryColor}` : '3px solid transparent',
                fontFamily: theme.fontFamily, textTransform: 'capitalize',
              }}>{tab === 'details' ? '📋 Details' : `⭐ Reviews (${product.reviews})`}</button>
            ))}
          </div>
          <div style={{ padding: 32 }}>
            {activeTab === 'details' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {[
                  ['Format', 'PDF (printable)'],
                  ['Pages', `${product.pages} pages`],
                  ['Size', 'Letter & A4'],
                  ['Resolution', '300 DPI'],
                  ['License', 'Personal use'],
                  ['Language', 'English'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `1px solid ${theme.primaryColor}15`, paddingBottom: 12 }}>
                    <span style={{ color: theme.textColor + '88', fontWeight: 600 }}>{k}</span>
                    <span style={{ color: theme.textColor, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {reviews.map((r, i) => (
                  <div key={i} style={{ borderBottom: `1px solid ${theme.primaryColor}10`, paddingBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 32 }}>{r.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 800, color: theme.textColor, fontSize: 15 }}>{r.author}</div>
                        <div style={{ color: '#f59e0b', fontSize: 14 }}>{'★'.repeat(r.rating)}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>{r.date}</span>
                    </div>
                    <p style={{ color: theme.textColor + 'cc', fontSize: 14, lineHeight: 1.6, margin: 0 }}>{r.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: theme.textColor, fontFamily: theme.fontFamily, marginBottom: 24 }}>
              You Might Also Like 💕
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
