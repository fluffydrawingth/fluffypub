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
  const [journalRelated, setJournalRelated] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    (api as any).getCommunityHighlight(id).then((d: any) => {
      setH(d?.highlight || null);
      setLoading(false);
    }).catch(() => setLoading(false));
    // Fetch a few journal articles for the "You may like" section
    api.getJournalArticles().then((all: any) => {
      setJournalRelated(Array.isArray(all) ? all.slice(0, 3) : []);
    }).catch(() => {});
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>
  );

  if (!h) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily, gap: 16 }}>
      <div style={{ fontSize: 48 }}>✨</div>
      <div style={{ fontWeight: 800, fontSize: 19, color: theme.textColor }}>{tRaw('ไม่พบกิจกรรม', 'Event not found')}</div>
      <button onClick={() => navigate('/community/highlights')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '10px 24px', borderRadius: 20, fontSize: 16, fontWeight: 700 }}>
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
      <style>{`
        .hl-wrap {
          max-width: 960px;
          margin: 0 auto;
          padding: 32px 20px 72px;
        }
        /* Header card: cover left, meta right — same pattern as journal */
        .hl-header-card {
          display: grid;
          grid-template-columns: minmax(260px, 340px) 1fr;
          gap: 22px;
          align-items: flex-start;
          background: rgba(255,255,255,0.68);
          border: 1px solid rgba(255,255,255,0.72);
          border-radius: 22px;
          padding: 18px;
          box-shadow: 0 14px 40px rgba(15,23,42,0.08);
          backdrop-filter: blur(10px);
          margin-bottom: 18px;
        }
        .hl-cover {
          border-radius: 16px;
          overflow: hidden;
          background: white;
          border: 1.5px solid #f1f5f9;
          aspect-ratio: 1/1;
        }
        .hl-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .hl-meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 4px 0;
        }
        .hl-date-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hl-date-pill {
          background: #f8fafc;
          border: 1px solid #eef2f7;
          border-radius: 10px;
          padding: 6px 11px;
          font-size: 13.5px;
          color: #64748b;
          font-weight: 650;
        }
        /* Body */
        .hl-body {
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(255,255,255,0.78);
          border-radius: 22px;
          padding: clamp(22px,4vw,36px);
          box-shadow: 0 12px 36px rgba(15,23,42,0.06);
          backdrop-filter: blur(8px);
          font-size: 17px;
          line-height: 1.85;
          color: #374151;
          margin-bottom: 18px;
        }
        /* Related journal */
        .hl-related-grid {
          display: grid;
          grid-template-columns: repeat(3,1fr);
          gap: 12px;
        }
        @media(max-width:700px) {
          .hl-header-card { grid-template-columns: 1fr; padding: 14px; gap: 14px; }
          .hl-cover { aspect-ratio: 16/9; }
          .hl-related-grid { grid-template-columns: 1fr; }
          .hl-wrap { padding: 20px 12px 56px; }
        }
        @media(max-width:480px) {
          .hl-related-grid { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>
      <div className="hl-wrap">

        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 15, fontWeight: 600, padding: '0 0 22px', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>

        {/* ── Header: cover left + meta right ── */}
        <div className="hl-header-card">
          {/* Cover */}
          {h.cover_image ? (
            <div className="hl-cover">
              <img src={h.cover_image} alt={h.title} />
            </div>
          ) : (
            <div className="hl-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, background: tm.color + '10' }}>
              {tm.emoji}
            </div>
          )}

          {/* Meta */}
          <div className="hl-meta">
            {/* Type badge */}
            <span style={{ fontSize: 13, fontWeight: 800, padding: '4px 13px', borderRadius: 18, background: isSubtle ? '#f1f5f9' : tm.color + '18', color: isSubtle ? '#64748b' : tm.color, alignSelf: 'flex-start' as const }}>
              {tm.emoji} {lang === 'th' ? tm.th : tm.en}
            </span>

            <h1 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 900, color: '#1e293b', margin: 0, lineHeight: 1.22 }}>
              {h.title}
            </h1>

            {/* Dates */}
            {(h.start_date || h.end_date) && (
              <div className="hl-date-row">
                {h.start_date && <span className="hl-date-pill">📅 {tRaw('เริ่ม', 'Starts')} {fmtDate(h.start_date)}</span>}
                {h.end_date && <span className="hl-date-pill">🏁 {tRaw('สิ้นสุด', 'Ends')} {fmtDate(h.end_date)}</span>}
              </div>
            )}

            {/* Description as sub-heading */}
            {h.description && (
              <p style={{ fontSize: 15.5, color: '#64748b', lineHeight: 1.7, margin: 0 }}>{h.description}</p>
            )}

            {/* Link button */}
            {h.link_url && (
              <a href={h.link_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: p, color: 'white', textDecoration: 'none', padding: '10px 22px', borderRadius: 20, fontSize: 14.5, fontWeight: 800, alignSelf: 'flex-start' as const }}>
                {tRaw('ดูรายละเอียดเพิ่มเติม →', 'Learn more →')}
              </a>
            )}
          </div>
        </div>

        {/* ── Body: content blocks ── */}
        {blocks.length > 0 && (
          <div className="hl-body">
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
              {blocks.map((block: any, i: number) => {
                if (block.type === 'image' && block.url) return (
                  <div key={i} style={{ borderRadius: 16, overflow: 'hidden', background: 'white', border: '1.5px solid #f1f5f9' }}>
                    <img src={block.url} alt="" style={{ width: '100%', objectFit: 'contain', objectPosition: 'center', display: 'block' }} />
                  </div>
                );
                if (block.type === 'text' && block.value) return (
                  <p key={i} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{block.value}</p>
                );
                return null;
              })}
            </div>
          </div>
        )}

        {/* ── You may like — related journal articles ── */}
        {journalRelated.length > 0 && (
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>📝 {tRaw('บทความที่คุณอาจชอบ', 'You may also like')}</span>
              <button onClick={() => navigate('/journal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: p, fontSize: 13, fontWeight: 700, padding: 0 }}>{tRaw('ดูทั้งหมด →', 'View all →')}</button>
            </div>
            <div className="hl-related-grid">
              {journalRelated.map((a: any) => {
                const title = (lang === 'th' ? a.title_th : a.title_en) || a.title_th || a.title_en || '';
                const excerpt = (lang === 'th' ? a.excerpt_th : a.excerpt_en) || a.excerpt_th || a.excerpt_en || '';
                const date = new Date(a.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div key={a.id} onClick={() => navigate(`/journal/${a.slug}`)}
                    style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #f1f5f9', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${p}18`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 6px rgba(0,0,0,0.05)'; }}>
                    {a.cover_image && (
                      <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#f8fafc' }}>
                        <img src={a.cover_image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: '#1e293b', lineHeight: 1.35, marginBottom: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{title}</div>
                      {excerpt && <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden', marginBottom: 6 }}>{excerpt}</div>}
                      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>📅 {date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
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
            <span style={{ position: 'absolute', top: 7, right: 7, background: 'rgba(255,255,255,0.92)', color: '#64748b', fontSize: 11.5, fontWeight: 700, padding: '2px 7px', borderRadius: 8 }}>
              {lang === 'th' ? tm.th : tm.en}
            </span>
          )}
        </div>
      )}

      <div style={{ padding: '9px 12px 11px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isSubtle && (
          <span style={{ fontSize: 12, fontWeight: 700, color: tm.color, background: tm.color + '15', padding: '2px 8px', borderRadius: 8, alignSelf: 'flex-start' }}>
            {tm.emoji} {lang === 'th' ? tm.th : tm.en}
          </span>
        )}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', lineHeight: 1.35 }}>{h.title}</div>
        {h.description && (
          <div style={{ fontSize: 13.5, color: '#64748b', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
            {h.description}
          </div>
        )}
        {endDate && (
          <div style={{ fontSize: 12.5, color: '#94a3b8', fontWeight: 600 }}>
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
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 15, fontWeight: 600, padding: '0 0 20px' }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>
        <h1 style={{ fontSize: 34, fontWeight: 900, color: theme.textColor, margin: '0 0 5px' }}>
          ✨ {tRaw('ไฮไลท์และกิจกรรม', 'Highlights & Events')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 17, lineHeight: 1.6, margin: '0 0 20px' }}>
          {tRaw('ชาเลนจ์ กิจกรรม และข่าวสารชุมชน', 'Challenges, events & community news')}
        </p>

        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22 }}>
          {TYPE_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: filter === tab.key ? p : p + '15', color: filter === tab.key ? 'white' : p, fontFamily: theme.fontFamily }}>
              {tab.label[lang as 'en' | 'th'] ?? tab.label.en}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 32 }}>⏳</div>
        ) : highlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: 17, color: theme.textColor, marginBottom: 5 }}>
              {tRaw('ยังไม่มีกิจกรรมในตอนนี้', 'Nothing here yet')}
            </div>
            <div style={{ fontSize: 15 }}>{tRaw('ติดตามข่าวสารได้เร็วๆ นี้', 'Check back soon for upcoming events.')}</div>
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
