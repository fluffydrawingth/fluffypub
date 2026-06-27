import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';
import { breadcrumbSchema, useSEO } from '../lib/seo';

type ArticleType = '' | 'tips' | 'tools' | 'favorites' | 'journal';

const TYPE_FILTERS: { key: ArticleType; label: { th: string; en: string }; emoji: string }[] = [
  { key: '',          label: { th: 'ทั้งหมด',       en: 'All' },          emoji: '📝' },
  { key: 'tips',      label: { th: 'มุมระบายสี',  en: 'Coloring Tips' }, emoji: '🎨' },
  { key: 'tools',     label: { th: 'มุมอุปกรณ์',  en: 'Tools' },        emoji: '🖍️' },
  { key: 'favorites', label: { th: 'มุมโปรด',     en: 'My Favorites' }, emoji: '🩷' },
  { key: 'journal',   label: { th: 'เล่าให้ฟัง',  en: 'Journal' },      emoji: '📔' },
];

function readingTime(contentTh?: string, contentEn?: string): string {
  const words = ((contentTh || '') + ' ' + (contentEn || '')).split(/\s+/).filter(Boolean).length;
  if (words < 300) return '1 min read';
  if (words < 700) return '2 min read';
  if (words < 1200) return '3 min read';
  return Math.ceil(words / 400) + ' min read';
}

export default function JournalPage() {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const p = theme.primaryColor;

  const [filter, setFilter] = useState<ArticleType>('');
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useSEO({
    title: 'Fluffy Journal',
    description: 'Coloring tips, favorite tools, cozy recommendations, and creative stories from FluffyPub.',
    path: '/journal',
    type: 'website',
    jsonLd: breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Fluffy Journal', path: '/journal' }]),
  });

  useEffect(() => {
    setLoading(true);
    api.getJournalArticles(filter || undefined).then((d: any) => {
      setArticles(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const typeLabel = (type: string, emoji = true): string => {
    const f = TYPE_FILTERS.find(t => t.key === type);
    if (!f) return type;
    return (emoji ? f.emoji + ' ' : '') + (f.label[lang as 'th' | 'en'] ?? f.label.en);
  };

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`
        .journal-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
        @media(max-width:900px){ .journal-grid { grid-template-columns: repeat(2,1fr); gap: 18px; } }
        @media(max-width:600px){ .journal-grid { grid-template-columns: 1fr; gap: 16px; } }
        .journal-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.10) !important; }
        .journal-card { transition: transform 0.18s, box-shadow 0.18s; }
      `}</style>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px 72px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: theme.textColor, margin: '0 0 10px' }}>
            📝 {tRaw('Fluffy Journal', 'Fluffy Journal')}
          </h1>
          <p style={{ fontSize: 15, color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
            {tRaw(
              'เรื่องเล็กๆ เกี่ยวกับการระบาย อุปกรณ์ ไอเดีย และสิ่งที่ใช้จริงๆ',
              'Little stories about coloring, tools, ideas and things we genuinely use.'
            )}
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 36 }}>
          {TYPE_FILTERS.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              style={{
                padding: '9px 20px', borderRadius: 24, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: theme.fontFamily,
                background: filter === tab.key ? p : p + '15',
                color: filter === tab.key ? 'white' : p,
              }}>
              {tab.emoji} {tab.label[lang as 'th' | 'en'] ?? tab.label.en}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, fontSize: 32 }}>⏳</div>
        ) : articles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', color: '#94a3b8' }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>📝</div>
            <div style={{ fontWeight: 800, fontSize: 17, color: theme.textColor, marginBottom: 8 }}>
              {tRaw('ยังไม่มีบทความ', 'Nothing here yet')}
            </div>
            <div style={{ fontSize: 13 }}>{tRaw('กลับมาดูใหม่เร็วๆ นี้', 'Check back soon for new stories.')}</div>
          </div>
        ) : (
          <div className="journal-grid">
            {articles.map(a => {
              const title = (lang === 'th' ? a.title_th : a.title_en) || a.title_th;
              const excerpt = (lang === 'th' ? a.excerpt_th : a.excerpt_en) || a.excerpt_th;
              const rt = readingTime(a.content_th, a.content_en);
              const date = new Date(a.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
              const crop = a.cover_crop || {};
              const coverPosition = `${((crop.focalPointX ?? 0.5) * 100).toFixed(0)}% ${((crop.focalPointY ?? 0.5) * 100).toFixed(0)}%`;
              return (
                <div key={a.id} className="journal-card"
                  onClick={() => navigate(`/journal/${a.slug}`)}
                  style={{ background: 'white', borderRadius: 20, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12`, display: 'flex', flexDirection: 'column' }}>

                  {/* Cover image — 16:9 thumbnail, cover crop */}
                  <div style={{ position: 'relative', background: `linear-gradient(135deg,${p}18,${p}08)`, aspectRatio: '16/9', overflow: 'hidden', flexShrink: 0 }}>
                    {a.cover_image
                      ? <img src={a.cover_image} alt={title} style={{ width: '100%', height: '100%', objectFit: crop.useOriginal ? 'contain' : 'cover', objectPosition: coverPosition, transform: crop.useOriginal ? 'none' : `scale(${crop.zoom || 1})`, display: 'block' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>📝</div>
                    }
                    {/* Category badge */}
                    <span style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(255,255,255,0.92)', color: p, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 12, backdropFilter: 'blur(4px)' }}>
                      {typeLabel(a.article_type)}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: '16px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                      {title}
                    </div>
                    {excerpt && (
                      <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {excerpt}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 10, fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>
                      <span>📅 {date}</span>
                      <span>·</span>
                      <span>⏱ {rt}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
