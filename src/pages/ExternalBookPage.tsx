import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import CommunityCard from '../components/CommunityCard';

// Dedicated discovery page for a community-entered external book.
// External books are for discovery only — never promoted like Fluffy Pub products.
export default function ExternalBookPage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getExternalBook(slug).then((d: any) => { setData(d && !d.error ? d : null); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>;
  if (!data?.book) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', fontFamily: theme.fontFamily }}>
      <div style={{ fontSize: 56 }}>📖</div>
      <h2 style={{ color: theme.textColor }}>{tRaw('ไม่พบหนังสือ', 'Book not found')}</h2>
      <button onClick={() => navigate('/community')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 20, marginTop: 16, fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily }}>← {tRaw('ชุมชน', 'Community')}</button>
    </div>
  );

  const book = data.book;
  const posts = data.posts || [];
  const stat = (label: string, value: any) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: p }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '0 0 20px' }}>← {tRaw('ชุมชน', 'Community')}</button>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: p + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>📖</div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{tRaw('หนังสือจากชุมชน', 'Community Book')}</div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', margin: '2px 0 4px' }}>{book.title}</h1>
            {book.author && <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>by {book.author}</p>}
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {stat(tRaw('ผลงาน', 'Creations'), book.post_count ?? posts.length)}
            {stat(tRaw('ครีเอเตอร์', 'Creators'), book.creator_count ?? 0)}
          </div>
        </div>

        {/* Discovery note */}
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
          ℹ️ {tRaw('นี่คือหนังสือจากภายนอก ไม่ใช่สินค้าของ Fluffy Pub', 'This is a community-entered external book, not a Fluffy Pub product.')}
        </div>

        {/* Gallery */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', color: theme.textColor + '88' }}>{tRaw('ยังไม่มีผลงาน', 'No creations yet.')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
            {posts.map((post: any) => <CommunityCard key={post.id} post={post} />)}
          </div>
        )}
      </div>
    </div>
  );
}
