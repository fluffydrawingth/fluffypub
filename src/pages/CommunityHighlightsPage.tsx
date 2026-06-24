import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const TYPE_META: Record<string, { en: string; th: string; color: string; emoji: string }> = {
  challenge:    { en: 'Challenge',    th: 'ชาเลนจ์',      color: '#f59e0b', emoji: '🏆' },
  giveaway:     { en: 'Giveaway',     th: 'แจกของรางวัล', color: '#10b981', emoji: '🎁' },
  announcement: { en: 'Announcement', th: 'ประกาศ',        color: '#6366f1', emoji: '📢' },
  partner:      { en: 'Partner',      th: 'พาร์ทเนอร์',   color: '#64748b', emoji: '🤝' },
  sponsored:    { en: 'Sponsored',    th: 'สปอนเซอร์',    color: '#64748b', emoji: '✦' },
};

const TYPE_TABS = [
  { key: '',             label: { en: 'All',           th: 'ทั้งหมด' } },
  { key: 'challenge',    label: { en: 'Challenges',    th: 'ชาเลนจ์' } },
  { key: 'announcement', label: { en: 'Announcements', th: 'ประกาศ' } },
  { key: 'giveaway',    label: { en: 'Giveaways',     th: 'แจกของรางวัล' } },
  { key: 'partner',     label: { en: 'Partners',      th: 'พาร์ทเนอร์' } },
  { key: 'sponsored',   label: { en: 'Sponsored',     th: 'สปอนเซอร์' } },
] as const;

