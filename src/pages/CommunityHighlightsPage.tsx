import React, { useState, useEffect } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const TYPE_TABS = [
  { key: '', label: { en: 'All', th: 'ทั้งหมด' } },
  { key: 'challenge', label: { en: 'Challenges', th: 'ชาเลนจ์' } },
  { key: 'giveaway', label: { en: 'Giveaways', th: 'แจกของรางวัล' } },
  { key: 'announcement', label: { en: 'Announcements', th: 'ประกาศ' } },
  { key: 'partner', label: { en: 'Partners', th: 'พาร์ทเนอร์' } },
  { key: 'sponsored', label: { en: 'Sponsored', th: 'สปอนเซอร์' } },
] as const;

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
        <button onClick={() => navigate('/community')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 14, fontWeight: 600, padding: '0 0 20px' }}>
          ← {tRaw('ชุมชน', 'Community')}
        </button>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: theme.textColor, margin: '0 0 6px' }}>
          ✨ {tRaw('ไฮไลท์และกิจกรรม', 'Highlights & Events')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 22px' }}>
          {tRaw('ชาเลนจ์ กิจกรรม และข่าวสารชุมชน', 'Challenges, events & community news')}
        </p>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {TYPE_TABS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{ padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: filter === tab.key ? p : p + '15', color: filter === tab.key ? 'white' : p, fontFamily: theme.fontFamily }}>
              {tab.label[lang as 'en' | 'th'] ?? tab.label.en}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, fontSize: 32 }}>⏳</div>
        ) : highlights.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✨</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: theme.textColor, marginBottom: 6 }}>
              {tRaw('ยังไม่มีกิจกรรมในตอนนี้', 'Nothing here yet')}
            </div>
            <div style={{ fontSize: 13 }}>{tRaw('ติดตามข่าวสารได้เร็วๆ นี้', 'Check back soon for upcoming events.')}</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 18 }}>
            {highlights.map((h: any) => <HighlightCard key={h.id} h={h} p={p} theme={theme} lang={lang} tRaw={tRaw} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function HighlightCard({ h, p, theme, lang, tRaw }: any) {
  const typeLabel: Record<string, { en: string; th: string; color: string }> = {
    challenge:    { en: '🏆 Challenge',    th: '🏆 ชาเลนจ์',       color: '#f59e0b' },
    giveaway:     { en: '🎁 Giveaway',     th: '🎁 แจกของรางวัล',  color: '#10b981' },
    announcement: { en: '📢 Announcement', th: '📢 ประกาศ',         color: '#6366f1' },
    partner:      { en: 'Partner',          th: 'พาร์ทเนอร์',        color: '#64748b' },
    sponsored:    { en: 'Sponsored',        th: 'สปอนเซอร์',         color: '#64748b' },
  };
  const tl = typeLabel[h.type] || typeLabel.announcement;
  const isSubtle = h.type === 'partner' || h.type === 'sponsored';
  const dateStr = h.end_date ? new Date(h.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <div style={{ background: 'white', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}10`, display: 'flex', flexDirection: 'column' }}>
      {h.cover_image && (
        <div style={{ position: 'relative' }}>
          <img src={h.cover_image} alt={h.title} style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
          {isSubtle && (
            <span style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.88)', color: '#64748b', fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 10, letterSpacing: 0.3 }}>
              {lang === 'th' ? tl.th : tl.en}
            </span>
          )}
        </div>
      )}
      <div style={{ padding: '14px 16px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!isSubtle && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: tl.color, background: tl.color + '18', padding: '3px 9px', borderRadius: 10, alignSelf: 'flex-start' }}>
            {lang === 'th' ? tl.th : tl.en}
          </span>
        )}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', lineHeight: 1.35 }}>{h.title}</div>
        {h.description && <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.55 }}>{h.description}</div>}
        {dateStr && (
          <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>
            📅 {tRaw('สิ้นสุด', 'Ends')} {dateStr}
          </div>
        )}
        {h.link_url && (
          <a href={h.link_url} target="_blank" rel="noopener noreferrer"
            style={{ marginTop: 'auto', paddingTop: 10, display: 'inline-block', fontSize: 13, fontWeight: 700, color: p, textDecoration: 'none' }}>
            {tRaw('ดูรายละเอียด →', 'Learn more →')}
          </a>
        )}
      </div>
    </div>
  );
}
