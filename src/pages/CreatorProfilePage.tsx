import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import CommunityCard from '../components/CommunityCard';

// Community creator profile — avatar, bio, joined date, stats, and their gallery.
export default function CreatorProfilePage({ userId }: { userId: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCommunityCreator(userId).then((d: any) => { setData(d && !d.error ? d : null); setLoading(false); }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>;
  if (!data?.creator) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', fontFamily: theme.fontFamily }}>
      <div style={{ fontSize: 56 }}>🔍</div>
      <h2 style={{ color: theme.textColor }}>{tRaw('ไม่พบครีเอเตอร์', 'Creator not found')}</h2>
      <button onClick={() => navigate('/community')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 20, marginTop: 16, fontSize: 15, fontWeight: 700, fontFamily: theme.fontFamily }}>← {tRaw('ชุมชน', 'Community')}</button>
    </div>
  );

  const c = data.creator;
  const posts = data.posts || [];
  const badge = c.badge === 'artist' ? '🎨' : c.badge === 'creator' ? '🌷' : '';
  const joined = c.joined ? new Date(c.joined).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '';
  const stat = (label: string, value: any) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: p }}>{value}</div>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`.cm-grid{column-count:4;column-gap:16px}@media(max-width:1100px){.cm-grid{column-count:3}}@media(max-width:760px){.cm-grid{column-count:2;column-gap:10px}}@media(max-width:420px){.cm-grid{column-count:1}}.cm-grid>div{margin-bottom:16px}`}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '0 0 20px' }}>← {tRaw('ชุมชน', 'Community')}</button>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: p + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>
            {c.avatar_url ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' }}>{badge} {c.name}</h1>
            {c.artist_slug && <button onClick={() => navigate(`/artists/${c.artist_slug}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p, fontSize: 12, fontWeight: 700, padding: 0, marginBottom: 4 }}>{tRaw('ดูหน้าศิลปิน →', 'View artist page →')}</button>}
            {c.bio && <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '4px 0 0' }}>{c.bio}</p>}
            {joined && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>{tRaw('เข้าร่วมเมื่อ', 'Joined')} {joined}</div>}
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {stat(tRaw('โพสต์', 'Posts'), c.stats?.posts ?? 0)}
            {stat(tRaw('หนังสือ', 'Books'), c.stats?.booksUsed ?? 0)}
            {stat(tRaw('พาเลตต์', 'Palettes'), c.stats?.palettes ?? 0)}
          </div>
        </div>

        {/* Gallery */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', color: theme.textColor + '88' }}>{tRaw('ยังไม่มีผลงาน', 'No creations yet.')}</div>
        ) : (
          <div className="cm-grid">{posts.map((post: any) => <CommunityCard key={post.id} post={post} />)}</div>
        )}
      </div>
    </div>
  );
}
