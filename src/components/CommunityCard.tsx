import React, { useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

// The five Fluffy reactions (no plain ❤️ "like").
const REACTIONS: { type: string; emoji: string; th: string; en: string }[] = [
  { type: 'love', emoji: '🩷', th: 'รักเลย', en: 'Love it' },
  { type: 'inspiring', emoji: '🎨', th: 'สร้างแรงบันดาลใจ', en: 'Inspiring' },
  { type: 'cozy', emoji: '🌷', th: 'อบอุ่น', en: 'Cozy' },
  { type: 'cute_palette', emoji: '🍓', th: 'พาเลตต์น่ารัก', en: 'Cute palette' },
  { type: 'want_to_try', emoji: '✨', th: 'อยากลองบ้าง', en: 'Want to try' },
];

// A single community post card (Pinterest-ish). Image is lazy-loaded for performance.
export default function CommunityCard({ post }: { post: any }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const { user } = useAuth();
  const p = theme.primaryColor;
  const creator = post.creator;
  const badge = creator?.badge === 'artist' ? '🎨' : creator?.badge === 'creator' ? '🌷' : '';

  const [counts, setCounts] = useState<Record<string, number>>(post.reactions || {});
  const [mine, setMine] = useState<string[]>(post.myReactions || []);
  const [busy, setBusy] = useState('');

  const react = async (type: string) => {
    if (!user) { navigate('/login'); return; }
    if (busy) return;
    setBusy(type);
    // optimistic toggle
    const had = mine.includes(type);
    setMine(prev => had ? prev.filter(t => t !== type) : [...prev, type]);
    setCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + (had ? -1 : 1)) }));
    const res = await api.reactCommunity(post.id, type);
    if (res && !res.error) { setCounts(res.reactions || {}); setMine(res.myReactions || []); }
    setBusy('');
  };

  const chip = (txt: string, bg: string, color: string) => (
    <span key={txt} style={{ background: bg, color, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{txt}</span>
  );

  return (
    <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, breakInside: 'avoid' as const }}>
      {/* Artwork */}
      <div style={{ position: 'relative', width: '100%', background: `linear-gradient(135deg,${p}10,${p}05)` }}>
        <img
          src={post.thumb_url || post.artwork_url}
          alt={post.caption || 'coloring'}
          loading="lazy"
          style={{ width: '100%', display: 'block', objectFit: 'cover' }}
        />
      </div>

      <div style={{ padding: '12px 14px 14px' }}>
        {/* Book used */}
        {post.product ? (
          <button onClick={() => navigate(`/products/${post.product.slug}${creator?.id ? `?ref=${creator.id}` : ''}`)}
            style={{ background: p + '12', color: p, border: 'none', cursor: 'pointer', borderRadius: 10, padding: '4px 10px', fontSize: 11, fontWeight: 800, fontFamily: theme.fontFamily, marginBottom: 8, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📚 {post.product.title}
          </button>
        ) : post.external_book_title ? (
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>
            📖 {post.external_book_title}{post.external_book_author ? ` · ${post.external_book_author}` : ''}
          </div>
        ) : null}

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: post.caption ? 8 : 0 }}>
          {(post.mediums || []).slice(0, 3).map((m: string) => chip('🎨 ' + m, '#f3e8ff', '#7c3aed'))}
          {(post.palettes || []).slice(0, 2).map((m: string) => chip('🌷 ' + m, '#fce7f3', '#be185d'))}
          {(post.markers || []).slice(0, 2).map((m: string) => chip('🖍️ ' + m, '#dbeafe', '#1d4ed8'))}
        </div>

        {/* Caption */}
        {post.caption && (
          <p style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.5, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any }}>{post.caption}</p>
        )}

        {/* Creator */}
        {creator && (
          <button onClick={() => navigate(`/creator/${creator.id}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: theme.fontFamily }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: p + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
              {creator.avatar_url ? <img src={creator.avatar_url} alt={creator.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{badge} {creator.name}</span>
          </button>
        )}

        {/* Fluffy reactions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
          {REACTIONS.map(r => {
            const on = mine.includes(r.type);
            const n = counts[r.type] || 0;
            return (
              <button key={r.type} onClick={() => react(r.type)} title={tRaw(r.th, r.en)}
                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 7px', borderRadius: 14, border: `1.5px solid ${on ? p : '#eef2f7'}`, background: on ? p + '12' : 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: on ? p : '#64748b', fontFamily: theme.fontFamily }}>
                <span>{r.emoji}</span>{n > 0 && <span style={{ fontSize: 11 }}>{n}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
