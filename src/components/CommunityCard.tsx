import React, { useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import BadgeIcon from './BadgeIcon';
import { isImageUrl } from '../lib/avatar';

const REACTIONS: { type: string; emoji: string; th: string; en: string }[] = [
  { type: 'love',         emoji: '🩷', th: 'รักเลย',             en: 'Love it' },
  { type: 'inspiring',   emoji: '🎨', th: 'สร้างแรงบันดาลใจ',  en: 'Inspiring' },
  { type: 'cozy',        emoji: '🌷', th: 'อบอุ่น',             en: 'Cozy' },
  { type: 'cute_palette',emoji: '🍓', th: 'พาเลตต์น่ารัก',     en: 'Cute palette' },
  { type: 'want_to_try', emoji: '✨', th: 'อยากลองบ้าง',        en: 'Want to try' },
];

export default function CommunityCard({ post, compact = false }: { post: any; compact?: boolean }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;
  const creator = post.creator;

  const [counts, setCounts] = useState<Record<string, number>>(post.reactions || {});
  const [mine, setMine] = useState<string[]>(post.myReactions || []);
  const [busy, setBusy] = useState('');

  const react = async (e: React.MouseEvent, type: string) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(type);
    const had = mine.includes(type);
    setMine(prev => had ? prev.filter(t => t !== type) : [...prev, type]);
    setCounts(prev => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) + (had ? -1 : 1)) }));
    const res = await api.reactCommunity(post.id, type);
    if (res && !res.error) { setCounts(res.reactions || {}); setMine(res.myReactions || []); }
    setBusy('');
  };

  const open = () => navigate(`/community/${post.id}`);

  return (
    <div onClick={open}
      style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, breakInside: 'avoid' as const, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${p}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>

      {/* Artwork — static 4:5 cover (feed stays a cozy gallery, NOT interactive). */}
      {(() => {
        const imgs = (post.artwork_urls && post.artwork_urls.length ? post.artwork_urls : [post.artwork_url || post.thumb_url]).filter(Boolean);
        // Use the full-resolution artwork for a crisp gallery look (fall back to thumb only if missing)
        const cover = imgs[0] || post.artwork_url || post.thumb_url;
        const extra = imgs.length;
        return (
          <div style={{ position: 'relative', width: '100%', paddingBottom: '125%', background: `linear-gradient(135deg,${p}10,${p}05)`, flexShrink: 0 }}>
            <img src={cover} alt={post.caption || 'coloring'} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            {post.post_type === 'tip' && (
              <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(124,58,237,0.92)', color: 'white', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 12 }}>✨ {tRaw('วิธีทำ', 'How to')}</div>
            )}
            {post.post_type === 'tools' && (
              <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(15,118,110,0.92)', color: 'white', fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 12 }}>🛍️ {tRaw('เครื่องมือ', 'Tools')}</div>
            )}
            {extra > 1 && (
              <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                🖼️ +{extra - 1}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* 📚 Book — 1 line */}
        <div style={{ minHeight: 22, marginBottom: 4 }}>
          {post.product ? (
            <button onClick={(e) => { e.stopPropagation(); navigate(`/products/${post.product.slug}${creator?.affiliate_enabled ? `?ref=${creator.id}` : ''}`); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: theme.fontFamily, textAlign: 'left', width: '100%' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: p, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>📚 {post.product.title}</span>
            </button>
          ) : (post.external_book || post.external_book_title) ? (
            (() => {
              const title = post.external_book?.title || post.external_book_title;
              const author = post.external_book?.author || post.external_book_author;
              const slug = post.external_book?.slug;
              const label = `📖 ${title}${author ? ` by ${author}` : ''}`;
              return slug ? (
                <button onClick={(e) => { e.stopPropagation(); navigate(`/community/book/${slug}`); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: theme.fontFamily, textAlign: 'left', width: '100%' }}>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{label}</span>
                </button>
              ) : (
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{label}</span>
              );
            })()
          ) : <span />}
        </div>

        {/* 📝 Caption — 2 lines */}
        <div style={{ minHeight: 36, marginBottom: 8 }}>
          {post.caption ? (
            <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
              {post.caption}
            </p>
          ) : null}
        </div>

        {/* 👤 Creator — 1 line */}
        {creator && (
          <button onClick={(e) => { e.stopPropagation(); navigate(`/creator/${creator.id}`); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: theme.fontFamily, marginBottom: 10, overflow: 'hidden' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', background: p + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0 }}>
              {isImageUrl(creator.avatar_url) ? <img src={creator.avatar_url} alt={creator.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : creator.avatar_url ? <span style={{ fontSize: 12 }}>{creator.avatar_url}</span> : <BadgeIcon affiliate={creator.affiliate_enabled} size={12} />}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><BadgeIcon affiliate={creator.affiliate_enabled} size={12} /> {creator.name}</span>
          </button>
        )}

        {/* 🩷 Reactions — single row, no wrap, fixed height for even cards (hidden in compact) */}
        {!compact && <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 3, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f1f5f9', overflow: 'hidden', height: 34, alignItems: 'center' }}>
          {REACTIONS.map(r => {
            const on = mine.includes(r.type);
            const n = counts[r.type] || 0;
            return (
              <button key={r.type} onClick={(e) => react(e, r.type)} title={tRaw(r.th, r.en)}
                style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 5px', borderRadius: 12, border: `1.5px solid ${on ? p : '#eef2f7'}`, background: on ? p + '12' : 'white', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: on ? p : '#64748b', fontFamily: theme.fontFamily, flexShrink: 0 }}>
                <span>{r.emoji}</span>{n > 0 && <span style={{ fontSize: 10 }}>{n}</span>}
              </button>
            );
          })}
        </div>}
      </div>
    </div>
  );
}
