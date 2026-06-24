import React, { useEffect, useState } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { api } from '../lib/api';

const TYPE_META: Record<string, { label: { th: string; en: string }; emoji: string }> = {
  tips:      { label: { th: 'เทคนิคการระบาย', en: 'Coloring Tips' }, emoji: '🎨' },
  tools:     { label: { th: 'อุปกรณ์',       en: 'Tools' },         emoji: '🖍️' },
  favorites: { label: { th: 'สิ่งที่ชอบ',    en: 'My Favorites' }, emoji: '🩷' },
  journal:   { label: { th: 'บันทึก',        en: 'Journal' },       emoji: '📔' },
};

function readingTime(contentTh?: string, contentEn?: string): string {
  const words = ((contentTh || '') + ' ' + (contentEn || '')).split(/\s+/).filter(Boolean).length;
  if (words < 300) return '1 min read';
  if (words < 700) return '2 min read';
  if (words < 1200) return '3 min read';
  return Math.ceil(words / 400) + ' min read';
}

export default function JournalArticlePage({ slug }: { slug: string }) {
  const { theme } = useTheme();
  const { navigate } = useRouter();
  const { lang, tRaw } = useLang();
  const p = theme.primaryColor;

  const [article, setArticle] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true); setNotFound(false); setArticle(null); setRelated([]);
    api.getJournalArticle(slug).then((d: any) => {
      if (d?.error || !d?.id) { setNotFound(true); setLoading(false); return; }
      setArticle(d);
      setLoading(false);
      // fetch related (same type)
      api.getJournalArticles(d.article_type).then((all: any) => {
        setRelated((Array.isArray(all) ? all : []).filter((a: any) => a.id !== d.id).slice(0, 3));
      }).catch(() => {});
    }).catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>⏳</div>;

  if (notFound) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: theme.fontFamily, gap: 16 }}>
      <div style={{ fontSize: 56 }}>📝</div>
      <h2 style={{ color: theme.textColor, fontWeight: 900 }}>{tRaw('ไม่พบบทความ', 'Article not found')}</h2>
      <button onClick={() => navigate('/journal')} style={{ background: p, color: 'white', border: 'none', cursor: 'pointer', padding: '10px 24px', borderRadius: 20, fontSize: 14, fontWeight: 700 }}>
        ← {tRaw('กลับ Journal', 'Back to Journal')}
      </button>
    </div>
  );

  const title = (lang === 'th' ? article.title_th : article.title_en) || article.title_th;
  const content = (lang === 'th' ? article.content_th : article.content_en) || article.content_th || '';
  const rt = readingTime(article.content_th, article.content_en);
  const typeMeta = TYPE_META[article.article_type];
  const date = new Date(article.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ fontFamily: theme.fontFamily, background: theme.bgColor, minHeight: '70vh' }}>
      <style>{`
        .journal-content { font-size: 16px; line-height: 1.85; color: #374151; }
        .journal-content p { margin: 0 0 1.2em; }
        .journal-content h2 { font-size: 1.4em; font-weight: 800; color: #1e293b; margin: 1.8em 0 0.6em; }
        .journal-content h3 { font-size: 1.15em; font-weight: 700; color: #1e293b; margin: 1.4em 0 0.5em; }
        .journal-content ul, .journal-content ol { padding-left: 1.4em; margin: 0 0 1.2em; }
        .journal-content li { margin-bottom: 0.4em; }
        .journal-content img { max-width: 100%; border-radius: 12px; margin: 1em 0; }
        .journal-content a { color: ${p}; }
        .related-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
        @media(max-width:700px){ .related-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 850, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Back */}
        <button onClick={() => navigate('/journal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: '0 0 24px', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← {tRaw('Fluffy Journal', 'Fluffy Journal')}
        </button>

        {/* Cover image */}
        {article.cover_image && (
          <div style={{ borderRadius: 20, overflow: 'hidden', marginBottom: 32 }}>
            <img src={article.cover_image} alt={title} style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Category */}
        {typeMeta && (
          <div style={{ marginBottom: 14 }}>
            <span style={{ background: p + '18', color: p, fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20 }}>
              {typeMeta.emoji} {typeMeta.label[lang as 'th' | 'en'] ?? typeMeta.label.en}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1e293b', margin: '0 0 14px', lineHeight: 1.3 }}>
          {title}
        </h1>

        {/* Meta */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: 36, flexWrap: 'wrap' }}>
          <span>📅 {date}</span>
          <span>·</span>
          <span>⏱ {rt}</span>
        </div>

        {/* Divider */}
        <div style={{ height: 1.5, background: p + '20', borderRadius: 2, marginBottom: 36 }} />

        {/* Content */}
        {content ? (
          <div className="journal-content" dangerouslySetInnerHTML={{ __html: content }} />
        ) : (
          <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 15 }}>
            {tRaw('ยังไม่มีเนื้อหา', 'No content yet.')}
          </div>
        )}

        {/* Related articles */}
        {related.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div style={{ height: 1.5, background: p + '20', borderRadius: 2, marginBottom: 32 }} />
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b', margin: '0 0 20px' }}>
              ✨ {tRaw('บทความที่คุณอาจชอบ', 'You may also like')}
            </h2>
            <div className="related-grid">
              {related.map(a => {
                const rtitle = (lang === 'th' ? a.title_th : a.title_en) || a.title_th;
                const rexcerpt = (lang === 'th' ? a.excerpt_th : a.excerpt_en) || a.excerpt_th;
                return (
                  <div key={a.id} onClick={() => { navigate(`/journal/${a.slug}`); window.scrollTo(0, 0); }}
                    style={{ background: 'white', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: `1.5px solid ${p}12` }}>
                    <div style={{ height: 120, background: `linear-gradient(135deg,${p}18,${p}08)`, overflow: 'hidden' }}>
                      {a.cover_image
                        ? <img src={a.cover_image} alt={rtitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📝</div>
                      }
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                        {rtitle}
                      </div>
                      {rexcerpt && (
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>
                          {rexcerpt}
                        </div>
                      )}
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
