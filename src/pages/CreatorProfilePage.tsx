import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import CommunityCard from '../components/CommunityCard';
import BadgeIcon from '../components/BadgeIcon';
import { isImageUrl } from '../lib/avatar';

// Build a full URL from a username/handle or raw link for each platform.
function socialUrl(kind: string, raw: string): string {
  const v = String(raw || '').trim();
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  if (kind === 'tiktok') return `https://www.tiktok.com/@${handle}`;
  if (kind === 'instagram') return `https://www.instagram.com/${handle}`;
  if (kind === 'youtube') return v.startsWith('@') ? `https://www.youtube.com/${v}` : `https://www.youtube.com/@${handle}`;
  return `https://${v}`;
}

// Community creator profile — avatar, bio, joined date, stats, and their gallery.
export default function CreatorProfilePage({ userId }: { userId: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const { user } = useAuth();
  const p = theme.primaryColor;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [showCount, setShowCount] = useState(6);

  useEffect(() => {
    setLoading(true);
    setShowCount(6);
    Promise.all([
      api.getCommunityCreator(userId),
      user ? api.getMyFollows() : Promise.resolve({ follows: [] }),
    ]).then(([d, fl]) => {
      setData(d && !d.error ? d : null);
      setFollowing((fl?.follows || []).includes(userId));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId, user]);

  const toggleFollow = async () => {
    if (!user) { navigate('/login'); return; }
    if (following) {
      setFollowing(false);
      await api.unfollowCreator(userId).catch(() => setFollowing(true));
    } else {
      setFollowing(true);
      await api.followCreator(userId).catch(() => setFollowing(false));
    }
  };

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>;
  if (!data?.creator) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', fontFamily: theme.fontFamily }}>
      <div style={{ fontSize: 56 }}>🔍</div>
      <h2 style={{ color: theme.textColor }}>{tRaw('ไม่พบครีเอเตอร์', 'Creator not found')}</h2>
      <button onClick={() => navigate('/community')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '12px 28px', borderRadius: 20, marginTop: 16, fontSize: 16, fontWeight: 700, fontFamily: theme.fontFamily }}>← {tRaw('ชุมชน', 'Community')}</button>
    </div>
  );

  const c = data.creator;
  const posts = data.posts || [];
  const joined = c.joined ? new Date(c.joined).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : '';
  const stat = (label: string, value: any) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 900, color: p }}>{value}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`.cp-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}@media(max-width:1100px){.cp-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:900px){.cp-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:640px){.cp-grid{grid-template-columns:repeat(2,1fr);gap:10px}}@media(max-width:380px){.cp-grid{grid-template-columns:1fr}}`}</style>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 15, fontWeight: 600, padding: '0 0 20px' }}>← {tRaw('ชุมชน', 'Community')}</button>

        {/* Header */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: p + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0 }}>
            {isImageUrl(c.avatar_url) ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : c.avatar_url ? <span style={{ fontSize: 40 }}>{c.avatar_url}</span> : <BadgeIcon affiliate={c.affiliate_enabled} size={36} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' }}><BadgeIcon affiliate={c.affiliate_enabled} size={22} /> {c.name}</h1>
            {c.artist_slug && <button onClick={() => navigate(`/artists/${c.artist_slug}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p, fontSize: 14, fontWeight: 700, padding: 0, marginBottom: 4 }}>{tRaw('ดูหน้าศิลปิน →', 'View artist page →')}</button>}
            {/* Fluffy Creator bio takes priority; else customer about-me */}
            {/* Quick info chips under name */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, marginBottom: 4 }}>
              {joined && <span style={{ fontSize: 14, color: '#94a3b8' }}>📅 {tRaw('เข้าร่วม', 'Joined')} {joined}</span>}
              {c.community_country && <span style={{ fontSize: 14, color: '#64748b' }}>📍 {c.community_country}</span>}
              {c.community_favorite_medium && <span style={{ fontSize: 14, color: '#64748b' }}>🎨 {c.community_favorite_medium}</span>}
              {c.favorite_palette && <span style={{ fontSize: 14, color: '#64748b' }}>🌷 {c.favorite_palette}</span>}
            </div>
            {(c.creator_bio || c.bio) && <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.65, margin: '4px 0 0' }}>{c.creator_bio || c.bio}</p>}
            {c.community_about && <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.65, margin: '6px 0 0' }}>{c.community_about}</p>}
            {/* Fluffy Creator social links — only for approved creators */}
            {(c.creator_tiktok || c.creator_instagram || c.creator_youtube || c.creator_website) && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                {c.creator_tiktok && <a href={socialUrl('tiktok', c.creator_tiktok)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: p, textDecoration: 'none' }}>🎵 TikTok</a>}
                {c.creator_instagram && <a href={socialUrl('instagram', c.creator_instagram)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: p, textDecoration: 'none' }}>📸 Instagram</a>}
                {c.creator_youtube && <a href={socialUrl('youtube', c.creator_youtube)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: p, textDecoration: 'none' }}>▶️ YouTube</a>}
                {c.creator_website && <a href={socialUrl('web', c.creator_website)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 700, color: p, textDecoration: 'none' }}>🌐 Website</a>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 20 }}>
              {stat(tRaw('โพสต์', 'Posts'), c.stats?.posts ?? 0)}
              {stat(tRaw('หนังสือ', 'Books'), c.stats?.booksUsed ?? 0)}
              {stat(tRaw('พาเลตต์', 'Palettes'), c.stats?.palettes ?? 0)}
            </div>
            {userId !== user?.id && (
              <button onClick={toggleFollow}
                style={{ background: following ? '#f1f5f9' : p, color: following ? '#64748b' : 'white', border: following ? '1.5px solid #e2e8f0' : 'none', borderRadius: 22, padding: '8px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: theme.fontFamily, minWidth: 120, transition: 'all .15s' }}>
                {following ? `💗 ${tRaw('ติดตามแล้ว', 'Following')}` : `+ ${tRaw('ติดตาม', 'Follow')}`}
              </button>
            )}
          </div>
        </div>

        {/* Gallery */}
        {posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 24px', color: theme.textColor + '88', fontSize: 16 }}>{tRaw('ยังไม่มีผลงาน', 'No creations yet.')}</div>
        ) : (
          <>
            <div className="cp-grid">{posts.slice(0, showCount).map((post: any) => <CommunityCard key={post.id} post={post} />)}</div>
            {showCount < posts.length && (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button onClick={() => setShowCount(n => n + 6)} style={{ background: 'transparent', border: `2px solid ${p}`, color: p, cursor: 'pointer', padding: '10px 28px', borderRadius: 22, fontSize: 15.5, fontWeight: 800, fontFamily: theme.fontFamily }}>{tRaw('โหลดเพิ่ม', 'Load more')}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
