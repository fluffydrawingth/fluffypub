import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { isImageUrl } from '../lib/avatar';
import BadgeIcon from '../components/BadgeIcon';

export default function CommunityCreatorsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const { user } = useAuth();
  const p = theme.primaryColor;

  const [creators, setCreators] = useState<any[]>([]);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getCommunityCreators(50),
      user ? api.getMyFollows() : Promise.resolve({ follows: [] }),
    ]).then(([cr, fl]) => {
      setCreators(cr?.creators || []);
      setFollows(new Set(fl?.follows || []));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const toggleFollow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    const next = new Set(follows);
    if (next.has(id)) {
      next.delete(id);
      setFollows(next);
      await api.unfollowCreator(id).catch(() => {});
    } else {
      next.add(id);
      setFollows(next);
      await api.followCreator(id).catch(() => {});
    }
  };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '0 0 20px' }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.textColor, margin: '0 0 6px' }}>
          🌷 {tRaw('ค้นพบครีเอเตอร์', 'Discover Creators')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 28px' }}>
          {tRaw('ครีเอเตอร์ในชุมชน Fluffy Pub ทุกคน', 'All community creators sharing their coloring journey')}
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 32 }}>⏳</div>
        ) : creators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>{tRaw('ยังไม่มีครีเอเตอร์', 'No creators yet.')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {creators.map((c: any) => (
              <div key={c.id} onClick={() => navigate(`/creator/${c.id}`)}
                style={{ background: 'white', border: `1.5px solid ${p}15`, borderRadius: 18, padding: '20px 14px 14px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', transition: 'transform .15s', position: 'relative' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
                {/* Avatar */}
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: p + '20', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: `2px solid ${p}25` }}>
                  {isImageUrl(c.avatar_url)
                    ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (c.avatar_url ? <span>{c.avatar_url}</span> : <BadgeIcon affiliate={c.affiliate_enabled} size={28} />)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <BadgeIcon affiliate={c.affiliate_enabled} size={13} /> {c.name}
                </div>
                {c.community_country && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>📍 {c.community_country}</div>}
                {c.community_favorite_medium && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>🎨 {c.community_favorite_medium}</div>}
                <div style={{ fontSize: 11, color: p, fontWeight: 700, marginBottom: 10 }}>{c.posts} {tRaw('โพสต์', 'posts')}</div>
                <button onClick={(e) => toggleFollow(e, c.id)}
                  style={{ background: follows.has(c.id) ? '#f1f5f9' : p, color: follows.has(c.id) ? '#64748b' : 'white', border: follows.has(c.id) ? '1.5px solid #e2e8f0' : 'none', borderRadius: 20, padding: '5px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: theme.fontFamily, width: '100%', transition: 'all .15s' }}>
                  {follows.has(c.id) ? `💗 ${tRaw('ติดตามแล้ว', 'Following')}` : `+ ${tRaw('ติดตาม', 'Follow')}`}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
