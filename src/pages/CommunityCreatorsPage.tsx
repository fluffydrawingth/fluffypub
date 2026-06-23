import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { isImageUrl } from '../lib/avatar';
import BadgeIcon from '../components/BadgeIcon';

type Sort = 'featured' | 'recent' | 'az';

export default function CommunityCreatorsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const { user } = useAuth();
  const p = theme.primaryColor;

  const [creators, setCreators] = useState<any[]>([]);
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<Sort>('featured');
  const [q, setQ] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((sort: Sort, q: string) => {
    setLoading(true);
    api.getCommunityCreators({ sort, q: q.trim() || undefined }).then((d: any) => {
      setCreators(d?.creators || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) api.getMyFollows().then((d: any) => setFollows(new Set(d?.follows || []))).catch(() => {});
  }, [user]);

  useEffect(() => { load(sort, ''); }, [sort]);

  const handleSearch = (val: string) => {
    setQ(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(sort, val), 300);
  };

  const toggleFollow = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    const next = new Set(follows);
    if (next.has(id)) { next.delete(id); setFollows(next); await api.unfollowCreator(id).catch(() => {}); }
    else { next.add(id); setFollows(next); await api.followCreator(id).catch(() => {}); }
  };

  const sortLabel = (s: Sort) => {
    if (s === 'featured') return tRaw('แนะนำ', 'Featured');
    if (s === 'recent') return tRaw('ล่าสุด', 'Recently Active');
    return 'A–Z';
  };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '0 0 20px' }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.textColor, margin: '0 0 20px' }}>
          🌷 {tRaw('ค้นพบครีเอเตอร์', 'Discover Creators')}
        </h1>

        {/* Search + Sort bar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            value={q}
            onChange={e => handleSearch(e.target.value)}
            placeholder={tRaw('🔎 ค้นหาชื่อ...', '🔎 Search by name...')}
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 12, border: `1.5px solid ${p}25`, fontSize: 14, outline: 'none', fontFamily: theme.fontFamily }}
            onFocus={e => e.target.style.borderColor = p}
            onBlur={e => e.target.style.borderColor = p + '25'}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {(['featured', 'recent', 'az'] as Sort[]).map(s => (
              <button key={s} onClick={() => setSort(s)}
                style={{ padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: sort === s ? p : p + '15', color: sort === s ? 'white' : p, fontFamily: theme.fontFamily, whiteSpace: 'nowrap' }}>
                {sortLabel(s)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 32 }}>⏳</div>
        ) : creators.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
            <div style={{ fontWeight: 700 }}>{q ? tRaw('ไม่พบครีเอเตอร์', 'No creators found') : tRaw('ยังไม่มีครีเอเตอร์', 'No creators yet.')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
            {creators.map((c: any) => (
              <div key={c.id} onClick={() => navigate(`/creator/${c.id}`)}
                style={{ background: 'white', border: `1.5px solid ${p}15`, borderRadius: 18, padding: '20px 14px 14px', cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', transition: 'transform .15s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: p + '20', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, border: `2px solid ${p}25` }}>
                  {isImageUrl(c.avatar_url) ? <img src={c.avatar_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.avatar_url ? <span>{c.avatar_url}</span> : <BadgeIcon affiliate={c.affiliate_enabled} size={28} />)}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <BadgeIcon affiliate={c.affiliate_enabled} size={13} /> {c.name}
                </div>
                {c.community_country && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 1 }}>📍 {c.community_country}</div>}
                {c.community_favorite_medium && <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6 }}>🎨 {c.community_favorite_medium}</div>}
                <div style={{ fontSize: 11, color: p, fontWeight: 700, marginBottom: 10 }}>{c.posts} {tRaw('โพสต์', 'posts')}</div>
                <button onClick={e => toggleFollow(e, c.id)}
                  style={{ background: follows.has(c.id) ? '#f1f5f9' : p, color: follows.has(c.id) ? '#64748b' : 'white', border: follows.has(c.id) ? '1.5px solid #e2e8f0' : 'none', borderRadius: 20, padding: '5px 14px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: theme.fontFamily, width: '100%' }}>
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
