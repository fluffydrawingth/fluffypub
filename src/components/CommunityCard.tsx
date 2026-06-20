import React from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';

// A single community post card (Pinterest-ish). Image is lazy-loaded for performance.
export default function CommunityCard({ post }: { post: any }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { tRaw } = useLang();
  const p = theme.primaryColor;
  const creator = post.creator;
  const badge = creator?.badge === 'artist' ? '🎨' : creator?.badge === 'creator' ? '🌷' : '';

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
          <button onClick={() => navigate(`/products/${post.product.slug}`)}
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
      </div>
    </div>
  );
}