// ── Detail page ───────────────────────────────────────────────────────────────
export function HighlightDetailPage({ id }: { id: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const p = theme.primaryColor;
  const [h, setH] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    (api as any).getCommunityHighlight(id).then((d: any) => {
      setH(d?.highlight || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>
  );

  if (!h) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily, gap: 16 }}>
      <div style={{ fontSize: 48 }}>✨</div>
      <div style={{ fontWeight: 800, fontSize: 17, color: theme.textColor }}>{tRaw('ไม่พบกิจกรรม', 'Event not found')}</div>
      <button onClick={() => navigate('/community/highlights')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '10px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
        ← {tRaw('กลับ', 'Back')}
      </button>
    </div>
  );

  const tm = TYPE_META[h.type] || TYPE_META.announcement;
  const isSubtle = h.type === 'partner' || h.type === 'sponsored';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const blocks: any[] = Array.isArray(h.content_blocks) ? h.content_blocks : [];

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 20px 72px' }}>

        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: '0 0 24px', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>

        {/* Cover image — contain, white bg, max height */}
        {h.cover_image && (
          <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 28, background: 'white', border: '1.5px solid #f1f5f9' }}>
            <img src={h.cover_image} alt={h.title} style={{ width: '100%', maxHeight: 400, objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
          </div>
        )}

        {/* Type badge */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, background: isSubtle ? '#f1f5f9' : tm.color + '18', color: isSubtle ? '#64748b' : tm.color }}>
            {tm.emoji} {lang === 'th' ? tm.th : tm.en}
          </span>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', margin: '0 0 16px', lineHeight: 1.3 }}>{h.title}</h1>

        {/* Dates */}
        {(h.start_date || h.end_date) && (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20, fontSize: 13, color: '#64748b', fontWeight: 600 }}>
            {h.start_date && <span>📅 {tRaw('เริ่ม', 'Starts')} {fmtDate(h.start_date)}</span>}
            {h.end_date && <span>🏁 {tRaw('สิ้นสุด', 'Ends')} {fmtDate(h.end_date)}</span>}
          </div>
        )}

        <div style={{ height: 1.5, background: p + '20', borderRadius: 2, marginBottom: 24 }} />

        {/* Short description */}
        {h.description && (
          <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.8, margin: '0 0 24px', whiteSpace: 'pre-wrap' }}>{h.description}</p>
        )}

        {/* Content blocks */}
        {blocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {blocks.map((block: any, i: number) => {
              if (block.type === 'image' && block.url) return (
                <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: 'white', border: '1.5px solid #f1f5f9' }}>
                  <img src={block.url} alt="" style={{ width: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
                </div>
              );
              if (block.type === 'text' && block.value) return (
                <p key={i} style={{ fontSize: 15, color: '#374151', lineHeight: 1.8, margin: 0, whiteSpace: 'pre-wrap' }}>{block.value}</p>
              );
              return null;
            })}
          </div>
        )}

        {/* Link button */}
        {h.link_url && (
          <div style={{ marginTop: 32 }}>
            <a href={h.link_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', background: p, color: 'white', textDecoration: 'none', padding: '12px 28px', borderRadius: 24, fontSize: 14, fontWeight: 800 }}>
              {tRaw('ดูรายละเอียดเพิ่มเติม →', 'Learn more →')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compact card ──────────────────────────────────────────────────────────────
export function HighlightCard({ h, p, theme, lang, tRaw }: any) {
  const { navigate } = useRouter();
  const tm = TYPE_META[h.type] || TYPE_META.announcement;
  const isSubtle = h.type === 'partner' || h.type === 'sponsored';
  const endDate = h.end_date
    ? new Date(h.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div onClick={() => navigate(`/community/highlights/${h.id}`)}
      style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 18px ${p}22`; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.06)'; }}>

      {/* Image — contain, white bg, compact height */}
      {h.cover_image && (
        <div style={{ position: 'relative', background: 'white', overflow: 'hidden', flexShrink: 0, borderBottom: '1px solid #f1f5f9' }}>
          <img src={h.cover_image} alt={h.title}
            style={{ width: '100%', height: h.card_size === 'lg' ? 200 : h.card_size === 'sm' ? 80 : 110, objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
          {isSubtle && (
            <span style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(255,255,255,0.92)', color: '#64748b', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8 }}>
              {lang === 'th' ? tm.th : tm.en}
            </span>
          )}
        </div>
      )}

      <div style={{ padding: '9px 12px 11px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isSubtle && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: tm.color, background: tm.color + '15', padding: '2px 8px', borderRadius: 8, alignSelf: 'flex-start' }}>
            {tm.emoji} {lang === 'th' ? tm.th : tm.en}
          </span>
        )}
        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>{h.title}</div>
        {h.description && (
          <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
            {h.description}
          </div>
        )}
        {endDate && (
          <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>
            📅 {tRaw('สิ้นสุด', 'Ends')} {endDate}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Listing page ──────────────────────────────────────────────────────────────
export default function CommunityHighlightsPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const p = theme.primaryColor;
  const [highlights, setHighlights] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getCommunityHighlights(filter || undefined).then((d: any) => {
      setHighlights(d?.highlights || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 16px 60px' }}>
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: '0 0 20px' }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.textColor, margin: '0 0 5px' }}>
          ✨ {tRaw('ไฮไลท์และกิจกรรม', 'Highlights & Events')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 20px' }}>
          {tRaw('ชาเลนจ์ กิจกรรม และข่าวสารชุมชน', 'Challenges, events & community news')}
        </p>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22 }}>
          {TYPE_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: filter === tab.key ? p : p + '15', color: filter === tab.key ? 'white' : p, fontFamily: theme.fontFamily }}>
              {tab.label[lang as 'en' | 'th'] ?? tab.label.en}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 32 }}>⏳</div>
        ) : highlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: theme.textColor, marginBottom: 5 }}>
              {tRaw('ยังไม่มีกิจกรรมในตอนนี้', 'Nothing here yet')}
            </div>
            <div style={{ fontSize: 13 }}>{tRaw('ติดตามข่าวสารได้เร็วๆ นี้', 'Check back soon for upcoming events.')}</div>
          </div>
        ) : (
          <div className="hl-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            <style>{`
              @media(max-width:900px){ .hl-grid { grid-template-columns: repeat(2,1fr) !important; } }
              @media(max-width:540px){ .hl-grid { grid-template-columns: 1fr !important; } }
              .hl-sm { grid-column: span 1; }
              .hl-md { grid-column: span 2; }
              .hl-lg { grid-column: span 4; }
              @media(max-width:900px){ .hl-lg { grid-column: span 2; } .hl-md { grid-column: span 1; } }
              @media(max-width:540px){ .hl-sm,.hl-md,.hl-lg { grid-column: span 1; } }
            `}</style>
            {highlights.map((h: any) => (
              <div key={h.id} className={`hl-${h.card_size || 'md'}`}>
                <HighlightCard h={h} p={p} theme={theme} lang={lang} tRaw={tRaw} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
