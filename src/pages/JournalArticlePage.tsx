import React, { useEffect, useState, useCallback } from 'react';
import { useTheme } from '../lib/theme';
import { useRouter } from '../lib/router';
import { useLang } from '../lib/lang';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

const TYPE_META: Record<string, { label: { th: string; en: string }; emoji: string }> = {
  tips:      { label: { th: 'มุมระบายสี',  en: 'Coloring Tips' }, emoji: '🎨' },
  tools:     { label: { th: 'มุมอุปกรณ์',  en: 'Tools' },         emoji: '🖍️' },
  favorites: { label: { th: 'มุมโปรด',     en: 'My Favorites' },  emoji: '🩷' },
  journal:   { label: { th: 'เล่าให้ฟัง',  en: 'Journal' },       emoji: '📔' },
};

function readingTime(contentTh?: string, contentEn?: string): string {
  const words = ((contentTh || '') + ' ' + (contentEn || '')).split(/\s+/).filter(Boolean).length;
  if (words < 300) return '1 min read';
  if (words < 700) return '2 min read';
  if (words < 1200) return '3 min read';
  return Math.ceil(words / 400) + ' min read';
}

// ── Reaction bar ──────────────────────────────────────────────────────────────
function ReactionBar({ article, p, lang, tRaw, navigate }: any) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ love: 0, save: 0, share: 0 });
  const [mine, setMine] = useState({ love: false, save: false });
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!article?.id) return;
    (api as any).getJournalReactions(article.id).then((d: any) => {
      if (!d?.error) {
        setCounts({ love: d.love || 0, save: d.save || 0, share: d.share || 0 });
        setMine({ love: !!d.my_love, save: !!d.my_save });
      }
    }).catch(() => {});
  }, [article?.id]);

  const handleReact = async (type: 'love' | 'save') => {
    if (!user) { navigate('/login'); return; }
    const prev = mine[type];
    setMine(m => ({ ...m, [type]: !prev }));
    setCounts(c => ({ ...c, [type]: prev ? c[type] - 1 : c[type] + 1 }));
    try {
      await (api as any).reactJournalArticle(article.id, type);
    } catch {
      setMine(m => ({ ...m, [type]: prev }));
      setCounts(c => ({ ...c, [type]: prev ? c[type] + 1 : c[type] - 1 }));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    let shared = false;
    if (navigator.share) {
      try { await navigator.share({ title: article.title_th, url }); shared = true; } catch {}
    }
    if (!shared) {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
    setShared(true);
    setTimeout(() => setShared(false), 2000);
    setCounts(c => ({ ...c, share: c.share + 1 }));
    (api as any).shareJournalArticle(article.id).catch(() => {});
  };

  const btn = (active: boolean) => ({
    display: 'inline-flex' as const, alignItems: 'center' as const, gap: 6,
    padding: '8px 16px', borderRadius: 20, border: `1.5px solid ${active ? p : '#e5e7eb'}`,
    background: active ? p + '12' : 'white', color: active ? p : '#64748b',
    cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ margin: '48px 0 0', padding: '20px 0 0', borderTop: `1.5px solid ${p}15` }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <button onClick={() => handleReact('love')} style={btn(mine.love)}>
          {mine.love ? '🩷' : '🤍'} {tRaw('ชอบมาก', 'Love this')}
          <span style={{ fontSize: 12, color: mine.love ? p : '#94a3b8', fontWeight: 600 }}>{counts.love || ''}</span>
        </button>
        <button onClick={() => handleReact('save')} style={btn(mine.save)}>
          {mine.save ? '💾' : '🔖'} {tRaw('บันทึก', 'Save')}
          <span style={{ fontSize: 12, color: mine.save ? p : '#94a3b8', fontWeight: 600 }}>{counts.save || ''}</span>
        </button>
        <button onClick={handleShare} style={btn(shared)}>
          🔗 {shared ? tRaw('คัดลอกแล้ว!', 'Copied!') : tRaw('แชร์', 'Share')}
          {counts.share > 0 && <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{counts.share}</span>}
        </button>
      </div>
      {!user && (
        <p style={{ fontSize: 12, color: '#94a3b8', margin: '10px 0 0' }}>
          {tRaw('เข้าสู่ระบบเพื่อบันทึกและแสดงความชอบ', 'Log in to love and save articles.')}
          {' '}<button onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: p, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0 }}>{tRaw('เข้าสู่ระบบ →', 'Log in →')}</button>
        </p>
      )}
    </div>
  );
}

// ── Article page ──────────────────────────────────────────────────────────────
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
        .journal-content img { max-width: 100%; border-radius: 12px; margin: 1em 0; display: block; }
        .journal-content a { color: ${p}; }
        .related-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
        @media(max-width:700px){ .related-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 850, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* Back */}
        <button onClick={() => navigate('/journal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 13, fontWeight: 600, padding: '0 0 28px', display: 'flex', alignItems: 'center', gap: 6 }}>
          ← {tRaw('Fluffy Journal', 'Fluffy Journal')}
        </button>

        {/* Cover image — natural ratio, centered, no forced container */}
        {article.cover_image && (
          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <img src={article.cover_image} alt={title}
              style={{ maxWidth: '100%', width: 'auto', maxHeight: 550, display: 'block', margin: '0 auto', borderRadius: 20, objectFit: 'contain' }} />
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

        {/* Reaction bar */}
        <ReactionBar article={article} p={p} lang={lang} tRaw={tRaw} navigate={navigate} />

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
                    {/* 16:9 thumbnail, cover crop */}
                    <div style={{ aspectRatio: '16/9', background: `linear-gradient(135deg,${p}18,${p}08)`, overflow: 'hidden' }}>
                      {a.cover_image
                        ? <img src={a.cover_image} alt={rtitle} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
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
